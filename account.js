/* Account collections use Supabase RLS. Guest collections never leave this browser
 * until the visitor explicitly chooses Import. No service-role key belongs here. */
(() => {
 const key='riting.collections.v1', blank=()=>[{name:'我的最爱',items:[]}];
 const clone=x=>JSON.parse(JSON.stringify(x));
 let recovery=false,authBusy=false;
 let client=null,user=null,cloud=null,version=0,epoch=0,busy=false,loading=false,initialized=false;
 const $=id=>document.getElementById(id);
 const status=text=>{$('account-status').textContent=text};
 function guest(){try{const x=JSON.parse(localStorage.getItem(key));if(Array.isArray(x)&&x.length&&x.every(f=>typeof f.name==='string'&&Array.isArray(f.items)))return x}catch{}return blank()}
 function notify(){window.dispatchEvent(new Event('collections-changed'));paint()}
 function paint(){
  $('account-open').textContent=user?'我的账号':'注册 / 登录';
  $('account-login').hidden=!!user||recovery;$('account-member').hidden=!user||recovery;$('account-recovery').hidden=!recovery;
  $('collection-mode').textContent=user?'账号收藏夹 · 自动同步；离线时暂不能修改。':'未登录 · 收藏夹仅保存在当前浏览器。';
  if(user)$('account-email').textContent=user.email||'已登录';
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
  $('password').value='';$('new-password').value='';if(!next)recovery=false;window.dispatchEvent(new Event('account-changed'));notify();
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
 const redirectTo='https://wddygjsmmz.github.io/daily-classics/';
 function email(){const input=$('email');if(!input.checkValidity())throw Error('请输入有效的邮箱地址。');return input.value.trim()}
 async function authAction(action){
  if(!client){status('邮箱登录尚未开放，邮件服务正在配置。');return}
  if(authBusy)return;authBusy=true;
  for(const id of ['email-login','email-register','email-reset','password-update'])$(id).disabled=true;
  try{await action()}catch(e){status(e.message||'操作未完成，请稍后重试。')}
  finally{authBusy=false;for(const id of ['email-login','email-register','email-reset','password-update'])$(id).disabled=false}
 }
 $('account-login').onsubmit=e=>{e.preventDefault();authAction(async()=>{
  const {data,error}=await client.auth.signInWithPassword({email:email(),password:$('password').value});
  if(error)throw Error('登录失败，请检查邮箱、密码及邮箱是否已验证。');
  await setUser(data.user);$('password').value='';
 })};
 $('email-register').onclick=()=>authAction(async()=>{
  const address=email(),password=$('password').value;
  if(password.length<10)throw Error('请设置至少10位的密码。');
  const {error}=await client.auth.signUp({email:address,password,options:{emailRedirectTo:redirectTo}});
  if(error)throw Error('注册请求未完成，请检查密码要求或稍后重试。');
  $('password').value='';status('请检查邮箱中的确认邮件；已注册的邮箱请直接登录或找回密码。');
 });
 let nextReset=0;
 $('email-reset').onclick=()=>authAction(async()=>{
  if(Date.now()<nextReset)throw Error('请稍后再申请找回密码。');
  const {error}=await client.auth.resetPasswordForEmail(email(),{redirectTo});
  if(error)throw Error('重置邮件暂时无法发送，请稍后重试。');
  nextReset=Date.now()+60000;status('如果该邮箱已注册，你将收到重置密码邮件，请同时检查垃圾邮件。');
 });
 $('account-recovery').onsubmit=e=>{e.preventDefault();authAction(async()=>{
  if(!recovery||!user)throw Error('请重新打开邮件中的重置链接。');
  const password=$('new-password').value;
  if(password.length<10)throw Error('新密码至少10位。');
  const {error}=await client.auth.updateUser({password});
  if(error)throw Error('修改失败，链接可能已失效，请重新申请找回密码。');
  recovery=false;$('new-password').value='';paint();status('密码已更新，请使用新密码登录其他设备。');
 })};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('modal').open)refresh()});
 setInterval(()=>{if(!document.hidden&&!$('modal').open)refresh()},15000);
 window.addEventListener('online',refresh);
 window.addEventListener('storage',e=>{if(e.key===key&&!user)notify()});
 async function init(){
  const config=window.CLASSICS_AUTH_CONFIG;
  if(!config?.enabled||!window.supabase){initialized=true;status(config?.enabled?'账号组件加载失败，请刷新页面重试。':'邮箱登录尚未开放，邮件服务正在配置。');for(const id of ['email-login','email-register','email-reset','password-update'])$(id).disabled=true;notify();return}
  try{
   client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'daily-classics.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
   client.auth.onAuthStateChange((event,session)=>{setTimeout(async()=>{if(event==='PASSWORD_RECOVERY')recovery=true;await setUser(session?.user||null);if(event==='PASSWORD_RECOVERY'){paint();$('account-dialog').showModal();status('请设置新密码。')}},0)});
   const {data,error}=await client.auth.getSession();if(error)throw error;await setUser(data.session?.user||null);
  }catch{status('无法确认登录状态，请刷新后重试。')}
 }
 init();
})();
