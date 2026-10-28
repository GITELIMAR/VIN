// Min Vinkælder 2.0 – UI-lag oven på den eksisterende datamodel.
// Ingen ændringer i Supabase, ingen automatisk import.
(function(){
'use strict';
// Ingen lokal redigering før cloud har meldt klar.
window.cloudCanEdit=()=>false;
const e=id=>document.getElementById(id);
let category='all';
const overview=e('overview-panel');
function selectCategory(value){category=value;render()}
overview.addEventListener('click',event=>{
 const stat=event.target.closest('button[data-overview-type]');if(!stat||!overview.contains(stat))return;
 e('search').value='';e('filter').value='all';
 selectCategory(stat.dataset.overviewType||'all');
 const panel=e('collection-panel');panel.open=true;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
});
const heading=document.createElement('div');heading.className='v2-section-title';
heading.innerHTML='<h2>Alle vine</h2><span id="v2-list-count"></span>';
e('items').before(heading);
const cloudLabel=document.createElement('div');cloudLabel.id='v2-cloud-indicator';
cloudLabel.innerHTML='<span id="v2-cloud-dot"></span><span id="v2-cloud-text">Kontrollerer cloud…</span>';
document.querySelector('.top > div').append(cloudLabel);
window.updateCloudStatus=text=>{
 e('v2-cloud-text').textContent=text;
 const healthy=/^Cloud synkroniseret|^Slettet i cloud|^Klar|^Import gemt/i.test(text);
 const warning=/fejl|advarsel|konflikt|ikke synkroniseret|logget ud/i.test(text);
 e('v2-cloud-dot').style.background=healthy?'#8cce9b':warning?'#e7a183':'#c5ba7a';
};
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
 const s=status(w),r=score(w);
 const ratingHtml=r?'<div class="v2-rating"><strong>'+h(Number.isInteger(r.value)?r.value:r.value.toFixed(1))+'/100</strong>'+h(r.label)+(r.details?'<small>'+h(r.details)+'</small>':'')+(r.url&&/^https:\/\//i.test(r.url)?'<small><a href="'+h(r.url)+'" target="_blank" rel="noopener noreferrer">Se kilde</a></small>':'')+'</div>':'';
 const reviews=Array.isArray(w.reviews)?w.reviews.filter(x=>x.kind==='anmeldelse'&&Number.isFinite(Number(x.score))):[];
 const links=reviews.length?'<details class="v2-details"><summary>Alle dokumenterede anmeldelser ('+reviews.length+')</summary>'+reviews.map(x=>'<p><strong>'+h(x.score)+'/100 · '+h(x.source)+'</strong>'+(x.url&&/^https:\/\//i.test(x.url)?' · <a href="'+h(x.url)+'" target="_blank" rel="noopener noreferrer">Kilde</a>':'')+(x.context?' · '+h(x.context):'')+'</p>').join('')+'</details>':'';
 const detailText=w.notes||'Ingen smagsnote endnu.';
 const favButton='<button type="button" class="fav-btn '+(w.favorite?'active':'')+'" data-action="favorite" data-id="'+h(w.id)+'" aria-pressed="'+(w.favorite?'true':'false')+'" aria-label="'+(w.favorite?'Fjern fra favoritter':'Tilføj til favoritter')+'"><span class="heart">'+(w.favorite?'♥':'♡')+'</span>'+(w.favorite?'Favorit':'Markér favorit')+'</button>';
 return '<article class="wine"><div class="wine-head"></div><div class="wine-body"><div class="v2-wine-top"><div class="v2-bottle '+categoryClass+'" aria-hidden="true"><span>'+h(w.year??'NV')+'</span></div><div class="v2-wine-info"><div class="favorite-line"><div class="region">'+h(w.region||w.country||wineType)+'</div>'+favButton+'</div><h2>'+h(w.producer)+'</h2><div class="v2-name">'+h(w.name)+'</div><div class="meta">'+h(wineType)+' · '+h(w.year??'NV')+(w.country?' · '+h(w.country):'')+'</div></div></div><div class="chips"><span class="chip">'+count(w)+' '+(count(w)===1?'flaske':'flasker')+'</span><span class="chip '+s+'">'+h(labels[s])+'</span></div>' + '<div class="meta">Drikkevindue: '+h(w.from??'—')+' – '+h(w.to??'—')+'</div>'+ratingHtml+links+'<details class="v2-details"><summary>Noter og detaljer</summary><p>'+h(detailText)+'</p>'+(w.tasted?'<div class="meta">Smagt: '+h(w.tasted)+'</div>':'')+'</details><div class="actions"><button data-action="edit" data-id="'+h(w.id)+'">Redigér</button><button data-action="plus" data-id="'+h(w.id)+'">+1 flaske</button><button data-action="drink" data-id="'+h(w.id)+'" '+(count(w)<1?'disabled':'')+'>−1 flaske</button><button data-action="delete" data-id="'+h(w.id)+'">Slet</button></div></div></article>';
}
window.render=function(){
 const query=e('search').value.trim().toLocaleLowerCase('da');
 const filter=e('filter').value,sort=e('order').value;
 const visible=wines.filter(w=>(
   category==='all'||w.type===category
 )&&(filter==='all'||(filter==='favorites'?!!w.favorite:status(w)===filter))&&[
   w.name,w.producer,w.country,w.region,w.type,String(w.year??'')
 ].join(' ').toLocaleLowerCase('da').includes(query));
 const stable=(a,b)=>(String(a.producer)+' '+String(a.name)).localeCompare(String(b.producer)+' '+String(b.name),'da');
 const typeOrder=['Rødvin','Hvidvin','Champagne','Mousserende','Rosé','Dessertvin','Andet'];
 const categoryRank=w=>{const rank=typeOrder.indexOf(w.type);return rank<0?typeOrder.length:rank};
 visible.sort((a,b)=>{
  // Hold typer samlet i "Alle". I en enkelt kategori vises pointgivne vine øverst.
  const byType=category==='all'?categoryRank(a)-categoryRank(b):0;
  if(byType)return byType;
  const sa=score(a),sb=score(b);
  if(Boolean(sa)!==Boolean(sb))return sb?1:-1;
  // Dokumenterede vurderinger sorteres altid højest først inden for samme kategori.
  if(sa&&sb&&sa.value!==sb.value)return sb.value-sa.value;
  if(sort==='year')return (Number(b.year)||0)-(Number(a.year)||0)||stable(a,b);
  if(sort==='count')return count(b)-count(a)||stable(a,b);
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
 const overviewStats=e('overview-stats');
 overviewStats.querySelectorAll('[data-overview-type]:not([data-overview-type="all"])').forEach(node=>node.remove());
 for(const [type,n] of types){
  const button=document.createElement('button');button.type='button';button.className='stat stat-nav';button.dataset.overviewType=type;button.setAttribute('aria-label','Vis '+type+' i samlingen');
  const number=document.createElement('strong');number.textContent=n;
  const label=document.createElement('span');label.textContent=type+' · flasker';
  button.append(number,label);overviewStats.append(button);
 }
 e('v2-list-count').textContent=visible.length+' af '+wines.length+' vine';
 e('items').innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">Ingen vine matcher filtrene. Prøv en anden kategori eller søgning.</div>';
 renderSoon();
 if(typeof renderTasteProfile==='function')renderTasteProfile();
};
render();
})();
