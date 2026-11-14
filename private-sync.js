(() => {
 const localKey='riting.collections.v1',codeKey='daily-classics.sync-code.v1';
 const endpoint='https://kipzdaglxobbcrnqmqlz.supabase.co/functions/v1/classics-sync';
 const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
 const blank=()=>[{name:'我的最爱',items:[]}];
 const normalize=x=>x.trim().replace(/\s/g,'');
 const valid=x=>/^DC1-[a-f0-9]{64}$/.test(x);
 let code='',cloud=null,version=0,epoch=0,busy=false,loading=false,candidate='',message='未开启同步，收藏夹保存在本机。';
 try{const saved=localStorage.getItem(codeKey);if(saved&&valid(saved))code=saved}catch{}
 function guest(){try{const x=JSON.parse(localStorage.getItem(localKey));if(Array.isArray(x)&&x.length&&x.every(f=>typeof f.name==='string'&&Array.isArray(f.items)))return x}catch{}return blank()}
 function paint(){
  $('account-open').textContent=code?'同步已开启':'跨设备同步';
  $('sync-start').hidden=!!code;$('sync-connected').hidden=!code;
  $('collection-mode').textContent=code?'云端收藏夹 · '+message:'本机收藏夹 · 仅保存在当前浏览器';
  $('sync-status').textContent=message;
  for(const id of ['sync-create','sync-join','sync-exit','sync-import'])$(id).disabled=busy||loading;
  $('sync-import').disabled=busy||loading||!cloud;
 }
 function status(s){message=s;paint()}
 function notify(){window.dispatchEvent(new Event('collections-changed'));paint()}
 function change(next,data=null){epoch++;code=next;cloud=data?.folders||null;version=data?.version||0;loading=false;busy=false;$('sync-display').value='';$('sync-display-wrap').hidden=true;window.dispatchEvent(new Event('account-changed'));notify()}
 async function request(action,token,extra={}){
  let response;
  try{response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(15000)})}
  catch{throw Error('网络未连接或同步服务暂不可用，请重试；本次保存尚未确认。')}
  if(!response.ok){const err=Error(({401:'同步码格式不正确。',403:'同步码无效，请检查是否完整复制。',409:'另一台设备已修改收藏夹，请重新同步后再操作。',429:'操作过于频繁，请稍后再试。',400:'收藏夹格式或容量超出限制。',413:'收藏夹容量超出限制。'})[response.status]||'同步服务暂不可用，请稍后重试。');err.status=response.status;throw err}
  return response.json();
 }
 async function refresh(){
  if(!code||busy||loading)return;const ticket=epoch,token=code;loading=true;paint();
  try{const data=await request('read',token);if(ticket!==epoch)return;if($('modal').open)return;
   const changed=!cloud||version!==data.version;cloud=data.folders;version=data.version;status('已同步');if(changed)notify();
  }catch(e){if(ticket===epoch)status(e.message)}finally{if(ticket===epoch){loading=false;paint()}}
 }
 async function save(data){
  if(!code){localStorage.setItem(localKey,JSON.stringify(data));notify();return}
  if(!cloud)throw Error('请先重新同步，载入云端收藏夹。');
  if(busy||loading)throw Error('正在同步，请稍后重试。');
  const ticket=epoch;busy=true;status('正在保存…');
  try{const result=await request('save',code,{folders:data,version});if(ticket!==epoch)throw Error('同步空间已改变，请重新操作。');cloud=result.folders;version=result.version;status('已同步');notify()}
  catch(e){if(ticket===epoch){if(e.status===409)cloud=null;status(e.message)}throw e}
  finally{if(ticket===epoch){busy=false;paint()}}
 }
 function merge(a,b){const out=clone(a);for(const f of b){const x=out.find(x=>x.name===f.name);if(x)x.items=[...new Set([...x.items,...f.items])];else out.push({name:f.name,items:[...new Set(f.items)]})}return out}
 window.ClassicsAccount={peek:()=>clone(code?(cloud||blank()):guest()),save,get ready(){return !code||!!cloud},get signedIn(){return !!code}};
 $('account-open').onclick=()=>{$('account-dialog').showModal();paint()};
 $('sync-close').onclick=()=>$('account-dialog').close();
 $('account-dialog').addEventListener('close',()=>{$('sync-display').value='';$('sync-display-wrap').hidden=true;$('sync-input').value=''});
 async function connect(token,action){
  if(busy||loading)return;busy=true;status('正在连接…');const ticket=epoch;
  try{const data=await request(action,token,action==='create'?{folders:guest()}:{});if(ticket!==epoch)return;
   // Persist only after successful verification. A failed join never replaces an active code.
   localStorage.setItem(codeKey,token);change(token,data);status('已同步');
   if(action==='create'){candidate='';$('sync-display').value=token;$('sync-display-wrap').hidden=false;status('已开启同步，请复制并妥善保存同步码。')}
   $('sync-input').value='';
  }catch(e){if(ticket===epoch)status(e.message)}finally{busy=false;paint()}
 }
 $('sync-create').onclick=()=>{if(!candidate){candidate='DC1-'+Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')}
  // Keep the candidate visible after an uncertain network result so creation can be retried safely.
  $('sync-display').value=candidate;$('sync-display-wrap').hidden=false;connect(candidate,'create');
 };
 $('sync-join-form').onsubmit=e=>{e.preventDefault();const token=normalize($('sync-input').value);if(!valid(token)){status('请完整粘贴以 DC1- 开头的同步码。');return}connect(token,'read')};
 $('sync-reveal').onclick=()=>{$('sync-display').value=code;$('sync-display-wrap').hidden=false};
 $('sync-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('sync-display').value);status('同步码已复制，请勿分享给他人。')}catch{$('sync-display').select();status('请手动复制选中的同步码。')}};
 $('sync-exit').onclick=()=>{if(busy||loading)return;try{localStorage.removeItem(codeKey)}catch{status('浏览器无法清除同步码，请检查存储设置。');return}change('');status('已退出同步，恢复本机收藏夹。')};
 $('sync-refresh').onclick=refresh;
 $('sync-import').onclick=async()=>{try{await save(merge(cloud,guest()))}catch(e){status(e.message)}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('modal').open)refresh()});
 setInterval(()=>{if(!document.hidden&&!$('modal').open)refresh()},60000);
 window.addEventListener('online',refresh);
 window.addEventListener('storage',e=>{
  if(e.key===codeKey){const next=e.newValue&&valid(e.newValue)?e.newValue:'';change(next);if(next)refresh();else status('已退出同步，恢复本机收藏夹。')}
  if(e.key===localKey&&!code)notify();
 });
 paint();if(code)refresh();
})();
