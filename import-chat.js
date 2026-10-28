// Manuel import af strukturerede vinoplysninger kopieret fra ChatGPT.
(function(){
'use strict';
const trigger=document.createElement('button');
trigger.className='btn ghost';trigger.type='button';trigger.textContent='🍷 Importér fra ChatGPT';
document.querySelector('#manual-tools-buttons').append(trigger);
const dlg=document.createElement('dialog');
dlg.setAttribute('aria-label','Importér vine fra ChatGPT');
dlg.innerHTML='<div class="dialog-h"><h2>Importér vine fra ChatGPT</h2><button class="close" id="chat-import-close" aria-label="Luk">×</button></div><div style="padding:20px 24px;display:grid;gap:12px"><p style="margin:0">Indsæt JSON fra ChatGPT. Gennemse flaskerne før import. Eksisterende vine bliver ikke overskrevet, og du skal være logget ind i cloud.</p><textarea id="chat-import-json" style="width:100%;min-height:160px;font-family:monospace;font-size:12px" placeholder='[{"producer":"Pierre Legras","name":"Origin Brut","year":null,"type":"Champagne","country":"Frankrig","region":"Champagne","count":1,"from":2026,"to":2029}]'></textarea><button class="btn ghost" id="chat-import-preview" type="button">Gennemse import</button><div id="chat-import-review" style="white-space:pre-wrap;overflow-wrap:anywhere" role="status"></div><div class="utility"><button id="chat-import-confirm" type="button" disabled>Bekræft og gem i cloud</button><button id="chat-import-cancel" type="button">Annuller</button></div></div>';
document.body.append(dlg);
const el=id=>document.getElementById(id);
let parsed=[];
const text=x=>String(x??'').trim();
function numeric(x,label,min,max,allowNull=true){
 if(x==null||x===''){if(allowNull)return null;throw Error(label+' mangler')}
 const n=Number(x);
 if(!Number.isInteger(n)||n<min||n>max)throw Error('Ugyldigt '+label);
 return n;
}
function clean(w,i){
 if(!w||typeof w!=='object'||Array.isArray(w))throw Error('Vin '+(i+1)+' er ugyldig');
 const producer=text(w.producer),name=text(w.name);
 if(!producer||!name||producer.length>100||name.length>120)throw Error('Vin '+(i+1)+': producent og navn er påkrævet (maks. 100/120 tegn)');
 const year=numeric(w.year,'årgang',1850,2100);
 const from=numeric(w.from,'drikkes fra',1850,2200);
 const to=numeric(w.to,'drikkes senest',1850,2200);
 if(from!=null&&to!=null&&from>to)throw Error('Vin '+(i+1)+': drikkevindue er omvendt');
 const type=text(w.type)||'Andet';
 if(!['Rødvin','Hvidvin','Champagne','Mousserende','Rosé','Dessertvin','Andet'].includes(type))throw Error('Vin '+(i+1)+': ugyldig vintype');
 const count=numeric(w.count??1,'antal',1,99999,false);
 const country=text(w.country),region=text(w.region),notes=text(w.notes),size=text(w.size)||'750ml';
 if(country.length>60||region.length>100||notes.length>2000||size.length>30)throw Error('Vin '+(i+1)+': tekstfelt for langt');
 const result={producer,name,year,type,country,region,count,rating:null,from,to,notes,tasted:'',size};
 if(w.critic){
  const c=w.critic;if(typeof c!=='object'||Array.isArray(c))throw Error('Ugyldig vurdering');
  const kind=c.kind==='anmeldelse'?'anmeldelse':'estimat';
  const source=text(c.source)||'ChatGPT';
  if(source.length>120)throw Error('Vurderingskilde for lang');
  const score=numeric(c.score,'anmelderpoint',0,100);
  const low=numeric(c.low,'estimat fra',0,100);
  const high=numeric(c.high,'estimat til',0,100);
  if(kind==='anmeldelse'&&(!source||score==null))throw Error('Anmelderpoint skal have kilde og score');
  if(low!=null&&high!=null&&low>high)throw Error('Estimatinterval er omvendt');
  const cc={kind,source,context:text(c.context).slice(0,500)};
  if(score!=null)cc.score=score;
  if(low!=null)cc.low=low;
  if(high!=null)cc.high=high;
  if(kind==='estimat'){cc.source='ChatGPT';cc.kind='estimat';}
  if(c.url&&/^https:\/\//.test(text(c.url)))cc.url=text(c.url).slice(0,400);
  result.critic=cc;
 }
 return result;
}
const identity=w=>[w.producer,w.name,w.year??'NV',w.size].map(x=>String(x).normalize('NFC').toLocaleLowerCase('da').trim()).join('|');
const close=()=>dlg.close();
trigger.onclick=()=>{parsed=[];el('chat-import-confirm').disabled=true;el('chat-import-review').textContent='';dlg.showModal()};
el('chat-import-close').onclick=close;el('chat-import-cancel').onclick=close;
el('chat-import-json').oninput=()=>{parsed=[];el('chat-import-confirm').disabled=true;el('chat-import-review').textContent='Indholdet er ændret. Gennemse igen.'};
el('chat-import-preview').onclick=()=>{
 try{
  let raw=el('chat-import-json').value.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
  const obj=JSON.parse(raw),items=Array.isArray(obj)?obj:obj.wines;
  if(!Array.isArray(items)||!items.length||items.length>50)throw Error('JSON skal indeholde en liste med 1–50 vine');
  const prepared=items.map(clean);
  const seen=new Set();const duplicates=[];
  prepared.forEach((w,i)=>{const id=identity(w);if(seen.has(id))duplicates.push(i+1);seen.add(id)});
  if(duplicates.length)throw Error('Dubletter i importlisten på linje '+duplicates.join(', '));
  const known=new Set(wines.map(identity));
  parsed=prepared;
  el('chat-import-review').textContent=prepared.map((w,i)=>(i+1)+'. '+w.producer+' – '+w.name+' '+(w.year??'NV')+' · '+w.count+' fl. · '+(w.from??'—')+'–'+(w.to??'—')+(known.has(identity(w))?' · Findes muligvis allerede':'')).join('\n')+'\n\nEksisterende flasker bliver ikke ændret. Dubletter kontrolleres igen i Supabase ved import.';
  el('chat-import-confirm').disabled=false;
 }catch(e){parsed=[];el('chat-import-confirm').disabled=true;el('chat-import-review').textContent='Kunne ikke gennemse: '+e.message}
};
el('chat-import-confirm').onclick=async()=>{
 if(!parsed.length)return;
 if(typeof window.importChatWines!=='function'){alert('Cloud-import er ikke indlæst. Genindlæs appen.');return}
 if(!confirm('Importér '+parsed.length+' vine? Eksisterende vine bevares, dubletter springes over.'))return;
 const btn=el('chat-import-confirm');btn.disabled=true;
 try{
  const result=await window.importChatWines(parsed);
  alert('Import færdig: '+result.added+' vine gemt i cloud, '+result.skipped+' sprunget over.');
  dlg.close();parsed=[];el('chat-import-json').value='';
 }catch(e){el('chat-import-review').textContent='Import mislykkedes: '+e.message+'\nIngen succes er bekræftet. Kontroller cloud før nyt forsøg.'}
 finally{btn.disabled=false}
};
})();