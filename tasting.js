(()=>{'use strict';
const $=id=>document.getElementById(id), escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=$('tasting-compass');if(!root)return;
const list=$('tasting-wine'),preview=$('tasting-preview'),feedback=$('tasting-feedback'),history=$('tasting-history');
let client=null,session=null,selected=null,source='new';
const key='sb_publishable_BH8HekyCWghzO0jKjBC3SA_tueFlGFj',url='https://cnygxkvyjzyqlhytzvsr.supabase.co';
async function connect(){if(!window.supabase?.createClient)throw Error('Supabase er ikke indlæst');client=window.supabase.createClient(url,key);const result=await client.auth.getSession();session=result.data.session;if(!session)throw Error('Log ind under Synkronisering først');}
const metadataFields={type:'tasting-type',country:'tasting-country',region:'tasting-region',grapes:'tasting-grapes',notes:'tasting-notes'};function setMetadata(w){for(const [k,id] of Object.entries(metadataFields))$(id).value=String(w?.[k]||'');}function getMetadata(){return Object.fromEntries(Object.entries(metadataFields).map(([k,id])=>[k,$(id).value.trim()]));}
function populate(){const options=(typeof wines!=='undefined'?wines:[]).filter(w=>Number(w.count)>0);const previous=list.value;list.innerHTML='<option value="">Vælg en vin</option>'+options.map(w=>'<option value="'+escape(w.id)+'">'+escape((w.producer||'')+' '+(w.name||'')+' '+(w.year||''))+' ('+Number(w.count)+' på lager)</option>').join('');if(options.some(w=>String(w.id)===previous))list.value=previous;selection();}
function selection(){const w=source==='cellar'?(typeof wines!=='undefined'?wines:[]).find(w=>String(w.id)===list.value):null;$('tasting-manual').hidden=source==='cellar';if(w){setMetadata(w);$('tasting-name').value=[w.producer,w.name].filter(Boolean).join(' ');$('tasting-year').value=w.year||'';$('tasting-decrement').disabled=false}else{$('tasting-decrement').checked=false;$('tasting-decrement').disabled=true;}}
function setSource(next){source=next;$('tasting-new').setAttribute('aria-pressed',String(next==='new'));$('tasting-cellar').setAttribute('aria-pressed',String(next==='cellar'));$('tasting-cellar-label').hidden=next!=='cellar';list.value='';$('tasting-name').value='';$('tasting-year').value='';setMetadata(null);selection();}
$('tasting-new').onclick=()=>setSource('new');$('tasting-cellar').onclick=()=>{setSource('cellar');populate();};
list.addEventListener('change',selection);
root.addEventListener('toggle',()=>{if(root.open){populate();loadHistory();}});
function loadOCR(){return window.loadWineOCR()}
function parseLabel(text){const lines=String(text||'').split(/\n/).map(s=>s.trim().replace(/[^\p{L}\p{N}\s'’.-]/gu,'')).filter(s=>s.length>=3&&s.length<85);const year=(text.match(/\b(?:19|20)\d{2}\b/)||[])[0]||'';const ignore=/^(?:appellation|mis en bouteille|contains|contient|alc\b|vol\b|product of|produit de|vin de|wine of|grand cru|premier cru|brut|reserve|réserve|bottled|750\s?ml|75\s?cl|champagne$)/i;const candidates=lines.filter(s=>!ignore.test(s)&&!/^\d/.test(s)&&s.toLowerCase()!==year);return {name:candidates.slice(0,2).join(' ').slice(0,180),year};}
window.parseWineLabel=parseLabel;
$('tasting-photo').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const status=$('tasting-ocr-status');if(!file.type.startsWith('image/')){status.textContent='Vælg et billede.';return}if(file.size>12000000){status.textContent='Billedet er for stort (maks. 12 MB).';return}const objectUrl=URL.createObjectURL(file);preview.src=objectUrl;preview.hidden=false;preview.onload=()=>URL.revokeObjectURL(objectUrl);setSource('new');status.textContent='Indlæser gratis tekstgenkendelse…';try{const OCR=await loadOCR();status.textContent='Læser etiketten… Det kan tage lidt tid første gang.';const result=await OCR.recognize(file,'eng');const parsed=parseLabel(result.data?.text);if(parsed.name)$('tasting-name').value=parsed.name;if(parsed.year)$('tasting-year').value=parsed.year;status.textContent=parsed.name?'Forslag udfyldt fra etiketten. Kontrollér især producent, navn og årgang før du gemmer.':'Kunne ikke læse vinens navn. Indtast det manuelt.';}catch(err){status.textContent='Automatisk læsning fejlede. Indtast vinen manuelt. '+String(err.message||'')} });
root.querySelectorAll('[data-rating]').forEach(btn=>btn.onclick=()=>{selected=btn.dataset.rating;root.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));});
function learn(all){
 const counts={up:0,same:0,down:0,love:0};all.forEach(x=>{if(x.rating in counts)counts[x.rating]++});
 const unique=new Map();for(const t of all){const k=(t.wine_id||[t.wine_name,t.vintage].join('|')).toLowerCase();if(!unique.has(k))unique.set(k,t)}
 const votes=[...unique.values()];const groups=new Map();
 const cellar=typeof wines!=='undefined'?wines:[];
 for(const t of votes){const w=cellar.find(w=>String(w.id)===String(t.wine_id))||cellar.find(w=>[w.producer,w.name].filter(Boolean).join(' ').toLocaleLowerCase('da')===String(t.wine_name).toLocaleLowerCase('da')&&String(w.year||'')===String(t.vintage||''));const details={...(w||{}),...(t.wine_details||{})};if(!w&&!Object.values(t.wine_details||{}).some(Boolean))continue;
 for(const [kind,val] of [['type',details.type],['country',details.country],['region',details.region]]){if(!val)continue;const k=kind+'|'+String(val).trim().toLocaleLowerCase('da');if(!groups.has(k))groups.set(k,{kind,name:String(val).trim(),up:0,same:0,down:0,love:0});groups.get(k)[t.rating]++}}
 const qualified=[...groups.values()].filter(g=>g.up+g.same+g.down+g.love>=3).sort((a,b)=>(b.up+b.love*2-b.down)-(a.up+a.love*2-a.down));
 const positive=qualified.filter(g=>g.up+g.love>=2&&g.up+g.love>g.down).slice(0,3),negative=qualified.filter(g=>g.down>=2&&g.down>g.up).slice(0,2);
 const fmt=g=>escape(g.name)+' ('+(g.up+g.love)+' positive, '+g.down+' negative)';
 const summary=votes.length+' forskellige vine vurderet · '+counts.love+' ❤️ · '+counts.up+' 👍 · '+counts.same+' tidligere okay · '+counts.down+' 👎.';
 const evidence=positive.length||negative.length?'<p><strong>Foreløbige mønstre fra dine vurderinger</strong></p>'+(positive.length?'<p>Du ser ud til at foretrække: '+positive.map(fmt).join(', ')+'.</p>':'')+(negative.length?'<p>Du har oftere fravalgt: '+negative.map(fmt).join(', ')+'.</p>':''):'<p>Endnu ingen pålidelige mønstre. Der kræves mindst 3 forskellige vine i samme kategori og mindst 2 ensrettede vurderinger.</p>';
 return '<p>'+summary+'</p>'+evidence+'<p>Din grundprofil med 22 svar bevares. Mønstre er observationer, ikke sikre konklusioner; den samme vin tæller kun én gang.</p>';
}
// Samlet præferencemodel: vurderinger 40 %, favoritter 40 %, 22 svar 20 %.
// Manglende vurderingsgrundlag nedvægtes og fordeles proportionalt til øvrige kilder.
const normalize=s=>String(s||'').toLocaleLowerCase('da').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const baseTerms=['chardonnay','viognier','blanc de blancs','champagne','ribera del duero','toro','rhône','rhone','châteauneuf','chateauneuf','px','pedro ximenez','sauternes','cremet','fyldig','moden','brioche','nødder'];
const avoidTerms=['meget syrlig','skarp syre','grøn sauvignon','ung chablis'];
let allTastings=[];
function scoreCandidate(candidate, options={}){
 const cellar=typeof wines!=='undefined'?wines:[];
 const keyOf=w=>normalize([w.producer,w.name,w.year||''].join('|'));
 const candidateKey=keyOf(candidate);
 const candidateId=String(candidate.id||'');
 const ratingMap=new Map();
 for(const t of allTastings){
  const w=cellar.find(w=>t.wine_id&&String(w.id)===String(t.wine_id));
  const key=w?keyOf(w):normalize([t.wine_name,t.vintage||''].join('|'));
  if(!ratingMap.has(key))ratingMap.set(key,t);
 }
 const rated=[...ratingMap.entries()].map(([key,t])=>({key,t,w:cellar.find(w=>t.wine_id&&String(w.id)===String(t.wine_id))}));
 const own=rated.find(x=>x.key===candidateKey||(candidateId&&x.t.wine_id&&String(x.t.wine_id)===candidateId));
 const directRating=own?.t.rating||null;
 const norm=normalize;
 const attrs=['body','acidity','fruit','texture','oak','maturity'];
 const ordinal={
  body:{light:0,medium_light:1,medium:2,medium_full:3,full:4},
  acidity:{low:0,medium_low:1,medium:2,medium_high:3,high:4},
  fruit:{fresh:0,ripe:2,jammy:2,mature:3,dried:3},
  texture:{lean:0,crisp:1,round:2,smooth:2,rich:3,creamy:3,velvety:3,silky:3},
  oak:{none:0,low:1,present:2,medium:2,high:3},
  maturity:{young:0,developing:1,mature:2}
 };
 const profile=w=>w?.sensory_profile||{};
 const known=w=>attrs.filter(k=>profile(w)[k]&&profile(w)[k]!=='unknown');
 const similarity=(a,b)=>{
  let weighted=0,weight=0;
  for(const k of attrs){
   const av=profile(a)[k],bv=profile(b)[k];
   if(!av||!bv||av==='unknown'||bv==='unknown')continue;
   const values=ordinal[k],v1=values[av],v2=values[bv];
   const sim=v1!==undefined&&v2!==undefined?Math.max(0,1-Math.abs(v1-v2)/Math.max(2,Math.max(...Object.values(values)))):(av===bv?1:0);
   const importance=k==='body'||k==='acidity'||k==='texture'?1.5:1;
   weighted+=sim*importance;weight+=importance;
  }
  return weight>=3?weighted/weight:null;
 };
 const textOf=w=>norm([w.name,w.producer,w.type,w.region,w.country,w.grapes,w.notes].filter(Boolean).join(' '));
 const text=textOf(candidate);
 const type=norm(candidate.type),name=norm(candidate.name),region=norm(candidate.region);
 const isChampagne=type.includes('champagne')||type.includes('mousserende');
 const isDessert=type.includes('dessert')||type.includes('port')||name.includes('pedro ximenez')||name.includes('don px')||name.includes('sauternes');
 const isWhite=!isChampagne&&!isDessert&&(type.includes('hvid')||type.includes('white'));
 const isRed=!isChampagne&&!isDessert&&!isWhite;
 const typeTerms=isChampagne?['blanc de blancs','champagne','brioche','cremet','moden']:isDessert?['px','pedro ximenez','sauternes','don px','moden']:isWhite?['chardonnay','viognier','cremet','fyldig','moden']:['ribera del duero','toro','rhone','chateauneuf','fyldig','moden'];
 const positiveTerms=typeTerms.filter(t=>text.includes(norm(t))).length;
 const negativeTerms=['skarp syre','meget syrlig','grøn sauvignon','ung chablis'].filter(t=>text.includes(norm(t))).length;
 const p=profile(candidate);
 const isKnown=k=>p[k]&&p[k]!=='unknown';
 const rich=['rich','creamy','velvety','round','silky','smooth'].includes(p.texture);
 const ripe=['ripe','mature','dried','jammy'].includes(p.fruit);
 const full=['full','medium_full'].includes(p.body);
 let prior=.60;
 prior+=Math.min(.10,positiveTerms*.03)-Math.min(.16,negativeTerms*.08);
 if(isKnown('body'))prior+=p.body==='full'?.065:p.body==='medium_full'?.045:p.body==='light'?-.045:0;
 if(isKnown('texture'))prior+=rich?(p.texture==='creamy'||p.texture==='velvety'?.07:.055):p.texture==='lean'?-.04:0;
 if(isKnown('fruit'))prior+=ripe?.045:0;
 if(isKnown('acidity')&&!isDessert){
  const balanced=full&&(rich||ripe);
  prior+=p.acidity==='high'?(balanced?-.015:-.10):p.acidity==='medium_high'?(balanced?0:-.035):0;
 }
 if(isChampagne){
  if(p.maturity==='mature')prior+=.045;
  if(p.texture==='creamy')prior+=.035;
 }else if(isDessert){
  if(p.fruit==='dried')prior+=.065;
  if(rich)prior+=.04;
  if(p.maturity==='mature')prior+=.035;
 }else if(isRed){
  if(p.texture==='velvety'||p.texture==='silky')prior+=.035;
 }else if(isWhite){
  if(p.texture==='creamy')prior+=.035;
 }
 const evidence=[];
 for(const x of rated){
  if(x.key===candidateKey||(candidateId&&x.t.wine_id&&String(x.t.wine_id)===candidateId))continue;
  const w=x.w||{name:x.t.wine_name,year:x.t.vintage,...(x.t.wine_details||{})};
  const verdict=x.t.rating;
  if(verdict==='same')continue;
  const label=verdict==='love'?1:verdict==='up'?.72:verdict==='down'?.12:null;
  if(label===null)continue;
  const sensorySim=similarity(candidate,w);
  const sameType=type&&norm(w.type)===type;
  const sameRegion=candidate.region&&w.region&&norm(candidate.region)===norm(w.region);
  const sameGrapes=candidate.grapes&&w.grapes&&norm(candidate.grapes)===norm(w.grapes);
  let sim=sensorySim!==null?sensorySim*.85:0;
  if(sameType)sim+=.10;
  if(sameRegion)sim+=.06;
  if(sameGrapes)sim+=.12;
  if(sensorySim===null&&!sameRegion&&!sameGrapes)continue;
  if(sim<.4)continue;
  const quality=sensorySim===null?.35:(profile(w).confidence==='high'?1:profile(w).confidence==='medium'?.75:.5);
  evidence.push({label,weight:sim*quality,sim});
 }
 evidence.sort((a,b)=>b.weight-a.weight);
 const neighbors=evidence.slice(0,8);
 const evidenceWeight=neighbors.reduce((n,x)=>n+x.weight,0);
 const learned= evidenceWeight?neighbors.reduce((n,x)=>n+x.label*x.weight,0)/evidenceWeight:null;
 const blend=learned===null?0:Math.min(.65,evidenceWeight/(evidenceWeight+2));
 const predicted=Math.max(.05,Math.min(.95,prior*(1-blend)+(learned??prior)*blend));
 const attributesKnown=known(candidate).length;
 const confidence=attributesKnown>=4&&neighbors.length>=5&&evidenceWeight>=3?'medium':'low';
 return {score:Math.round(predicted*100),confidence,weights:{answers:Math.round((1-blend)*100),favorites:0,ratings:Math.round(blend*100)},evidence:{directVerdict:directRating,matchedRatings:neighbors.length,attributesKnown,prior:Math.round(prior*100),isPrediction:true}};
}
window.vinTasteModelTest=function(){
 const cellar=typeof wines!=='undefined'?wines:[];
 const latest=new Map();
 for(const t of allTastings){const w=cellar.find(w=>t.wine_id&&String(w.id)===String(t.wine_id));if(!w)continue;if(!latest.has(String(w.id)))latest.set(String(w.id),t);}
 return {ratedWines:latest.size,withSensory:[...latest.keys()].filter(id=>cellar.find(w=>String(w.id)===id)?.sensory_profile).length,validation:'Not yet independently validated'};
};

window.vinTasteScore=scoreCandidate;if(typeof window.render==='function')window.render();
function renderDiscoveries(){const target=$('taste-discoveries-body');if(!target)return;const cellar=typeof wines!=='undefined'?wines:[];const unique=new Map();for(const t of allTastings){const key=normalize(t.wine_id||[t.wine_name,t.vintage].join('|'));if(!unique.has(key))unique.set(key,t)}const votes=[...unique.values()];const favorites=cellar.filter(w=>w.favorite);const groups=new Map();for(const t of votes){const w=cellar.find(w=>String(w.id)===String(t.wine_id))||cellar.find(w=>normalize([w.producer,w.name].filter(Boolean).join(' '))===normalize(t.wine_name)&&String(w.year||'')===String(t.vintage||''));const details={...(w||{}),...(t.wine_details||{})};if(!w&&!Object.values(t.wine_details||{}).some(Boolean))continue;for(const [kind,value] of [['Vintype',details.type],['Region',details.region],['Land',details.country],['Druer',details.grapes]]){if(!value)continue;const key=kind+'|'+normalize(value);if(!groups.has(key))groups.set(key,{kind,value,up:0,same:0,down:0,love:0});if(t.rating in groups.get(key))groups.get(key)[t.rating]++}}const qualified=[...groups.values()].filter(g=>g.up+g.same+g.down+g.love>=3&&(g.up+g.love>=2||g.down>=2)).sort((a,b)=>(b.up+b.down)-(a.up+a.down));const confidence=g=>{const n=g.up+g.same+g.down+g.love;return n>=10?'moderat':n>=5?'begrænset':'foreløbig'};let lines=['<p>'+votes.length+' forskellige vine vurderet · '+favorites.length+' favoritter. Dine 22 oprindelige svar indgår som grundprofil.</p>'];if(!qualified.length)lines.push('<p>Der er endnu ikke nok sammenlignelige vurderinger til at dokumentere en ny præference. Mindst 3 forskellige vine i en kategori er nødvendige.</p>');else{lines.push('<p><strong>Observerede mønstre</strong></p>');for(const g of qualified.slice(0,6)){const direction=g.up+g.love>g.down?'Oftere positiv':'Oftere negativ';lines.push('<p>'+direction+' for '+escape(g.kind.toLowerCase())+' <strong>'+escape(g.value)+'</strong> · '+g.love+' kan rigtig godt lide, '+g.up+' kan lide, '+g.same+' tidligere okay, '+g.down+' kan ikke lide · sikkerhed: '+confidence(g)+'.</p>')}}lines.push('<p>Vine uden kendt vintype, region eller land kan ikke bruges til disse kategorimønstre. Druer, syre, fad og tanniner udledes ikke uden dokumenterede oplysninger.</p>');target.innerHTML=lines.join('');}
function renderCombined(){const target=$('taste-combined');if(!target)return;const cellar=typeof wines!=='undefined'?wines:[];const fav=cellar.filter(w=>w.favorite);const rated=new Set(allTastings.map(t=>normalize(t.wine_id||[t.wine_name,t.vintage].join('|'))));const example=scoreCandidate({name:'Champagne Blanc de Blancs'});target.textContent='Smagsmodel 2.0: vinegenskaber og sammenlignelige tidligere vurderinger. Aktuelt '+rated.size+' forskellige vurderinger og '+fav.length+' favoritter. Scoren er en uafhængig forudsigelse og ændres ikke direkte af din vurdering af samme vin. Sikkerhed er foreløbig og ikke statistisk valideret.';}
window.addEventListener('focus',renderCombined);
// Load taste history independently of whether the Smagskompas accordion is opened.
window.addEventListener('pageshow',()=>{loadHistory();});
setTimeout(()=>loadHistory(),1500);
async function loadHistory(){try{await connect();const {data,error}=await client.from('wine_tastings').select('id,wine_id,wine_name,vintage,rating,created_at,wine_details').order('created_at',{ascending:false}).limit(1000);if(error)throw error;const all=data||[];$('tasting-history-count').textContent='('+new Set(all.map(t=>String(t.wine_id||[t.wine_name,t.vintage].join('|')).toLowerCase())).size+' vine)';allTastings=all;if(typeof window.render==='function')window.render();renderCombined();renderDiscoveries();$('tasting-learning').innerHTML=all.length?learn(all):'Ingen vurderinger endnu. Din oprindelige smagsprofil bevares.';history.innerHTML=all.slice(0,20).map(x=>'<div class="tasting-entry"><span>'+({love:'❤️',up:'👍',same:'↔️',down:'👎'}[x.rating]||'')+' '+escape(x.wine_name)+' '+escape(x.vintage||'')+'</span><button type="button" data-delete="'+escape(x.id)+'" class="ghost btn">Fortryd</button></div>').join('');history.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Slet denne vurdering? Eventuelt lagerfradrag bliver ikke automatisk fortrudt.'))return;const {error}=await client.from('wine_tastings').delete().eq('id',b.dataset.delete);if(error)feedback.textContent=error.message;else await loadHistory()});}catch(e){$('tasting-learning').textContent=e.message;}}

// Hurtig vurdering direkte fra samlingens vinkort.
window.rateCellarWine=async function(id,rating){
 if(!['down','up','love'].includes(rating))throw Error('Ugyldig vurdering');
 const w=(typeof wines!=='undefined'?wines:[]).find(item=>String(item.id)===String(id));
 if(!w)throw Error('Vinen blev ikke fundet i samlingen');
 await connect();
 const wineName=[w.producer,w.name].filter(Boolean).join(' ').trim();
 if(!wineName)throw Error('Vinen mangler navn');
 const vintage=String(w.year||'');
 const details={type:w.type||'',country:w.country||'',region:w.region||'',grapes:w.grapes||'',notes:w.notes||''};
 const {error}=await client.from('wine_tastings').insert({user_id:session.user.id,wine_name:wineName,vintage:vintage||null,rating,wine_id:/^[0-9a-f-]{36}$/i.test(String(w.id))?w.id:null,wine_details:details});
 if(error)throw error;
 await loadHistory();
};
$('tasting-save').onclick=async()=>{const name=$('tasting-name').value.trim(),vintage=$('tasting-year').value.trim(),decrement=$('tasting-decrement').checked,chosen=(typeof wines!=='undefined'?wines:[]).find(w=>String(w.id)===list.value);if(source==='cellar'&&!chosen){feedback.textContent='Vælg en vin fra samlingen.';return}if(!name||!selected){feedback.textContent='Angiv vin og vælg din vurdering.';return}if(decrement&&(!chosen||chosen.count<1)){feedback.textContent='Vælg en vin, du har på lager.';return}const button=$('tasting-save');button.disabled=true;try{await connect();const payload={user_id:session.user.id,wine_name:name,vintage:vintage||null,rating:selected,wine_id:chosen&&/^[0-9a-f-]{36}$/i.test(String(chosen.id))?chosen.id:null,wine_details:getMetadata()};const {error}=await client.from('wine_tastings').insert(payload);if(error)throw error;if(decrement){chosen.count-=1;save();render();}feedback.textContent='Vurderingen er gemt'+(decrement?' og én flaske er trukket fra lageret.':'.');$('tasting-photo').value='';preview.hidden=true;setMetadata(null);$('tasting-name').value='';$('tasting-year').value='';$('tasting-decrement').checked=false;selected=null;root.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed','false'));populate();await loadHistory();}catch(e){feedback.textContent='Kunne ikke gemme: '+e.message}finally{button.disabled=false}};
})();