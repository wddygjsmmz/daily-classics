// Possession of a 256-bit random sync code authenticates access; no Supabase Auth JWT.
// Only SHA-256(code) is persisted. Never log request bodies or Authorization headers.
const origin='https://wddygjsmmz.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin'};
const reply=(status:number,body:unknown={})=>new Response(JSON.stringify(body),{status,headers});
const hash=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply(403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405);
 const code=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(!/^DC1-[a-f0-9]{64}$/.test(code))return reply(401);
 try{
  const reader=req.body?.getReader();if(!reader)return reply(400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>70000){await reader.cancel();return reply(413)}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
  const body=JSON.parse(new TextDecoder().decode(bytes));
  if(!['create','read','save'].includes(body.action))return reply(400);
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!service)return reply(503);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const ipHash=await hash(service+':'+ip); // keyed digest; raw addresses aren't persisted
  const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/daily_classics_sync_request',{
   method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
   body:JSON.stringify({p_action:body.action,p_hash:await hash(code),p_ip:ipHash,p_folders:body.folders??null,p_version:body.version??null}),signal:AbortSignal.timeout(10000)
  });
  if(!result.ok)return reply(503);
  const data=await result.json();return reply(data.status,data.status===200?{folders:data.folders,version:data.version}:{});
 }catch{return reply(503)}
});
