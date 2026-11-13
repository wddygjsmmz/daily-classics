const $=id=>document.getElementById(id);
const tracks=[], key='riting.collections.v1', lessonCache=new Map();
const shanghaiDate=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
let today=shanghaiDate(),ix=-1,selected=0,preview=false,folders,requestId=0,loadedTrack=null,latest=-1;
async function fetchJson(url){const res=await fetch(url,{cache:'no-cache'});if(!res.ok)throw Error('加载失败');return res.json()}
async function refreshCatalog(){
 const data=await fetchJson('./catalog.json');tracks.splice(0,tracks.length,...data);today=shanghaiDate();latest=tracks.filter(t=>t.date<=today).length-1;
}
async function selectLesson(n,fromFolder=false){
 const req=++requestId,meta=tracks[n];if(!meta)return;
 fill('loadstatus','正在载入导赏课…');
 try{
  const t=lessonCache.get(meta.date)||await fetchJson('./lessons/'+meta.date+'.json');
  if(req!==requestId)return;
  lessonCache.set(meta.date,t);loadedTrack=t;ix=n;preview=fromFolder;
  render();page(false);fill('loadstatus',!preview&&ix===latest&&meta.date!==today?'今天的课程尚未发布，当前显示最近一期。':'');
 }catch{if(req===requestId)fill('loadstatus','课程加载失败，请刷新页面重试。')}
}
async function showToday(){try{await refreshCatalog();await selectLesson(latest)}catch{fill('loadstatus','课程目录加载失败，请刷新页面重试。')}}
function recover(){try{const data=JSON.parse(localStorage.getItem(key));if(Array.isArray(data)&&data.length&&data.every(f=>typeof f.name==='string'&&Array.isArray(f.items)))return data}catch{}return [{name:'我的最爱',items:[]}]}
folders=recover();
function persist(data){localStorage.setItem(key,JSON.stringify(data));folders=data}
const make=(tag,txt,cls)=>{const e=document.createElement(tag);e.textContent=txt;if(cls)e.className=cls;return e};
const fill=(id,txt)=>$(id).textContent=txt;
function paint(n){
 const c=$('art').getContext('2d'),p=[['#2b494b','#71958a','#d8d3a5'],['#514738','#a1936c','#edcc8c'],['#384658','#798da0','#e1cba2'],['#4a424a','#aa8b87','#ead9b3']][n%4];
 let s=n+137;const rnd=()=>((s=(1664525*s+1013904223)>>>0)/4294967296);
 c.fillStyle=p[0];c.fillRect(0,0,600,600);c.fillStyle=p[2];c.beginPath();c.arc(407,154,60,0,Math.PI*2);c.fill();
 for(let layer=0;layer<4;layer++){const base=225+layer*45;c.fillStyle=[p[1],p[0],p[1],p[0]][layer];c.beginPath();c.moveTo(0,600);for(let x=0;x<=600;x+=2){let y=base+35*Math.sin(x/103+layer*1.4+n)+21*Math.cos(x/75+layer);c.lineTo(x,y)}c.lineTo(600,600);c.fill()}
 for(let j=0;j<900;j++){let x=rnd()*600,y=407+rnd()*193;c.globalAlpha=.16+rnd()*.4;c.strokeStyle=p[1];c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+12,y-2,x+rnd()*35,y);c.stroke()}c.globalAlpha=1;
 for(let j=0;j<16000;j++){c.fillStyle=rnd()>.5?'#fff':'#101e20';c.globalAlpha=rnd()*.13;c.fillRect(rnd()*600,rnd()*600,1+rnd()*2,1)}c.globalAlpha=1
}
function render(){
 const t=loadedTrack,date=tracks[ix].date;
 fill('edition',preview?'收藏选听':date===today?'今日导赏课':'往期导赏课');
 fill('date',new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')));
 $('next').disabled=ix>=latest;$('prev').disabled=ix<=0;$('date').parentElement.hidden=preview;
 fill('album',t.original);fill('who',t.composer+'　/　'+t.latin);fill('title',t.title);fill('original',t.original);fill('summary',t.summary);fill('about',t.about);$('tags').replaceChildren(...[t.period,t.genre,Math.floor(t.duration/60)+' 分 '+String(t.duration%60).padStart(2,'0')+' 秒'].map(x=>make('span',x)));
 $('cues').replaceChildren(...t.sections.map((a,i)=>{const row=make('div','','cue'),b=make('div','');b.append(make('h3',a.label),make('p',a.text));row.append(make('b','0'+(i+1)),b);return row}));
 const link=make('a','录音来源与授权 ↗');link.href=t.source;link.target='_blank';link.rel='noopener';$('credit').replaceChildren(document.createTextNode(t.credit+' · '+t.license+'　'),link);
 const fields=[['作曲家','author'],['创作背景','background'],['结构与乐章','structure'],['音乐表达','expression'],['听懂一点乐理','theory'],['流派与历史地位','history']];
 $('reading').replaceChildren(...fields.map(([label,key])=>{const section=make('section','','reading');section.append(make('h3',label),make('p',t[key],'copy'));return section}));
 $('sources').replaceChildren(...t.sources.map(src=>{const a=make('a',src.label+' ↗');a.href=src.url;a.target='_blank';a.rel='noopener';return a}));
 window.configureNativeMusic($('netease'),t);
 setRecording(t);fill('play','▶　播放作品');fill('state','');saved();paint(ix)
}
function saved(){if(ix<0)return;fill('save',folders.some(f=>f.items.includes(tracks[ix].original))?'✓　已收藏':'＋　收藏作品')}
function page(lib){$('library').hidden=!lib;$('daily').hidden=lib;$('home').setAttribute('aria-current',String(!lib));$('lib').setAttribute('aria-current',String(lib));if(lib){$('audio').pause();collection()}}
$('home').onclick=showToday;$('lib').onclick=()=>{++requestId;fill('loadstatus','');page(true)};
$('prev').onclick=()=>selectLesson(ix-1);$('next').onclick=()=>selectLesson(ix+1);
async function checkDate(){if(shanghaiDate()!==today&&!preview&&!$('daily').hidden&&ix===latest)await showToday()}
setInterval(checkDate,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDate()});
const audio=$('audio');
let originalRecording='',usingBackup=false,wantsPlayback=false,playAttempt=0;
function setRecording(track){
 ++playAttempt;wantsPlayback=false;usingBackup=false;audio.pause();
 originalRecording=track.audio;
 audio.src='./audio/'+encodeURIComponent(track.date)+'.mp3';
}
function tryOriginal(){
 if(usingBackup||!originalRecording)return false;
 usingBackup=true;
 audio.src=originalRecording;
 if(wantsPlayback)startPlayback();
 return true;
}
async function startPlayback(){
 const attempt=++playAttempt;wantsPlayback=true;
 try{await audio.play()}catch(error){
  if(attempt!==playAttempt||error.name==='AbortError')return;
  if(error.name==='NotAllowedError'){fill('state','请再次点播放，或使用下方播放器的播放键。');return}
  if(!tryOriginal())fill('state','录音未能载入。请检查网络后再点播放，或使用网易云音乐客户端。');
 }
}
$('play').onclick=()=>{if(audio.paused){if(audio.error)setRecording(loadedTrack);startPlayback()}else{wantsPlayback=false;audio.pause()}};
audio.onplay=()=>{wantsPlayback=true;fill('play','Ⅱ　暂停播放');fill('state','')};
audio.onpause=audio.onended=()=>fill('play','▶　播放作品');
audio.onerror=()=>{if(!tryOriginal())fill('state','当前网络或浏览器未能播放录音，可重试或使用网易云音乐客户端。')};
$('save').onclick=()=>{folders=recover();fill('savename',tracks[ix].composer+' · '+tracks[ix].title);$('choices').replaceChildren(...folders.map(f=>{const l=make('label',''),c=make('input','');c.type='checkbox';c.checked=f.items.includes(tracks[ix].original);l.append(c,document.createTextNode(' '+f.name));return l}));$('newfolder').value='';fill('error','');$('modal').showModal()};
$('cancel').onclick=()=>$('modal').close();
$('confirm').onclick=()=>{const data=recover(),name=$('newfolder').value.trim(),id=tracks[ix].original;if(name&&data.some(f=>f.name===name)){fill('error','已有同名收藏夹，请勾选上方的收藏夹。');return}
 const inputs=[...$('choices').querySelectorAll('input')];for(const [i,f] of folders.entries()){const g=data.find(g=>g.name===f.name);if(g){g.items=g.items.filter(x=>x!==id);if(inputs[i].checked)g.items.push(id)}}if(name)data.push({name,items:[id]});try{persist(data);saved();$('modal').close()}catch{fill('error','浏览器无法保存，请检查存储设置。')}};
