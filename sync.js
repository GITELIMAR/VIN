// Synkronisering: kræver eget Supabase-projekt, Email Auth og SQL-scriptet i supabase/schema.sql.
// Anon/publishable key er offentlig; brug ALDRIG service_role/secret key her.
(function(){
const box=document.createElement('section');box.style.cssText='border:1px solid #455649;background:#1d2921;padding:17px;border-radius:12px;margin:20px 0';
box.innerHTML='<strong>☁️ Synkronisering</strong><p id="cloud-status">Ikke forbundet. Dine vine gemmes lokalt.</p><div class="utility"><button id="cloud-setup">Opsæt cloud</button><button id="cloud-mobile-link" hidden>Kopiér mobilopsætning</button><button id="cloud-login" hidden>Log ind med e-mail og kode</button><button id="cloud-magic" hidden>Send login-link via e-mail</button><button id="cloud-reset" hidden>Opret / nulstil adgangskode</button><button id="cloud-password" hidden>Opret adgangskode</button><button id="cloud-logout" hidden>Log ud</button><button id="cloud-refresh" hidden>Hent fra cloud</button></div>';
document.querySelector('.stats').before(box);box.insertAdjacentHTML('beforeend','<small style="display:block;margin-top:8px;color:#a4b1a5">App-version: 2026-10-28.14</small>');
const status=document.getElementById('cloud-status');
const state={client:null,user:null,ready:false,busy:false,queued:false,last:new Map()};
const key='vin-supabase-settings';
// Offentlig Supabase-konfiguration: samme projekt på Safari og hjemmeskærmsapp.
// Kun publishable key – ingen adgangskoder eller hemmelige nøgler.
const DEFAULT_CLOUD={url:'https://cnygxkvyjzyqlhytzvsr.supabase.co',anon:'sb_publishable_BH8HekyCWghzO0jKjBC3SA_tueFlGFj'};
const cfg=()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');return saved?.url&&saved?.anon?saved:DEFAULT_CLOUD}catch{return DEFAULT_CLOUD}};
const setStatus=s=>status.textContent=s;
const validCloud=c=>c&&/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(String(c.url||''))&&typeof c.anon==='string'&&c.anon.length>20&&!/service_role|sb_secret_/i.test(c.anon);
const mobileBtn=document.getElementById('cloud-mobile-link');
mobileBtn.hidden=!validCloud(cfg());
// Kun Supabases offentlige konfiguration deles – aldrig adgangskode eller session.
// Brug URL-fragment, så konfigurationen ikke sendes til GitHub Pages-serveren.
mobileBtn.onclick=async()=>{
 const c=cfg();if(!validCloud(c))return;
 const link=location.origin+location.pathname+'#cloud_setup='+encodeURIComponent(JSON.stringify({url:c.url,anon:c.anon}));
 try{await navigator.clipboard.writeText(link);notify('Mobilopsætningslink kopieret. Send det til din iPhone og åbn i Safari.')}
 catch{prompt('Kopiér dette link, og åbn det på din iPhone:',link)}
};
const incoming=new URLSearchParams(location.hash.slice(1)).get('cloud_setup');
if(incoming){
 try{
  const candidate=JSON.parse(incoming);
  if(!validCloud(candidate))throw Error('Ugyldig offentlig cloud-konfiguration');
  localStorage.setItem(key,JSON.stringify({url:candidate.url.replace(/\/$/,''),anon:candidate.anon}));
  history.replaceState(null,'',location.pathname+location.search);
  mobileBtn.hidden=false;
  setStatus('Cloud er konfigureret på denne enhed. Log ind med e-mail.');
 }catch(e){setStatus('Opsætningslink kunne ikke bruges: '+e.message)}
}

function load(){return new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Supabase-biblioteket kunne ikke indlæses'));document.head.append(s)})}
async function init(){const c=cfg();if(!c?.url||!c?.anon){return}try{
await load();state.client=window.supabase.createClient(c.url,c.anon);state.client.auth.onAuthStateChange((event)=>{
 if(event!=='PASSWORD_RECOVERY')return;
 setTimeout(async()=>{
  const password=prompt('Vælg en ny adgangskode (mindst 8 tegn):');
  if(!password)return;
  if(password.length<8){alert('Adgangskoden skal være mindst 8 tegn.');return}
  const {error}=await state.client.auth.updateUser({password});
  alert(error?'Kunne ikke gemme adgangskoden: '+error.message:'Din adgangskode er oprettet. Fremover logger du ind med e-mail og kode.');
 },0);
});
// Abonnér før getSession: e-mail-link kan logge ind imens klienten initialiseres.
const authButtons=()=>{
 const loggedIn=!!state.user;
 for(const id of ['cloud-login','cloud-magic','cloud-reset'])document.getElementById(id).hidden=loggedIn;
 for(const id of ['cloud-password','cloud-logout','cloud-refresh'])document.getElementById(id).hidden=!loggedIn;
};
state.client.auth.onAuthStateChange((event,session)=>{
 // INITIAL_SESSION kan være tom under udveksling af magic-link-kode.
 // Kun en egentlig SIGNED_OUT-hændelse må nulstille en eksisterende session.
 if(event==='SIGNED_OUT'){
  state.user=null;state.ready=false;sharing=false;authButtons();shareButtons();
  setStatus('Logget ud. Lokal tilstand.');return;
 }
 if(!session?.user)return;
 const previous=state.user?.id;
 state.user=session.user;authButtons();
 if(event==='SIGNED_IN'&&(!state.ready||previous!==session.user.id)){
  setTimeout(()=>pull(true).catch(e=>setStatus('Cloud-login lykkedes, men hentning fejlede: '+e.message)),0);
 }
});
const {data:{session},error}=await state.client.auth.getSession();if(error)throw error;
state.user=session?.user||state.user||null;authButtons();
if(state.user)await pull(true);
else{
 setStatus('Cloud sat op. Log ind via e-mail for at synkronisere.');
 
}
}catch(e){setStatus('Opsætningsfejl: '+e.message)}}
async function pull(initial=false){if(!state.client||!state.user)return;state.ready=false;
const {data,error}=await state.client.from('wines').select('id,data').eq('user_id',state.user.id).limit(10000);if(error)throw error;
// Cloud er autoritativ efter login. Gamle lokale poster må aldrig genoprette slettede vine.
const remote=data.map(r=>r.data);
const local=wines.slice();
// Bevar en lokal redningskopi inden nogen cloud-hentning erstatter indholdet.
if(local.length){
 try{localStorage.setItem('vin-recovery-before-pull',JSON.stringify({at:new Date().toISOString(),wines:local}))}catch(e){}
}
if(!remote.length&&local.length){
 state.ready=false;
 setStatus('ADVARSEL: Cloud returnerede 0 vine. '+local.length+' lokale vine er bevaret. Ingen synkronisering eller sletning. Eksportér backup.');
 return;
}
const resulting=remote;
wines=resulting;localStorage.setItem(KEY,JSON.stringify(wines));render();state.last=new Map(wines.map(w=>[w.id,JSON.stringify(w)]));state.ready=true;setStatus('Cloud synkroniseret · '+wines.length+' vine');
const {data:shared,error:shareError}=await state.client.from('public_wines').select('id').eq('owner_id',state.user.id).limit(1);
if(!shareError){sharing=!!shared?.length||localStorage.getItem(shareKey())==='yes';}
shareButtons();

}

// Automatisk genimport af eksempelvine er slået fra; sletninger respekteres.
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

// Slet i databasen først, og fjern derefter fra skærmen. Serien af cloud-skrivninger
// sikrer, at ældre upserts ikke kan genoprette vinen efter en sletning.
window.deleteWineFromCloud=async(id)=>{
 if(!state.client||!state.user||!state.ready)throw Error('Cloud er ikke synkroniseret. Sletningen er ikke udført.');
 const deleting=running.catch(()=>{}).then(async()=>{
  if(!state.ready||!state.user)throw Error('Cloudforbindelsen er ikke klar.');
  setStatus('Sletter vin i cloud…');
  const {data,error}=await state.client.from('wines').delete()
   .eq('user_id',state.user.id).eq('id',id).select('id');
  if(error)throw error;
  if(!data||data.length!==1)throw Error('Supabase bekræftede ikke sletningen. Vinen er bevaret.');
  wines=wines.filter(w=>w.id!==id);
  localStorage.setItem(KEY,JSON.stringify(wines));
  state.last.delete(id);
  render();
  setStatus('Slettet i cloud · '+wines.length+' vine');
  if(sharing){try{await publishSnapshot()}catch(e){setStatus('Vin slettet privat; offentlig visning kunne ikke opdateres: '+e.message)}}
 });
 running=deleting.catch(e=>{setStatus('Sletning fejlede: '+e.message)});
 return deleting;
};


// Import fra chat: brugerbekræftet, kun cloud-login og INSERT, aldrig UPSERT.
window.importChatWines=async incoming=>{
 if(!state.client||!state.user||!state.ready)throw Error('Log ind, og kontrollér at Cloud synkroniseret vises.');
 if(!Array.isArray(incoming)||!incoming.length||incoming.length>50)throw Error('Vælg 1–50 vine ad gangen.');
 const work=running.catch(()=>{}).then(async()=>{
  const {data,error}=await state.client.from('wines').select('id,data').eq('user_id',state.user.id).limit(10000);
  if(error)throw error;
  const normalized=x=>[x.producer,x.name,x.year??'NV',x.size??'750ml'].map(v=>String(v??'').normalize('NFC').trim().toLocaleLowerCase('da')).join('|');
  const seen=new Set((data||[]).map(x=>normalized(x.data)));
  const unique=[];
  for(const w of incoming){const k=normalized(w);if(seen.has(k))continue;seen.add(k);unique.push(w)}
  if(!unique.length)return {added:0,skipped:incoming.length};
  const rows=unique.map(w=>{
   const id=crypto.randomUUID();
   return {id,user_id:state.user.id,data:{...w,id},updated_at:new Date().toISOString()};
  });
  setStatus('Importerer '+rows.length+' vine til cloud…');
  const {error:insertError}=await state.client.from('wines').insert(rows);
  if(insertError)throw insertError;
  for(const row of rows){wines.push(row.data);state.last.set(row.id,JSON.stringify(row.data))}
  localStorage.setItem(KEY,JSON.stringify(wines));
  render();setStatus('Cloud synkroniseret · '+wines.length+' vine');
  if(sharing){try{await publishSnapshot()}catch(e){setStatus('Import gemt privat; offentlig visning blev ikke opdateret: '+e.message)}}
  return {added:rows.length,skipped:incoming.length-rows.length};
 });
 running=work.catch(e=>{setStatus('Import-fejl: '+e.message)});
 return work;
};
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
 return new URL('public.html',location.href).href+'#'+hash.toString();
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
 if(data?.user){state.user=data.user;document.getElementById('cloud-login').hidden=true;document.getElementById('cloud-reset').hidden=true;document.getElementById('cloud-magic').hidden=true;document.getElementById('cloud-password').hidden=false;document.getElementById('cloud-logout').hidden=false;document.getElementById('cloud-refresh').hidden=false;try{await pull(true)}catch(e){setStatus('Cloud-fejl: '+e.message)}}
};
document.getElementById('cloud-magic').onclick=async()=>{
 const email=prompt('E-mailadressen på din eksisterende vinkælder-konto:');
 if(!email)return;
 try{
  const {error}=await state.client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:false}});
  if(error)throw error;
  alert('Tjek din e-mail for et login-link. Hvis linket sender dig tilbage til Netlify, skal GitHub Pages-adressen tilføjes under Supabase Authentication → URL Configuration → Redirect URLs.');
 }catch(e){alert('Kunne ikke sende login-link: '+e.message)}
};
// Den allerede indloggede ejer kan oprette adgangskode uden at sende en ny mail.
const passwordDialog=document.createElement('dialog');
passwordDialog.setAttribute('aria-label','Opret adgangskode');
passwordDialog.innerHTML='<form method="dialog" style="display:grid;gap:12px;padding:24px;min-width:min(330px,85vw);color:#fff"><strong>Opret adgangskode til vinkælderen</strong><label>Ny adgangskode (mindst 12 tegn)<input id="cloud-new-password" type="password" minlength="12" autocomplete="new-password" required style="display:block;width:100%;margin-top:5px"></label><label>Gentag adgangskoden<input id="cloud-confirm-password" type="password" minlength="12" autocomplete="new-password" required style="display:block;width:100%;margin-top:5px"></label><div style="display:flex;gap:8px"><button value="cancel" type="submit" formnovalidate>Annuller</button><button id="cloud-save-password" value="save" type="button">Gem adgangskode</button></div><p id="cloud-password-error" role="alert" style="margin:0;color:#f4b8b8"></p></form>';
document.body.append(passwordDialog);
document.getElementById('cloud-password').onclick=()=>{
 if(!state.user){alert('Log ind på computeren først.');return}
 passwordDialog.querySelector('form').reset();
 document.getElementById('cloud-password-error').textContent='';
 passwordDialog.showModal();
};
document.getElementById('cloud-save-password').onclick=async()=>{
 const first=document.getElementById('cloud-new-password');
 const second=document.getElementById('cloud-confirm-password');
 const errorBox=document.getElementById('cloud-password-error');
 if(first.value.length<12){errorBox.textContent='Brug mindst 12 tegn.';return}
 if(first.value!==second.value){errorBox.textContent='Adgangskoderne er forskellige.';return}
 const btn=document.getElementById('cloud-save-password');btn.disabled=true;
 try{
  const {error}=await state.client.auth.updateUser({password:first.value});
  if(error)throw error;
  passwordDialog.close();first.value='';second.value='';
  notify('Adgangskode gemt. Du kan nu logge ind på mobilen med e-mail og adgangskode.');
 }catch(e){errorBox.textContent='Kunne ikke gemme adgangskode: '+e.message}
 finally{btn.disabled=false}
};
document.getElementById('cloud-reset').onclick=async()=>{
 const email=prompt('E-mailadressen på din eksisterende vinkælder-konto:');
 if(!email)return;
 const {error}=await state.client.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+location.pathname});
 alert(error?'Kunne ikke sende nulstillingsmail: '+error.message:'Du får en e-mail med et link til at oprette din adgangskode. Linket bruges kun denne ene gang.');
};
document.getElementById('cloud-logout').onclick=async()=>{await state.client?.auth.signOut();state.ready=false;sharing=false;shareButtons();setStatus('Logget ud');};
document.getElementById('cloud-refresh').onclick=async()=>{if(!confirm('Hent cloud-data. Ikke-synkroniserede lokale ændringer kan blive overskrevet. Fortsæt?'))return;try{await pull()}catch(e){setStatus('Hentning fejlede: '+e.message)}};
init();
})();
