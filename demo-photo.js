'use strict';
(function(){
const batch='chatgpt-foto-test-2026-10-28';
const entries=[
 ['Chartier & Fils','Carte Noire Brut',null,'Champagne'],
 ['Eric Isselée','Grand Cru Blanc de Blancs',null,'Champagne'],
 ['Seconde-Simon','Nuance',null,'Champagne'],
 ['Pierre Legras','Origin Brut',null,'Champagne'],
 ['Pierre Legras','Black Jackets',null,'Champagne'],
 ['José Michel','Spécial Club',2016,'Champagne'],
 ['Chartier & Fils','Spécial Club',2008,'Champagne']
];

const key='vin-demo-photo-imported-v2';
function importOnce(){
 if(localStorage.getItem(key)==='done')return;
 const existing=new Set(wines.map(w=>w.id));
 const test=entries.map(([producer,name,year,type],i)=>({
 id:'c85eab34-0f48-4c62-a8c2-'+String(100000000001+i),
 producer,name,year,type,country:'Frankrig',region:'Champagne',count:1,rating:null,
 from:null,to:null,notes:'TESTFLASKE fra foto · kontrollér producent, cuvée og årgang.',tasted:'',
 demoPhotoBatch:batch
 })).filter(w=>!existing.has(w.id));
 try{
  wines.push(...test);
  save();
  localStorage.setItem(key,'done');
  render();
  if(test.length)notify(test.length+' flasker fra foto tilføjet');
 }catch(e){wines=wines.filter(w=>!test.some(t=>t.id===w.id));alert('Import mislykkedes: '+e.message)}
}
window.importPhotoExamplesOnce=importOnce;
})();
