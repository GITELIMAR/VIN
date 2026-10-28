// Synkronisering: kræver eget Supabase-projekt, Email Auth og SQL-scriptet i supabase/schema.sql.
// Anon/publishable key er offentlig; brug ALDRIG service_role/secret key her.
(function(){
const box=document.createElement('section');box.style.cssText='border:1px solid #455649;background:#1d2921;padding:17px;border-radius:12px;margin:20px 0';
box.innerHTML='<strong>☁️ Synkronisering</strong><p id="cloud-status">Ikke forbundet. Dine vine gemmes lokalt.</p><div class="utility"><button id="cloud-setup">Opsæt cloud</button><button id="cloud-login" hidden>Send login-link</button><button id="cloud-logout" hidden>Log ud</button><button id="cloud-refresh" hidden>Hent fra cloud</button></div>';
document.querySelector('.stats').before(box);
const status=document.getElementById('cloud-status');
const state={client:null,user:null,ready:false,busy:false,queued:false,last:new Map()};
const key='vin-supabase-settings';
const cfg=()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const setStatus=s=>status.textContent=s;
function load(){return new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Supabase-biblioteket kunne ikke indlæses'));document.head.append(s)})}
async function init(){const c=cfg();if(!c?.url||!c?.anon)return;try{
await load();state.client=window.supabase.createClient(c.url,c.anon);const {data:{session},error}=await state.client.auth.getSession();if(error)throw error;
state.user=session?.user||null;document.getElementById('cloud-login').hidden=!!state.user;document.getElementById('cloud-logout').hidden=!state.user;document.getElementById('cloud-refresh').hidden=!state.user;
if(state.user)await pull(true);else setStatus('Cloud sat op. Log ind via e-mail for at synkronisere.');
state.client.auth.onAuthStateChange((_ev,s)=>{const id=s?.user?.id;if(id&&id!==state.user?.id){state.user=s.user;state.ready=false;setTimeout(()=>pull(true).catch(e=>setStatus(e.message)),0)}else if(!id){state.user=null;state.ready=false;setStatus('Logget ud. Lokal tilstand.')}document.getElementById('cloud-login').hidden=!!id;document.getElementById('cloud-logout').hidden=!id;document.getElementById('cloud-refresh').hidden=!id});
}catch(e){setStatus('Opsætningsfejl: '+e.message)}}
async function pull(initial=false){if(!state.client||!state.user)return;state.ready=false;
const {data,error}=await state.client.from('wines').select('id,data').eq('user_id',state.user.id).limit(10000);if(error)throw error;
const remote=data.map(r=>r.data);const local=wines.slice();let resulting=remote;
if(initial&&local.length&&remote.length===0){
if(confirm('Cloud er tom. Upload dine '+local.length+' lokale vine til din konto?')){
const rows=local.map(w=>({id:w.id,user_id:state.user.id,data:w}));
const {error:upErr}=await state.client.from('wines').upsert(rows,{onConflict:'id'});if(upErr)throw upErr;
resulting=local;
}else{setStatus('Cloud er tom. Lokale vine er bevaret; log ud eller tag backup før cloudimport.');return}
}else if(initial&&local.length&&remote.length){
const localIds=new Set(local.map(x=>x.id));const onlyLocal=local.filter(x=>!remote.some(y=>y.id===x.id));
if(onlyLocal.length&&confirm('Der er '+onlyLocal.length+' lokale vine, som ikke er i cloud. Vil du tilføje dem til din cloud-samling?')){
const {error:mergeError}=await state.client.from('wines').upsert(onlyLocal.map(w=>({id:w.id,user_id:state.user.id,data:w})),{onConflict:'id'});if(mergeError)throw mergeError;resulting=[...remote,...onlyLocal];
}}
wines=resulting;localStorage.setItem(KEY,JSON.stringify(wines));render();state.last=new Map(wines.map(w=>[w.id,JSON.stringify(w)]));state.ready=true;setStatus('Synkroniseret med cloud som '+state.user.email+' · '+wines.length+' vine');
}
let running=Promise.resolve();
async function pushChanges(){if(!state.ready||!state.user)return;
const old=state.last;const current=new Map(wines.map(w=>[w.id,JSON.stringify(w)]));
const changed=wines.filter(w=>old.get(w.id)!==JSON.stringify(w));
const removed=[...old.keys()].filter(id=>!current.has(id));
if(!changed.length&&!removed.length)return;
setStatus('Gemmer ændringer i cloud…');
if(changed.length){const {error}=await state.client.from('wines').upsert(changed.map(w=>({id:w.id,user_id:state.user.id,data:w,updated_at:new Date().toISOString()})),{onConflict:'id'});if(error)throw error}
if(removed.length){const {error}=await state.client.from('wines').delete().eq('user_id',state.user.id).in('id',removed);if(error)throw error}
state.last=current;setStatus('Synkroniseret med cloud som '+state.user.email);
}
window.queueCloudSync=()=>{if(!state.ready)return;running=running.then(()=>pushChanges()).catch(e=>setStatus('Cloud-fejl: '+e.message+' – eksportér backup, og prøv igen.'))};
document.getElementById('cloud-setup').onclick=async()=>{
const old=cfg();const url=prompt('Supabase Project URL (https://xxxxx.supabase.co)',old?.url||'');if(url===null)return;
const anon=prompt('Supabase publishable/anon key (ALDRIG secret/service_role)',old?.anon||'');if(anon===null)return;
if(!/^https:\/\/[\w.-]+\.supabase\.co\/?$/.test(url.trim())||!anon.trim()||/service_role|sb_secret_/i.test(anon)){alert('Ugyldig URL eller hemmelig nøgle.');return}
localStorage.setItem(key,JSON.stringify({url:url.trim().replace(/\/$/,''),anon:anon.trim()}));location.reload()
};
document.getElementById('cloud-login').onclick=async()=>{const email=prompt('Din e-mail til login-link:');if(!email)return;const {error}=await state.client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});alert(error?'Loginfejl: '+error.message:'Tjek din e-mail og åbn login-linket på denne enhed.')};
document.getElementById('cloud-logout').onclick=async()=>{await state.client?.auth.signOut();state.ready=false;setStatus('Logget ud');};
document.getElementById('cloud-refresh').onclick=async()=>{if(!confirm('Hent cloud-data. Ikke-synkroniserede lokale ændringer kan blive overskrevet. Fortsæt?'))return;try{await pull()}catch(e){setStatus('Hentning fejlede: '+e.message)}};
init();
})();
