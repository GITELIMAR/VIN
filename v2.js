// Min Vinkælder 2.0 – UI-lag oven på den eksisterende datamodel.
// Ingen ændringer i Supabase, ingen automatisk import.
(function(){
'use strict';
// Ingen lokal redigering før cloud har meldt klar.
window.cloudCanEdit=()=>false;
const e=id=>document.getElementById(id);
const typeButtons=[
 ['all','Alle'],['Rødvin','Rødvin'],['Hvidvin','Hvidvin'],
 ['Champagne','Champagne'],['Mousserende','Mousserende'],
 ['Dessertvin','Dessert & port'],['Rosé','Rosé']
];
let category='all';
const typeSection=document.createElement('section');
typeSection.className='v2-filter-wrap';
typeSection.innerHTML='<h2>Udforsk samlingen</h2><div class="v2-filter-buttons" role="group" aria-label="Vintype"></div>';
const categoryButtons=typeSection.querySelector('.v2-filter-buttons');
for(const [value,label] of typeButtons){
 const button=document.createElement('button');button.type='button';button.textContent=label;
 button.dataset.type=value;button.setAttribute('aria-pressed',String(value===category));
 button.onclick=()=>{category=value;categoryButtons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===value)));render()};
 categoryButtons.append(button);
}
e('items').before(typeSection);
const soon=document.createElement('section');soon.id='v2-soon';
soon.innerHTML='<div class="v2-section-title"><h2>Drik snart</h2><p>Vine, der nærmer sig slutningen af drikkevinduet</p></div><div id="v2-soon-grid" class="v2-soon-grid"></div>';
typeSection.before(soon);
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
document.querySelector('header .sub:last-child').textContent='VERSION 2.0 · 28.10.2026';
const number=x=>Number.isFinite(Number(x))&&x!==null&&x!==undefined&&x!==''?Number(x):null;
function score(w){
 const own=number(w.rating);if(own!==null)return {value:own,label:'Din vurdering',details:''};
 const c=w.critic;
 if(!c)return null;
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
 const detailText=w.notes||'Ingen smagsnote endnu.';
 return '<article class="wine"><div class="wine-head"></div><div class="wine-body"><div class="v2-wine-top"><div class="v2-bottle '+categoryClass+'" aria-hidden="true"><span>'+h(w.year??'NV')+'</span></div><div class="v2-wine-info"><div class="region">'+h(w.region||w.country||wineType)+'</div><h2>'+h(w.producer)+'</h2><div class="v2-name">'+h(w.name)+'</div><div class="meta">'+h(wineType)+' · '+h(w.year??'NV')+(w.country?' · '+h(w.country):'')+'</div></div></div><div class="chips"><span class="chip">'+count(w)+' '+(count(w)===1?'flaske':'flasker')+'</span><span class="chip '+s+'">'+h(labels[s])+'</span></div><div class="meta">Drikkevindue: '+h(w.from??'—')+' – '+h(w.to??'—')+'</div>'+ratingHtml+'<details class="v2-details"><summary>Noter og detaljer</summary><p>'+h(detailText)+'</p>'+(w.tasted?'<div class="meta">Smagt: '+h(w.tasted)+'</div>':'')+'</details><div class="actions"><button data-action="edit" data-id="'+h(w.id)+'">Redigér</button><button data-action="plus" data-id="'+h(w.id)+'">+1 flaske</button><button data-action="drink" data-id="'+h(w.id)+'" '+(count(w)<1?'disabled':'')+'>−1 flaske</button><button data-action="delete" data-id="'+h(w.id)+'">Slet</button></div></div></article>';
}
window.render=function(){
 const query=e('search').value.trim().toLocaleLowerCase('da');
 const filter=e('filter').value,sort=e('order').value;
 const visible=wines.filter(w=>(
   category==='all'||w.type===category
 )&&(filter==='all'||status(w)===filter)&&[
   w.name,w.producer,w.country,w.region,w.type,String(w.year??'')
 ].join(' ').toLocaleLowerCase('da').includes(query));
 const stable=(a,b)=>(String(a.producer)+' '+String(a.name)).localeCompare(String(b.producer)+' '+String(b.name),'da');
 visible.sort((a,b)=>sort==='year'?(Number(b.year)||0)-(Number(a.year)||0)||stable(a,b):sort==='rating'?(score(b)?.value??-1)-(score(a)?.value??-1)||stable(a,b):sort==='count'?count(b)-count(a)||stable(a,b):stable(a,b));
 e('bottles').textContent=wines.reduce((n,w)=>n+count(w),0);
 e('unique').textContent=wines.length;
 e('ready').textContent=wines.filter(w=>status(w)==='ready').reduce((n,w)=>n+count(w),0);
 for(const [type,id] of [['Rødvin','red-count'],['Hvidvin','white-count'],['Champagne','champagne-count']]){
  e(id).textContent=wines.filter(w=>w.type===type).reduce((n,w)=>n+count(w),0);
 }
 e('v2-list-count').textContent=visible.length+' af '+wines.length+' vine';
 e('items').innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">Ingen vine matcher filtrene. Prøv en anden kategori eller søgning.</div>';
 renderSoon();
};
render();
})();
