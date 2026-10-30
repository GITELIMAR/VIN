(()=>{'use strict';
const $=id=>document.getElementById(id), escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=$('tasting-compass');if(!root)return;
const list=$('tasting-wine'),preview=$('tasting-preview'),feedback=$('tasting-feedback'),history=$('tasting-history');
let client=null,session=null,selected=null;
const key='sb_publishable_BH8HekyCWghzO0jKjBC3SA_tueFlGFj',url='https://cnygxkvyjzyqlhytzvsr.supabase.co';
async function connect(){if(!window.supabase?.createClient)throw Error('Supabase er ikke indlæst');client=window.supabase.createClient(url,key);const result=await client.auth.getSession();session=result.data.session;if(!session)throw Error('Log ind under Synkronisering først');}
function populate(){const options=(typeof wines!=='undefined'?wines:[]).filter(w=>Number(w.count)>0);list.innerHTML='<option value="">Anden vin / vælg manuelt</option>'+options.map(w=>'<option value="'+escape(w.id)+'">'+escape((w.producer||'')+' '+(w.name||'')+' '+(w.year||''))+' ('+Number(w.count)+' på lager)</option>').join('');}
function selection(){const w=(typeof wines!=='undefined'?wines:[]).find(w=>String(w.id)===list.value);if(w){$('tasting-name').value=[w.producer,w.name].filter(Boolean).join(' ');$('tasting-year').value=w.year||'';$('tasting-decrement').disabled=false}else{$('tasting-decrement').checked=false;$('tasting-decrement').disabled=true;}}
list.addEventListener('change',selection);root.addEventListener('toggle',()=>{if(root.open){populate();loadHistory();}});
$('tasting-photo').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){feedback.textContent='Vælg et billede';return}const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.hidden=false};reader.readAsDataURL(file);feedback.textContent='Fotoet er kun til hjælp ved registrering og uploades ikke.';});
root.querySelectorAll('[data-rating]').forEach(btn=>btn.onclick=()=>{selected=btn.dataset.rating;root.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));});
function learn(all){
 const counts={up:0,same:0,down:0};all.forEach(x=>{if(x.rating in counts)counts[x.rating]++});
 const unique=new Map();for(const t of all){const k=(t.wine_id||[t.wine_name,t.vintage].join('|')).toLowerCase();if(!unique.has(k))unique.set(k,t)}
 const votes=[...unique.values()];const groups=new Map();
 const cellar=typeof wines!=='undefined'?wines:[];
 for(const t of votes){const w=cellar.find(w=>String(w.id)===String(t.wine_id))||cellar.find(w=>[w.producer,w.name].filter(Boolean).join(' ').toLocaleLowerCase('da')===String(t.wine_name).toLocaleLowerCase('da')&&String(w.year||'')===String(t.vintage||''));if(!w)continue;
 for(const [kind,val] of [['type',w.type],['country',w.country],['region',w.region]]){if(!val)continue;const k=kind+'|'+String(val).trim().toLocaleLowerCase('da');if(!groups.has(k))groups.set(k,{kind,name:String(val).trim(),up:0,same:0,down:0});groups.get(k)[t.rating]++}}
 const qualified=[...groups.values()].filter(g=>g.up+g.same+g.down>=3).sort((a,b)=>(b.up-b.down)-(a.up-a.down));
 const positive=qualified.filter(g=>g.up>=2&&g.up>g.down).slice(0,3),negative=qualified.filter(g=>g.down>=2&&g.down>g.up).slice(0,2);
 const fmt=g=>escape(g.name)+' ('+g.up+' positive, '+g.down+' negative)';
 const summary=votes.length+' forskellige vine vurderet · '+counts.up+' ⬆️ · '+counts.same+' ↔️ · '+counts.down+' ⤵️.';
 const evidence=positive.length||negative.length?'<p><strong>Foreløbige mønstre fra dine vurderinger</strong></p>'+(positive.length?'<p>Du ser ud til at foretrække: '+positive.map(fmt).join(', ')+'.</p>':'')+(negative.length?'<p>Du har oftere fravalgt: '+negative.map(fmt).join(', ')+'.</p>':''):'<p>Endnu ingen pålidelige mønstre. Der kræves mindst 3 forskellige vine i samme kategori og mindst 2 ensrettede vurderinger.</p>';
 return '<p>'+summary+'</p>'+evidence+'<p>Din grundprofil med 22 svar bevares. Mønstre er observationer, ikke sikre konklusioner; den samme vin tæller kun én gang.</p>';
}
// Samlet præferencemodel: vurderinger 40 %, favoritter 40 %, 22 svar 20 %.
// Manglende vurderingsgrundlag nedvægtes og fordeles proportionalt til øvrige kilder.
const normalize=s=>String(s||'').toLocaleLowerCase('da').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const baseTerms=['chardonnay','viognier','blanc de blancs','champagne','ribera del duero','toro','rhône','rhone','châteauneuf','chateauneuf','px','pedro ximenez','sauternes','cremet','fyldig','moden','brioche','nødder'];
const avoidTerms=['meget syrlig','skarp syre','grøn sauvignon','ung chablis'];
let allTastings=[];
function scoreCandidate(candidate){
 const s=normalize([candidate.name,candidate.producer,candidate.region,candidate.country,candidate.type,candidate.note].filter(Boolean).join(' '));
 const cellar=typeof wines!=='undefined'?wines:[];
 const fav=cellar.filter(w=>w.favorite);
 const ratingMap=new Map();for(const t of allTastings){const key=normalize(t.wine_id||[t.wine_name,t.vintage].join('|'));if(!ratingMap.has(key))ratingMap.set(key,t)}
 const rated=[...ratingMap.values()];
 const matching=w=>{const text=normalize([w.producer,w.name,w.region,w.country,w.type].filter(Boolean).join(' '));const tokens=[w.producer,w.name,w.region,w.type].map(normalize).filter(x=>x.length>=4);return tokens.some(t=>s.includes(t))||[candidate.name,candidate.region,candidate.type].map(normalize).filter(x=>x.length>=4).some(t=>text.includes(t))};
 const baseHits=baseTerms.filter(t=>s.includes(normalize(t))).length,avoidHits=avoidTerms.filter(t=>s.includes(normalize(t))).length;
 const baseline=Math.max(0,Math.min(1,.5+.12*baseHits-.25*avoidHits));
 const favoriteHits=fav.filter(matching).length;const favoriteScore=fav.length?Math.min(1,.5+.25*favoriteHits):null;
 const matchedRated=rated.filter(t=>{const w=cellar.find(w=>String(w.id)===String(t.wine_id));return w?matching(w):s.includes(normalize(t.wine_name))});
 const ratingScore=matchedRated.length?matchedRated.reduce((a,t)=>a+({up:1,same:.5,down:0}[t.rating]??.5),0)/matchedRated.length:null;
 // Datatillid: én vurdering kan højst aktivere en tredjedel af vurderingsvægten.
 const weights={answers:.2,favorites:favoriteScore===null?0:.4,ratings:ratingScore===null?0:.4*Math.min(1,rated.length/3)};
 const total=weights.answers+weights.favorites+weights.ratings;
 const score=(baseline*weights.answers+(favoriteScore??0)*weights.favorites+(ratingScore??0)*weights.ratings)/total;
 return {score:Math.round(score*100),weights:{answers:Math.round(weights.answers/total*100),favorites:Math.round(weights.favorites/total*100),ratings:Math.round(weights.ratings/total*100)},evidence:{favoriteHits,matchedRatings:matchedRated.length,baseHits}};
}
window.vinTasteScore=scoreCandidate;
function renderCombined(){const target=$('taste-combined');if(!target)return;const cellar=typeof wines!=='undefined'?wines:[];const fav=cellar.filter(w=>w.favorite);const rated=new Set(allTastings.map(t=>normalize(t.wine_id||[t.wine_name,t.vintage].join('|'))));const example=scoreCandidate({name:'Champagne Blanc de Blancs'});target.textContent='Samlet smagsmodel: 40 % vurderinger · 40 % favoritter · 20 % dine 22 svar. Aktuelt '+rated.size+' forskellige vurderinger og '+fav.length+' favoritter. Manglende eller sparsomme data nedvægtes automatisk. Match-score er et forsigtigt estimat baseret på kendte ord og vinoplysninger, ikke en smagsgaranti.';}
window.addEventListener('focus',renderCombined);
async function loadHistory(){try{await connect();const {data,error}=await client.from('wine_tastings').select('id,wine_id,wine_name,vintage,rating,created_at').order('created_at',{ascending:false}).limit(1000);if(error)throw error;const all=data||[];allTastings=all;renderCombined();$('tasting-learning').innerHTML=all.length?learn(all):'Ingen vurderinger endnu. Din oprindelige smagsprofil bevares.';history.innerHTML=all.slice(0,20).map(x=>'<div class="tasting-entry"><span>'+({up:'⬆️',same:'↔️',down:'⤵️'}[x.rating]||'')+' '+escape(x.wine_name)+' '+escape(x.vintage||'')+'</span><button type="button" data-delete="'+escape(x.id)+'" class="ghost btn">Fortryd</button></div>').join('');history.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Slet denne vurdering? Eventuelt lagerfradrag bliver ikke automatisk fortrudt.'))return;const {error}=await client.from('wine_tastings').delete().eq('id',b.dataset.delete);if(error)feedback.textContent=error.message;else await loadHistory()});}catch(e){$('tasting-learning').textContent=e.message;}}

$('tasting-save').onclick=async()=>{const name=$('tasting-name').value.trim(),vintage=$('tasting-year').value.trim(),decrement=$('tasting-decrement').checked,chosen=(typeof wines!=='undefined'?wines:[]).find(w=>String(w.id)===list.value);if(!name||!selected){feedback.textContent='Angiv vin og vælg en pil.';return}if(decrement&&(!chosen||chosen.count<1)){feedback.textContent='Vælg en vin, du har på lager.';return}const button=$('tasting-save');button.disabled=true;try{await connect();const payload={user_id:session.user.id,wine_name:name,vintage:vintage||null,rating:selected,wine_id:chosen&&/^[0-9a-f-]{36}$/i.test(String(chosen.id))?chosen.id:null};const {error}=await client.from('wine_tastings').insert(payload);if(error)throw error;if(decrement){chosen.count-=1;save();render();}feedback.textContent='Vurderingen er gemt'+(decrement?' og én flaske er trukket fra lageret.':'.');$('tasting-photo').value='';preview.hidden=true;$('tasting-name').value='';$('tasting-year').value='';$('tasting-decrement').checked=false;selected=null;root.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed','false'));populate();await loadHistory();}catch(e){feedback.textContent='Kunne ikke gemme: '+e.message}finally{button.disabled=false}};
})();