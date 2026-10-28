// Synkronisering: kræver eget Supabase-projekt, Email Auth og SQL-scriptet i supabase/schema.sql.
// Anon/publishable key er offentlig; brug ALDRIG service_role/secret key her.
(function(){
const box=document.createElement('section');box.style.cssText='border:1px solid #455649;background:#1d2921;padding:17px;border-radius:12px;margin:20px 0';
box.innerHTML='<strong>☁️ Synkronisering</strong><p id="cloud-status">Ikke forbundet. Dine vine gemmes lokalt.</p><div class="utility"><button id="cloud-setup">Opsæt cloud</button><button id="cloud-login" hidden>Log ind med e-mail og kode</button><button id="cloud-reset" hidden>Opret / nulstil adgangskode</button><button id="cloud-logout" hidden>Log ud</button><button id="cloud-refresh" hidden>Hent fra cloud</button></div>';
document.querySelector('.stats').before(box);
const status=document.getElementById('cloud-status');
const state={client:null,user:null,ready:false,busy:false,queued:false,last:new Map()};
const key='vin-supabase-settings';
const cfg=()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const setStatus=s=>status.textContent=s;
function load(){return new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Supabase-biblioteket kunne ikke indlæses'));document.head.append(s)})}
async function init(){const c=cfg();if(!c?.url||!c?.anon){window.importPhotoExamplesOnce?.();return}try{
await load();state.client=window.supabase.createClient(c.url,c.anon);const {data:{session},error}=await state.client.auth.getSession();if(error)throw error;
state.user=session?.user||null;document.getElementById('cloud-login').hidden=!!state.user;document.getElementById('cloud-reset').hidden=!!state.user;document.getElementById('cloud-logout').hidden=!state.user;document.getElementById('cloud-refresh').hidden=!state.user;
if(state.user)await pull(true);else {setStatus('Cloud sat op. Log ind via e-mail for at synkronisere.');window.importPhotoExamplesOnce?.();}
state.client.auth.onAuthStateChange((_ev,s)=>{const id=s?.user?.id;if(id&&id!==state.user?.id){state.user=s.user;state.ready=false;setTimeout(()=>pull(true).catch(e=>setStatus(e.message)),0)}else if(!id){state.user=null;state.ready=false;setStatus('Logget ud. Lokal tilstand.')}document.getElementById('cloud-login').hidden=!!id;document.getElementById('cloud-reset').hidden=!!id;document.getElementById('cloud-logout').hidden=!id;document.getElementById('cloud-refresh').hidden=!id});
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
wines=resulting;localStorage.setItem(KEY,JSON.stringify(wines));render();state.last=new Map(wines.map(w=>[w.id,JSON.stringify(w)]));state.ready=true;setStatus('Cloud synkroniseret · '+wines.length+' vine');
const {data:shared,error:shareError}=await state.client.from('public_wines').select('id').eq('owner_id',state.user.id).limit(1);
if(!shareError){sharing=!!shared?.length||localStorage.getItem(shareKey())==='yes';}
shareButtons();
window.importPhotoExamplesOnce?.();
try{await importGironville()}catch(e){setStatus('Kunne ikke importere Gironville: '+e.message)}
}

// Engangsimport fra ChatGPT-billedregistrering, kun på indlogget konto.
// Den faste ID undgår dubletter; marker gemmes lokalt efter første forsøg.
async function importGironville(){
 const marker='vin-gironville-2014-import-v1-'+state.user.id;
 if(localStorage.getItem(marker)==='done')return;
 const id='f5d4298e-0df0-4b64-950e-201400000001';
 if(wines.some(w=>w.id===id)||wines.some(w=>String(w.producer).toLowerCase()==='château de gironville'&&Number(w.year)===2014)){
  localStorage.setItem(marker,'done');return;
 }
 const wine={id,producer:'Château de Gironville',name:'Haut-Médoc Cru Bourgeois',
 year:2014,type:'Rødvin',country:'Frankrig',region:'Bordeaux · Haut-Médoc',count:1,
 rating:null,from:2022,to:2029,notes:'Drikkevindue er et skøn baseret på årgang og vinstil.',tasted:'',
 critic:{low:88,high:91,source:'ChatGPT',kind:'estimat',context:'Foreløbigt kvalitetsestimat, ikke verificerede Parker- eller andre anmelderpoint.'}};
 const {error}=await state.client.from('wines').insert({id,user_id:state.user.id,data:wine});
 if(error)throw error;
 wines.push(wine);localStorage.setItem(KEY,JSON.stringify(wines));state.last.set(id,JSON.stringify(wine));
 localStorage.setItem(marker,'done');render();notify('Château de Gironville 2014 tilføjet');
 if(sharing)await publishSnapshot();
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
state.last=current;setStatus('Cloud synkroniseret');
if(sharing){try{await publishSnapshot()}catch(e){setStatus('Private vine gemt, men offentlig visning er ikke opdateret: '+e.message)}}
}
window.queueCloudSync=()=>{if(!state.ready)return;running=running.then(()=>pushChanges()).catch(e=>setStatus('Cloud-fejl: '+e.message+' – eksportér backup, og prøv igen.'))};
// Den offentlige samling er en separat, eksplicit offentliggjort kopi.
// Kun whitelistede vinfelter offentliggøres; private smagsnoter og smagedatoer deles ikke.
const shareUi=document.createElement('div');
shareUi.className='utility';shareUi.style.marginTop='12px';
shareUi.innerHTML='<button id="share-on">Gør min samling offentlig</button><button id="share-link" hidden>Kopiér offentligt link</button><button id="share-off" hidden>Stop offentlig visning</button>';
box.append(shareUi);
let sharing=false;
const shareKey=()=>state.user?'vin-sharing-'+state.user.id:'';
const shareButtons=()=>{const active=!!state.user&&state.ready;document.getElementById('share-on').hidden=!active||sharing;document.getElementById('share-link').hidden=!active||!sharing;document.getElementById('share-off').hidden=!active||!sharing;};
const publicData=w=>({
 producer:w.producer,name:w.name,year:w.year,type:w.type,country:w.country,
 region:w.region,count:w.count,from:w.from,to:w.to,
 critic:w.critic?{kind:w.critic.kind,source:w.critic.source,score:w.critic.score,low:w.critic.low,high:w.critic.high}:null
});
async function publishSnapshot(){
 if(!state.user||!state.ready)return;
 const owner=state.user.id;
 const {data:existing,error:e1}=await state.client.from('public_wines').select('id').eq('owner_id',owner).limit(10000);
 if(e1)throw e1;
 const ids=new Set(wines.map(w=>w.id));
 const removed=(existing||[]).map(w=>w.id).filter(id=>!ids.has(id));
 if(wines.length){
  const {error:e2}=await state.client.from('public_wines').upsert(wines.map(w=>({owner_id:owner,id:w.id,data:publicData(w)})),{onConflict:'owner_id,id'});
  if(e2)throw e2;
 }
 if(removed.length){const {error:e3}=await state.client.from('public_wines').delete().eq('owner_id',owner).in('id',removed);if(e3)throw e3}
}
const makeShareUrl=()=>{
 const c=cfg();const hash=new URLSearchParams({url:c.url,key:c.anon,owner:state.user.id});
 return location.origin+'/public.html#'+hash.toString();
};
document.getElementById('share-on').onclick=async()=>{
 if(!state.user||!state.ready)return;
 if(!confirm('Vil du offentliggøre vinens navn, producent, årgang, antal flasker, drikkevindue og eventuelle anmelderpoint? Private noter deles ikke.'))return;
 try{await publishSnapshot();sharing=true;localStorage.setItem(shareKey(),'yes');shareButtons();
 const link=makeShareUrl();await navigator.clipboard.writeText(link).catch(()=>{prompt('Kopiér dit offentlige link:',link)});
 notify('Offentlig visning aktiveret · link kopieret');
 }catch(e){alert('Offentliggørelse mislykkedes: '+e.message)}
};
document.getElementById('share-link').onclick=async()=>{
 const link=makeShareUrl();await navigator.clipboard.writeText(link).catch(()=>{prompt('Kopiér dit offentlige link:',link)});notify('Offentligt link kopieret');
};
document.getElementById('share-off').onclick=async()=>{
 if(!confirm('Fjern alle offentliggjorte flasker? Din private samling bevares.'))return;
 try{const {error}=await state.client.from('public_wines').delete().eq('owner_id',state.user.id);if(error)throw error;
 sharing=false;localStorage.removeItem(shareKey());shareButtons();notify('Offentlig visning slået fra');
 }catch(e){alert('Kunne ikke stoppe offentlig deling: '+e.message)}
};
document.getElementById('cloud-setup').onclick=async()=>{
const old=cfg();const url=prompt('Supabase Project URL (https://xxxxx.supabase.co)',old?.url||'');if(url===null)return;
const anon=prompt('Supabase publishable/anon key (ALDRIG secret/service_role)',old?.anon||'');if(anon===null)return;
if(!/^https:\/\/[\w.-]+\.supabase\.co\/?$/.test(url.trim())||!anon.trim()||/service_role|sb_secret_/i.test(anon)){alert('Ugyldig URL eller hemmelig nøgle.');return}
localStorage.setItem(key,JSON.stringify({url:url.trim().replace(/\/$/,''),anon:anon.trim()}));location.reload()
};
document.getElementById('cloud-login').onclick=async()=>{
 const email=prompt('E-mailadresse:');if(!email)return;
 const password=prompt('Adgangskode (mindst 8 tegn):');if(password===null)return;
 if(!password){alert('Indtast din adgangskode.');return}
 const {data,error}=await state.client.auth.signInWithPassword({email:email.trim(),password});
 if(error){alert('Login mislykkedes: '+error.message+'\\nHvis du tidligere brugte login-link, skal du først oprette en adgangskode via Supabase Authentication → Users eller en nulstilling af adgangskoden.');return}
 if(data?.user){state.user=data.user;document.getElementById('cloud-login').hidden=true;document.getElementById('cloud-reset').hidden=true;document.getElementById('cloud-logout').hidden=false;document.getElementById('cloud-refresh').hidden=false;try{await pull(true)}catch(e){setStatus('Cloud-fejl: '+e.message)}}
};
document.getElementById('cloud-reset').onclick=async()=>{
 const email=prompt('E-mailadressen på din eksisterende vinkælder-konto:');
 if(!email)return;
 const {error}=await state.client.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+location.pathname});
 alert(error?'Kunne ikke sende nulstillingsmail: '+error.message:'Du får en e-mail med et link til at oprette din adgangskode. Linket bruges kun denne ene gang.');
};
window.addEventListener('load',()=>state.client?.auth.onAuthStateChange((event)=>{
 if(event!=='PASSWORD_RECOVERY')return;
 setTimeout(async()=>{
  const password=prompt('Vælg en ny adgangskode (mindst 8 tegn):');
  if(!password)return;
  if(password.length<8){alert('Adgangskoden skal være mindst 8 tegn.');return}
  const {error}=await state.client.auth.updateUser({password});
  alert(error?'Kunne ikke gemme adgangskoden: '+error.message:'Din adgangskode er oprettet. Fremover logger du ind med e-mail og kode.');
 },0);
}));
document.getElementById('cloud-logout').onclick=async()=>{await state.client?.auth.signOut();state.ready=false;sharing=false;shareButtons();setStatus('Logget ud');};
document.getElementById('cloud-refresh').onclick=async()=>{if(!confirm('Hent cloud-data. Ikke-synkroniserede lokale ændringer kan blive overskrevet. Fortsæt?'))return;try{await pull()}catch(e){setStatus('Hentning fejlede: '+e.message)}};
init();
})();
