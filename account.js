/* Account collections use Supabase RLS. Guest collections never leave this browser
 * until the visitor explicitly chooses Import. No service-role key belongs here. */
(() => {
 const key='riting.collections.v1', blank=()=>[{name:'我的最爱',items:[]}];
 const clone=x=>JSON.parse(JSON.stringify(x));
 let client=null,user=null,cloud=null,version=0,epoch=0,busy=false,loading=false,initialized=false;
 const $=id=>document.getElementById(id);
 const status=text=>{$('account-status').textContent=text};
 function guest(){try{const x=JSON.parse(localStorage.getItem(key));if(Array.isArray(x)&&x.length&&x.every(f=>typeof f.name==='string'&&Array.isArray(f.items)))return x}catch{}return blank()}
 function notify(){window.dispatchEvent(new Event('collections-changed'));paint()}
 function paint(){
  $('account-open').textContent=user?'我的账号':'注册 / 登录';
  $('account-login').hidden=!!user;$('account-member').hidden=!user;
  $('collection-mode').textContent=user?'账号收藏夹 · 自动同步；离线时暂不能修改。':'未登录 · 收藏夹仅保存在当前浏览器。';
  if(user){const p=user.phone||'';$('account-phone').textContent=p.length>7?p.slice(0,5)+'****'+p.slice(-4):'已登录';}
  $('account-import').disabled=!cloud||busy||loading;
 }
 function requireReady(){if(!initialized)throw Error('账号状态正在确认，请稍后重试。');if(user&&!cloud)throw Error('账号收藏夹尚未加载，请联网后重试同步。')}
 async function refresh(){
  if(!client||!user||loading||busy)return;
  const ticket=epoch,id=user.id;loading=true;
  try{
   const {data,error}=await client.from('daily_classics_collections').select('folders,version').eq('user_id',id).maybeSingle();
   if(ticket!==epoch)return;
   if(error)throw error;
   if($('modal').open)return;
   cloud=data?.folders||blank();version=data?.version||0;status('收藏夹已同步');notify();
  }catch{if(ticket===epoch)status('同步失败，请检查网络后重试。')}
  finally{if(ticket===epoch){loading=false;paint()}}
 }
 async function setUser(next){
  if((user?.id||null)===(next?.id||null)&&initialized){if(next)await refresh();return}
  epoch++;busy=false;loading=false;cloud=null;version=0;user=next;initialized=true;
  $('otp').value='';$('phone').value='';window.dispatchEvent(new Event('account-changed'));notify();
  if(user){status('正在读取账号收藏夹…');await refresh()}else status('未登录，收藏夹保存在本机。');
 }
 async function save(data){
  requireReady();
  if(!user){localStorage.setItem(key,JSON.stringify(data));notify();return}
  if(busy||loading)throw Error('正在同步，请稍后重试。');
  const ticket=epoch;busy=true;paint();status('正在保存…');
  try{
   const {data:rows,error}=await client.rpc('daily_classics_save_collections',{expected_version:version,new_folders:data});
   if(ticket!==epoch)throw Error('账号已改变，请重新操作。');
   if(error)throw Error('保存未确认，请点击“重新同步”检查后再试。');
   if(!rows?.length){cloud=null;throw Error('另一台设备已更新收藏夹，请重新同步后再操作。');}
   cloud=rows[0].folders;version=rows[0].version;status('收藏夹已同步');notify();
  }finally{if(ticket===epoch){busy=false;paint()}}
 }
 function merge(a,b){const out=clone(a);for(const f of b){const found=out.find(x=>x.name===f.name);if(found)found.items=[...new Set([...found.items,...f.items])];else out.push({name:f.name,items:[...new Set(f.items)]})}return out}
 window.ClassicsAccount={
  read(){requireReady();return clone(user?(cloud||blank()):guest())},
  peek(){return clone(user?(cloud||blank()):guest())},
  save,
  // While identity is resolving, show neither a prior account nor a guest as an account.
  get ready(){return initialized&&(!user||!!cloud)},
  get signedIn(){return !!user}
 };
 $('account-open').onclick=()=>{$('account-dialog').showModal();paint()};
 $('account-close').onclick=()=>$('account-dialog').close();
 $('account-refresh').onclick=refresh;
 $('account-import').onclick=async()=>{try{await save(merge(cloud,guest()))}catch(e){status(e.message)}};
 $('account-logout').onclick=async()=>{
  if(busy){status('正在保存，请完成后再退出。');return}
  const {error}=await client.auth.signOut({scope:'local'});
  if(error){status('退出失败，请重试。');return}await setUser(null);
 };
 let sentPhone='',nextSend=0;
 $('send-code').onclick=async()=>{
  if(!client){status('手机号登录尚未开放，短信服务正在配置。');return}
  const phone=$('phone').value.replace(/\s/g,'').replace(/^\+?86/,'');
  if(!/^1[3-9]\d{9}$/.test(phone)){status('请输入11位中国大陆手机号。');return}
  if(Date.now()<nextSend)return;
  const button=$('send-code');button.disabled=true;
  try{
   const {error}=await client.auth.signInWithOtp({phone:'+86'+phone,options:{shouldCreateUser:true}});
   if(error)throw Error('验证码发送失败，请稍后重试。');
   sentPhone='+86'+phone;nextSend=Date.now()+60000;status('验证码已发送，请输入短信中的验证码。');
  }catch(e){status(e.message)}finally{button.disabled=Date.now()<nextSend}
 };
 setInterval(()=>{const remain=Math.max(0,Math.ceil((nextSend-Date.now())/1000));$('send-code').textContent=remain?remain+'秒后重发':'获取验证码';if(!remain)$('send-code').disabled=!client},1000);
 $('account-login').onsubmit=async e=>{
  e.preventDefault();if(!client)return;
  const current='+86'+$('phone').value.replace(/\s/g,'').replace(/^\+?86/,'');
  if(current!==sentPhone||!/^\d{6}$/.test($('otp').value.trim())){status('请为当前手机号获取短信，并输入6位验证码。');return}
  $('verify-code').disabled=true;
  try{const {data,error}=await client.auth.verifyOtp({phone:sentPhone,token:$('otp').value.trim(),type:'sms'});if(error)throw Error('验证码不正确或已过期，请重新获取。');await setUser(data.user)}catch(e){status(e.message)}finally{$('verify-code').disabled=false}
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('modal').open)refresh()});
 setInterval(()=>{if(!document.hidden&&!$('modal').open)refresh()},15000);
 window.addEventListener('online',refresh);
 window.addEventListener('storage',e=>{if(e.key===key&&!user)notify()});
 async function init(){
  const config=window.CLASSICS_AUTH_CONFIG;
  if(!config?.enabled||!window.supabase){initialized=true;status(config?.enabled?'账号组件加载失败，请刷新页面重试。':'手机号登录尚未开放，短信服务正在配置。');$('send-code').disabled=true;$('verify-code').disabled=true;notify();return}
  try{
   client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'daily-classics.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
   client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>setUser(session?.user||null),0)});
   const {data,error}=await client.auth.getSession();if(error)throw error;await setUser(data.session?.user||null);
  }catch{status('无法确认登录状态，请刷新后重试。')}
 }
 init();
})();
