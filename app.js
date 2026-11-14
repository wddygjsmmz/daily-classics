const $=id=>document.getElementById(id);
const tracks=[], key='riting.collections.v1', lessonCache=new Map();
const shanghaiDate=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
let today=shanghaiDate(),ix=-1,selected=0,preview=false,folders,requestId=0,loadedTrack=null,latest=-1;
async function fetchJson(url){const res=await fetch(url,{cache:'no-cache'});if(!res.ok)throw Error('加载失败');return res.json()}
async function refreshCatalog(){
 const data=await fetchJson('./catalog.json');tracks.splice(0,tracks.length,...data);today=shanghaiDate();latest=tracks.filter(t=>t.date<=today).length-1;
}
async function selectLesson(n,fromFolder=false,fromQueue=false){
 if(!fromQueue)clearQueue();
 const req=++requestId,meta=tracks[n];if(!meta)return;
 fill('loadstatus','正在载入导赏课…');
 try{
  const t=lessonCache.get(meta.date)||await fetchJson('./lessons/'+meta.date+'.json');
  if(req!==requestId)return;
  lessonCache.set(meta.date,t);loadedTrack=t;ix=n;preview=fromFolder;
  render();if(!fromQueue)page(false);fill('loadstatus',!preview&&ix===latest&&meta.date!==today?'今天的课程尚未发布，当前显示最近一期。':'');return true;
 }catch{if(req===requestId)fill('loadstatus','课程加载失败，请刷新页面重试。')}
}
async function showToday(){try{await refreshCatalog();await selectLesson(latest)}catch{fill('loadstatus','课程目录加载失败，请刷新页面重试。')}}
function recover(){return window.ClassicsAccount.peek()}
folders=recover();
async function persist(data){await window.ClassicsAccount.save(data);folders=recover()}
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
 fill('album',t.original);$('who').replaceChildren(document.createTextNode(t.composer),make('small',t.latin));fill('title',t.title);fill('original',t.original);fill('summary',t.summary);fill('about',t.about);$('tags').replaceChildren(...[t.period,t.genre,Math.floor(t.duration/60)+' 分 '+String(t.duration%60).padStart(2,'0')+' 秒'].map(x=>make('span',x)));
 $('cues').replaceChildren(...t.sections.map((section,i)=>{
  const row=make('div','','cue'),body=make('div','','cue-body');
  row.id='cue-'+i;
  body.append(make('h3',section.label),make('p',section.text));
  const marker=make('div','','cue-marker');marker.append(make('b',String(i+1).padStart(2,'0')));
  if(hasCueTimes(t)){
   const jump=make('button',formatTime(section.start),'cue-time');
   jump.type='button';jump.setAttribute('aria-label','从'+formatTime(section.start)+'播放'+section.label);
   jump.onclick=()=>{audio.currentTime=section.start;syncCue();startPlayback()};
   marker.append(jump);
  }
  row.append(marker,body);return row;
 }));
 fill('cue-note',hasCueTimes(t)?'高亮随本站播放器同步，段落边界为近似位置。点击时间可从该段开始听；网易云客户端不支持同步。':'这首作品的段落时间待校准。');
 activeCue=-1;$('current-cue').hidden=true;
 const link=make('a','录音来源与授权 ↗');link.href=t.source;link.target='_blank';link.rel='noopener';$('credit').replaceChildren(document.createTextNode(t.credit+' · '+t.license+'　'),link);
 fill('article-title',t.articleTitle||t.title);
 const paragraphs=Array.isArray(t.article)?t.article:[t.background,t.author,t.expression,t.history,t.theory].filter(Boolean);
 $('reading').replaceChildren(...paragraphs.map(p=>make('p',p,'copy')));
 $('sources').replaceChildren(...t.sources.map(src=>{const a=make('a',src.label+' ↗');a.href=src.url;a.target='_blank';a.rel='noopener';return a}));
 window.configureNativeMusic($('netease'),t);
 setRecording(t);fill('play','▶　播放作品');fill('state','');saved();paint(ix)
}
function saved(){if(ix<0)return;fill('save',folders.some(f=>f.items.includes(tracks[ix].original))?'✓　已收藏':'＋　收藏作品')}
function page(lib){$('library').hidden=!lib;$('daily').hidden=lib;$('home').setAttribute('aria-current',String(!lib));$('lib').setAttribute('aria-current',String(lib));if(lib){collection()}}
$('home').onclick=showToday;$('lib').onclick=()=>{++requestId;fill('loadstatus','');page(true)};
$('prev').onclick=()=>selectLesson(ix-1);$('next').onclick=()=>selectLesson(ix+1);
async function checkDate(){if(!queue.length&&shanghaiDate()!==today&&!preview&&!$('daily').hidden&&ix===latest)await showToday()}
setInterval(checkDate,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDate()});
const audio=$('audio');
let originalRecording='',usingBackup=false,wantsPlayback=false,playAttempt=0;
function setRecording(track){
 ++playAttempt;wantsPlayback=false;usingBackup=false;audio.pause();
 originalRecording=track.audio;
 audio.src='./audio/'+encodeURIComponent(track.date)+'.mp3';
 syncCue();
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
audio.onplay=()=>{wantsPlayback=true;fill('play','Ⅱ　暂停播放');fill('queue-toggle','暂停');fill('state','')};
audio.onpause=()=>{fill('play','▶　播放作品');fill('queue-toggle','继续播放')};
audio.onended=()=>{wantsPlayback=false;fill('play','▶　播放作品');if(queuePos+1<queue.length)playQueueItem(queuePos+1);else if(queue.length){fill('queue-status',queueName+' · 已播完');fill('queue-toggle','重新播放')}};
audio.onerror=()=>{if(!tryOriginal())fill('state','当前网络或浏览器未能播放录音，可重试或使用网易云音乐客户端。')};
let activeCue=-1;$('current-cue').hidden=true;
function formatTime(seconds){
 return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
}
function hasCueTimes(track){
 return !!track&&track.timingAudio===track.audio&&track.sections.length>0&&
  track.sections.every((s,i)=>Number.isFinite(s.start)&&s.start>=0&&
   (i===0?s.start===0:s.start>track.sections[i-1].start));
}
function syncCue(){
 const ready=hasCueTimes(loadedTrack)&&audio.readyState>0&&!audio.ended;
 let next=-1;
 if(ready)for(let i=0;i<loadedTrack.sections.length;i++){
  if(audio.currentTime>=loadedTrack.sections[i].start)next=i;else break;
 }
 if(next===activeCue)return;
 activeCue=next;
 [...$('cues').children].forEach((row,i)=>{
  const current=i===next;row.classList.toggle('cue-active',current);
  if(current)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');
 });
 const link=$('current-cue');link.hidden=next<0;
 if(next>=0){link.textContent='正在听 · '+loadedTrack.sections[next].label;link.href='#cue-'+next}
}
for(const event of ['timeupdate','seeking','seeked','loadedmetadata','emptied','ended'])audio.addEventListener(event,syncCue);
$('current-cue').onclick=()=>{page(false)};
let queue=[],queuePos=-1,queueName='',queueVersion=0;
function clearQueue(){
 queueVersion++;queue=[];queuePos=-1;queueName='';
 fill('queue-status','');
 for(const id of ['queue-prev','queue-next','queue-toggle'])$(id).hidden=true;
}
function updateQueue(){
 const meta=tracks.find(t=>t.original===queue[queuePos]);
 fill('queue-status',queueName+' · '+(queuePos+1)+' / '+queue.length+' · '+(meta?.title||''));
 for(const id of ['queue-prev','queue-next','queue-toggle'])$(id).hidden=false;
 $('queue-prev').disabled=queuePos<=0;$('queue-next').disabled=queuePos>=queue.length-1;
}
async function playQueueItem(pos){
 if(pos<0||pos>=queue.length)return;
 const version=++queueVersion;queuePos=pos;audio.pause();updateQueue();
 const n=tracks.findIndex(t=>t.original===queue[pos]);
 const ok=await selectLesson(n,true,true);
 if(version!==queueVersion)return;
 if(ok){updateQueue();await startPlayback()}
 else fill('queue-status',queueName+' · 本首加载失败，可重试或切换下一首');
}
$('play-folder').onclick=()=>{
 folders=recover();const folder=folders[selected];if(!folder)return;
 queue=folder.items.filter(id=>tracks.some(t=>t.original===id));queueName=folder.name;
 if(queue.length)playQueueItem(0);
};
$('queue-prev').onclick=()=>playQueueItem(queuePos-1);
$('queue-next').onclick=()=>playQueueItem(queuePos+1);
$('queue-toggle').onclick=()=>{
 if(audio.ended)playQueueItem(0);
 else if(audio.paused){if(audio.error)playQueueItem(queuePos);else startPlayback()}
 else{wantsPlayback=false;audio.pause()}
};
$('save').onclick=()=>{folders=recover();fill('savename',tracks[ix].composer+' · '+tracks[ix].title);$('choices').replaceChildren(...folders.map(f=>{const l=make('label',''),c=make('input','');c.type='checkbox';c.checked=f.items.includes(tracks[ix].original);l.append(c,document.createTextNode(' '+f.name));return l}));$('newfolder').value='';fill('error','');$('modal').showModal()};
$('cancel').onclick=()=>$('modal').close();
$('confirm').onclick=async()=>{const data=recover(),name=$('newfolder').value.trim(),id=tracks[ix].original;if(name&&data.some(f=>f.name===name)){fill('error','已有同名收藏夹，请勾选上方的收藏夹。');return}
 const inputs=[...$('choices').querySelectorAll('input')];for(const [i,f] of folders.entries()){const g=data.find(g=>g.name===f.name);if(g){g.items=g.items.filter(x=>x!==id);if(inputs[i].checked)g.items.push(id)}}if(name)data.push({name,items:[id]});try{await persist(data);saved();$('modal').close()}catch(e){fill('error',e.message||'保存失败，请重试。')}};
function collection(){folders=recover();selected=Math.min(selected,folders.length-1);fill('notice','');$('folders').replaceChildren(...folders.map((f,i)=>{const b=make('button',f.name+' · '+f.items.length,'btn');b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>{selected=i;collection()};return b}));const f=folders[selected];$('play-folder').disabled=!f.items.some(id=>tracks.some(t=>t.original===id));$('list').replaceChildren();if(!f.items.length)$('list').append(make('p','这个收藏夹还是空的。在作品页点击「收藏作品」，就能把喜欢的音乐放进来。','muted'));
 for(const id of f.items){const n=tracks.findIndex(t=>t.original===id);if(n<0)continue;const t=tracks[n],row=make('div','','row'),b=make('button',t.title+'　›','link'),del=make('button','移出','btn');b.append(make('small','　'+t.composer));b.onclick=()=>{selectLesson(n,true);window.scrollTo(0,0)};del.onclick=async()=>{try{const data=recover(),target=data.find(x=>x.name===f.name);if(target)target.items=target.items.filter(x=>x!==id);await persist(data);collection()}catch(e){fill('notice',e.message||'移出失败，请重试。')}};row.append(b,del);$('list').append(row)}
}
$('create').onsubmit=async e=>{e.preventDefault();const name=$('foldername').value.trim(),data=recover();if(!name||data.some(f=>f.name===name)){fill('notice','请输入一个尚未使用的收藏夹名称。');return}try{await persist([...data,{name,items:[]}]);selected=folders.length-1;$('foldername').value='';collection()}catch(e){fill('notice',e.message||'保存失败，请重试。')}};
window.addEventListener('storage',e=>{if(e.key===key&&!$('modal').open){folders=recover();saved();if(!$('library').hidden)collection()}});showToday();




window.addEventListener('collections-changed',()=>{folders=recover();saved();if(!$('library').hidden)collection()});
window.addEventListener('account-changed',()=>{if($('modal').open)$('modal').close();clearQueue();audio.pause();selected=0;folders=recover();saved();if(!$('library').hidden)collection()});
