// Min Vinkælder 2.0 – UI-lag oven på den eksisterende datamodel.
// Ingen ændringer i Supabase, ingen automatisk import.
(function(){
'use strict';
// Ingen lokal redigering før cloud har meldt klar.
window.cloudCanEdit=()=>false;
const e=id=>document.getElementById(id);
let category='all';
const overview=e('overview-panel');
function selectCategory(value){category=value;const selector=e('wine-type-filter');if(selector)selector.value=value;render()}
overview.addEventListener('click',event=>{
 const stat=event.target.closest('button[data-overview-type]');if(!stat||!overview.contains(stat))return;
 e('search').value='';e('filter').value='all';
 selectCategory(stat.dataset.overviewType||'all');
 const panel=e('collection-panel');panel.open=true;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
});
// Connect every filter control to the collection renderer.
e('search').addEventListener('input',()=>render());
e('filter').addEventListener('change',()=>render());
e('order').addEventListener('change',()=>render());
e('wine-type-filter').addEventListener('change',event=>selectCategory(event.target.value));
const heading=document.createElement('div');heading.className='v2-section-title';
heading.innerHTML='<h2>Alle vine</h2>';
e('items').before(heading);
e('sample').hidden=true; // Demoindhold hører ikke til i ejerens produktionssamling.
e('sample').disabled=true;
// Build vises kun i #build-version i index.html.
const number=x=>Number.isFinite(Number(x))&&x!==null&&x!==undefined&&x!==''?Number(x):null;
function score(w){
 const own=number(w.rating);if(own!==null)return {value:own,label:'Din vurdering',details:''};
 const c=(Array.isArray(w.reviews)&&w.reviews.length?w.reviews[0]:w.critic);
 if(!c||c.kind!=='anmeldelse')return null;
 const exact=number(c.score);
 if(c.kind==='anmeldelse'&&exact!==null)return {value:exact,label:'Anmelderpoint · '+(c.source||'kilde ukendt'),details:c.context||'',url:c.url};
 const low=number(c.low),high=number(c.high);
 const average=low!==null&&high!==null?(low+high)/2:exact??low??high;
 if(average===null)return null;
 return {value:average,label:'ChatGPT-estimat'+(low!==null&&high!==null?' · '+low+'–'+high+' point':''),details:'AI-estimat – ikke en dokumenteret anmeldelse.'};
}
function count(w){return Math.max(0,Number(w.count)||0)}
function urgency(w,now){const end=number(w.to);return end!==null&&count(w)>0&&end<=now+2}
function renderSoon(){
 const now=new Date().getFullYear();
 const selected=wines.filter(w=>urgency(w,now)).sort((a,b)=>(number(a.to)??9999)-(number(b.to)??9999)||a.producer.localeCompare(b.producer,'da')).slice(0,3);
 e('v2-soon-grid').innerHTML=selected.length?selected.map(w=>'<article class="v2-soon"><strong>'+h(w.producer)+'</strong><div class="meta">'+h(w.name)+' · '+h(w.year??'NV')+' · '+count(w)+' fl.</div><div class="year">'+(number(w.to)<now?'Drikkevindue passeret':'Drik senest '+h(w.to))+'</div></article>').join(''):'<p class="v2-muted">Ingen vine nærmer sig slutningen af deres drikkevindue.</p>';
}
function card(w){
 const wineType=String(w.type||'');
 const categoryClass=wineType==='Hvidvin'?'white':wineType==='Champagne'||wineType==='Mousserende'?'sparkling':'red';
 const s=status(w),r=score(w);const taste=typeof window.vinTasteScore==='function'?window.vinTasteScore(w):null;const tasteHtml=taste?'<div class="meta">Personligt smagsmatch: <strong>'+taste.score+' / 100</strong>'+(taste.confidence?' · '+({high:'Høj',medium:'Middel',low:'Lav'}[taste.confidence]||'Lav')+' sikkerhed':'')+'</div>':'';
 const ratingHtml=r?'<div class="v2-rating"><strong>'+h(Number.isInteger(r.value)?r.value:r.value.toFixed(1))+'/100</strong>'+h(r.label)+(r.details?'<small>'+h(r.details)+'</small>':'')+(r.url&&/^https:\/\//i.test(r.url)?'<small><a href="'+h(r.url)+'" target="_blank" rel="noopener noreferrer">Se kilde</a></small>':'')+'</div>':'';
 const reviews=Array.isArray(w.reviews)?w.reviews.filter(x=>x.kind==='anmeldelse'&&Number.isFinite(Number(x.score))):[];
 const links=reviews.length?'<details class="v2-details"><summary>Alle dokumenterede anmeldelser ('+reviews.length+')</summary>'+reviews.map(x=>'<p><strong>'+h(x.score)+'/100 · '+h(x.source)+'</strong>'+(x.url&&/^https:\/\//i.test(x.url)?' · <a href="'+h(x.url)+'" target="_blank" rel="noopener noreferrer">Kilde</a>':'')+(x.context?' · '+h(x.context):'')+'</p>').join('')+'</details>':'';
 const verdict=taste?.evidence?.directVerdict||null;
 const tasteButtons='<div style="display:flex;align-items:center;gap:10px;margin:10px 0 4px;flex-wrap:wrap"><span class="meta" style="margin:0;font-size:12px">Din smag</span><div role="group" aria-label="Din smagsvurdering af '+h(w.name)+'" style="display:flex;gap:7px">'+[['down','thumbs-down','Kan ikke lide'],['up','thumbs-up','Kan lide'],['love','heart','Kan rigtig godt lide']].map(([value,icon,label])=>'<button type="button" data-taste-rating="'+value+'" data-id="'+h(w.id)+'" aria-label="'+label+'" title="'+label+'" aria-pressed="'+(verdict===value)+'" style="width:39px;height:36px;min-height:36px;padding:0;border:1px solid '+(verdict===value?'#d9bd87':'#52664f')+';border-radius:10px;background:'+(verdict===value?'#4c5235':'#26362b')+';font-size:18px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="'+(verdict===value?'#d9bd87':'#c4cdbd')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({ 'thumbs-down':'<path d="M17 14V2M9 18l1-4H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20v12h-3.5l-5.36 6.15A2 2 0 0 1 9 18Z"/>','thumbs-up':'<path d="M7 10v12M15 5l-1 5h6.17a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.84 22H4V10h3.5l5.36-6.15A2 2 0 0 1 15 5Z"/>',heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>'}[icon])+'</svg></button>').join('')+'</div>'+(verdict?'<span class="meta" style="margin:0;font-size:11px">'+h(({down:'Kan ikke lide',up:'Kan lide',love:'Kan rigtig godt lide',same:'Tidligere: Okay'}[verdict]||''))+'</span>':'')+'</div>';
 const detailText=w.notes||'Ingen smagsnote endnu.';
 const favButton='<button type="button" class="fav-btn '+(w.favorite?'active':'')+'" data-action="favorite" data-id="'+h(w.id)+'" aria-pressed="'+(w.favorite?'true':'false')+'" aria-label="'+(w.favorite?'Fjern fra favoritter':'Tilføj til favoritter')+'"><span class="heart">'+(w.favorite?'♥':'♡')+'</span>'+(w.favorite?'Favorit':'Markér favorit')+'</button>';
 return '<article class="wine"><div class="wine-head"></div><div class="wine-body"><div class="v2-wine-top"><div class="v2-bottle '+categoryClass+'" aria-hidden="true"><span>'+h(w.year??'NV')+'</span></div><div class="v2-wine-info"><div class="favorite-line"><div class="region">'+h(w.region||w.country||wineType)+'</div>'+favButton+'</div><h2>'+h(w.producer)+'</h2><div class="v2-name">'+h(w.name)+'</div><div class="meta">'+h(wineType)+' · '+h(w.year??'NV')+(w.country?' · '+h(w.country):'')+'</div></div></div><div class="chips"><span class="chip">'+count(w)+' '+(count(w)===1?'flaske':'flasker')+'</span><span class="chip '+s+'">'+h(labels[s])+'</span></div>' + '<div class="meta">Drikkevindue: '+h(w.from??'—')+' – '+h(w.to??'—')+'</div>'+tasteHtml+tasteButtons+ratingHtml+links+'<details class="v2-details"><summary>Noter og detaljer</summary><p>'+h(detailText)+'</p>'+(w.tasted?'<div class="meta">Smagt: '+h(w.tasted)+'</div>':'')+'</details><div class="actions"><button data-action="edit" data-id="'+h(w.id)+'">Redigér</button><button data-action="plus" data-id="'+h(w.id)+'">+1 flaske</button><button data-action="drink" data-id="'+h(w.id)+'" '+(count(w)<1?'disabled':'')+'>−1 flaske</button><button data-action="delete" data-id="'+h(w.id)+'">Slet</button></div></div></article>';
}
e('items').addEventListener('click',async event=>{
 const button=event.target.closest('button[data-taste-rating]');
 if(!button||!e('items').contains(button))return;
 if(typeof window.rateCellarWine!=='function'){alert('Smagsmodellen er ikke klar. Prøv at genindlæse siden.');return;}
 const id=button.dataset.id,rating=button.dataset.tasteRating;
 const card=button.closest('.wine');const buttons=[...(card?.querySelectorAll('[data-taste-rating]')||[])];
 buttons.forEach(b=>b.disabled=true);
 try{await window.rateCellarWine(id,rating);if(typeof notify==='function')notify('Smagsvurdering gemt');}
 catch(err){alert('Kunne ikke gemme vurdering: '+(err.message||err));buttons.forEach(b=>b.disabled=false);}
});
window.render=function(){
 const query=e('search').value.trim().toLocaleLowerCase('da');
 const filter=e('filter').value,sort=e('order').value;
 const visible=wines.filter(w=>(
   category==='all'||(String(w.type||'Andet').trim()||'Andet')===category
 )&&(filter==='all'||(filter==='favorites'?!!w.favorite:status(w)===filter))&&[
   w.name,w.producer,w.country,w.region,w.type,String(w.year??'')
 ].join(' ').toLocaleLowerCase('da').includes(query));
 const stable=(a,b)=>(String(a.name)+' '+String(a.producer)).localeCompare(String(b.name)+' '+String(b.producer),'da');
 const typeOrder=['Rødvin','Hvidvin','Champagne','Mousserende','Rosé','Dessertvin','Andet'];
 const categoryRank=w=>{const rank=typeOrder.indexOf(w.type);return rank<0?typeOrder.length:rank};
 visible.sort((a,b)=>{
  if(sort==='taste'){const sa=typeof window.vinTasteScore==='function'?window.vinTasteScore(a)?.score:null;const sb=typeof window.vinTasteScore==='function'?window.vinTasteScore(b)?.score:null;if(sa!==null&&sb!==null&&sa!==sb)return sb-sa;if((sa!==null)!==(sb!==null))return sa===null?1:-1;return stable(a,b)}
  if(sort==='year')return (Number(b.year)||0)-(Number(a.year)||0)||stable(a,b);
  if(sort==='count')return count(b)-count(a)||stable(a,b);
  if(sort==='rating'){
   const sa=score(a),sb=score(b);
   if(sa&&sb&&sa.value!==sb.value)return sb.value-sa.value;
   if(Boolean(sa)!==Boolean(sb))return sb?1:-1;
  }
  return stable(a,b);
 });
 const totalBottles=wines.reduce((n,w)=>n+count(w),0);
 e('bottles').textContent=totalBottles;
 const byType=new Map();
 for(const w of wines){const type=String(w.type||'Andet').trim()||'Andet';byType.set(type,(byType.get(type)||0)+count(w))}
 const knownOrder=['Rødvin','Hvidvin','Champagne','Mousserende','Rosé','Dessertvin','Portvin','Andet'];
 const types=[...byType].filter(([type,n])=>n>0).sort((a,b)=>{
  const ai=knownOrder.indexOf(a[0]),bi=knownOrder.indexOf(b[0]);
  return (ai<0?knownOrder.length:ai)-(bi<0?knownOrder.length:bi)||a[0].localeCompare(b[0],'da');
 });
 const typeSelector=e('wine-type-filter');
 const allTypes=[...new Set(wines.map(w=>String(w.type||'Andet').trim()||'Andet'))].sort((a,b)=>{
  const ai=knownOrder.indexOf(a),bi=knownOrder.indexOf(b);
  return (ai<0?knownOrder.length:ai)-(bi<0?knownOrder.length:bi)||a.localeCompare(b,'da');
 });
 if(typeSelector.options.length!==allTypes.length+1||allTypes.some((type,i)=>typeSelector.options[i+1]?.value!==type)){
  typeSelector.replaceChildren(new Option('Alle vintyper','all'),...allTypes.map(type=>new Option(type,type)));
 }
 if(category!=='all'&&!allTypes.includes(category))category='all';
 typeSelector.value=category;
 heading.querySelector('h2').textContent=category==='all'?'Alle vine':category;
 const overviewStats=e('overview-stats');
 overviewStats.querySelectorAll('[data-overview-dynamic="true"]').forEach(node=>node.remove());
 for(const [type,n] of types.filter(([type])=>!['Rødvin','Hvidvin','Champagne'].includes(type))){
  const button=document.createElement('button');button.type='button';button.className='stat stat-nav';button.dataset.overviewType=type;button.dataset.overviewDynamic='true';button.setAttribute('aria-label','Vis '+type+' i samlingen');
  const number=document.createElement('strong');number.textContent=n;
  const label=document.createElement('span');label.textContent=type+' · flasker';
  button.append(number,label);overviewStats.append(button);
 }
 e('items').innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">Ingen vine matcher filtrene. Prøv en anden kategori eller søgning.</div>';
 renderSoon();
 if(typeof renderTasteProfile==='function')renderTasteProfile();
};
render();
})();
