const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const controls=new Map();const el=id=>{if(!controls.has(id))controls.set(id,{value:'',hidden:false,disabled:false,open:false,textContent:'',showModal(){this.open=true},close(){this.open=false}});return controls.get(id)};
const guest=[{name:'旧收藏',items:['work-local']}];const storage=new Map([['riting.collections.v1',JSON.stringify(guest)]]);
let authCallback,current=null,remote=[{name:'云端',items:['work-cloud']}],version=2,conflict=false,reads=0;
const client={auth:{onAuthStateChange(cb){authCallback=cb},async getSession(){return{data:{session:null}}},async signOut(){current=null;return{}},async signInWithOtp(){return{}},async verifyOtp(){return{data:{user:current}}}},from(){return{select(){return this},eq(){return this},async maybeSingle(){reads++;return{data:{folders:structuredClone(remote),version}}}}},async rpc(_name,args){if(conflict)return{data:[]};assert.equal(args.expected_version,version);remote=structuredClone(args.new_folders);return{data:[{folders:remote,version:++version}]}}};
const events=[];const ctx={window:{CLASSICS_AUTH_CONFIG:{enabled:true,url:'test',publishableKey:'public'},supabase:{createClient(){return client}},dispatchEvent(e){events.push(e.type)},addEventListener(){}},document:{getElementById:el,addEventListener(){},hidden:false},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Event:class{constructor(type){this.type=type}},setInterval(){},setTimeout,Date,JSON,Error,Set};
const tick=()=>new Promise(r=>setTimeout(r,5));
(async()=>{
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../account.js'),'utf8'),ctx);await tick();const api=ctx.window.ClassicsAccount;
assert.equal(reads,0);assert.equal(JSON.stringify(api.peek()),JSON.stringify(guest));
await api.save([{name:'旧收藏',items:['work-local','extra']}]);assert.equal(reads,0);
const original=storage.get('riting.collections.v1');current={id:'alice',phone:'8613812345678'};authCallback('SIGNED_IN',{user:current});await tick();
assert.equal(api.signedIn,true);assert.equal(api.peek()[0].name,'云端');
await el('account-import').onclick();assert.equal(api.peek().length,2);assert.equal(storage.get('riting.collections.v1'),original);
conflict=true;await assert.rejects(()=>api.save([{name:'stale',items:[]}]),/另一台设备/);assert.equal(api.ready,false);conflict=false;await el('account-refresh').onclick();assert.equal(api.ready,true);
await el('account-logout').onclick();assert.equal(api.signedIn,false);assert.equal(JSON.stringify(api.peek()),original);assert(events.includes('account-changed'));
current={id:'bob',phone:'8613912345678'};remote=[{name:'Bob',items:[]}];authCallback('SIGNED_IN',{user:current});await tick();assert.equal(api.peek()[0].name,'Bob');assert.equal(api.peek().length,1);
console.log('Passed: guest-only storage, cloud load, explicit deduplicating import, unchanged guest data, conflict recovery, logout and account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