function collection(){folders=recover();selected=Math.min(selected,folders.length-1);fill('notice','');$('folders').replaceChildren(...folders.map((f,i)=>{const b=make('button',f.name+' · '+f.items.length,'btn');b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>{selected=i;collection()};return b}));const f=folders[selected];$('list').replaceChildren();if(!f.items.length)$('list').append(make('p','这个收藏夹还是空的。在作品页点击「收藏作品」，就能把喜欢的音乐放进来。','muted'));
 for(const id of f.items){const n=tracks.findIndex(t=>t.original===id);if(n<0)continue;const t=tracks[n],row=make('div','','row'),b=make('button',t.title+'　›','link'),del=make('button','移出','btn');b.append(make('small','　'+t.composer));b.onclick=()=>{selectLesson(n,true);window.scrollTo(0,0)};del.onclick=()=>{try{const data=recover(),target=data.find(x=>x.name===f.name);if(target)target.items=target.items.filter(x=>x!==id);persist(data);collection()}catch{fill('notice','移出失败，请检查浏览器存储设置。')}};row.append(b,del);$('list').append(row)}
}
$('create').onsubmit=e=>{e.preventDefault();const name=$('foldername').value.trim(),data=recover();if(!name||data.some(f=>f.name===name)){fill('notice','请输入一个尚未使用的收藏夹名称。');return}try{persist([...data,{name,items:[]}]);selected=folders.length-1;$('foldername').value='';collection()}catch{fill('notice','浏览器无法保存，请检查存储设置。')}};
window.addEventListener('storage',e=>{if(e.key===key&&!$('modal').open){folders=recover();saved();if(!$('library').hidden)collection()}});showToday();
