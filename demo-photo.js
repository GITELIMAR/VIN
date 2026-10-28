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
const utils=document.querySelector('.utility');
if(!utils)return;
const add=document.createElement('button');
add.textContent='🍾 Indsæt 7 testflasker fra foto';
add.title='Læg de syv identificerede flasker ind som testdata, uden at erstatte dine egne vine';
const remove=document.createElement('button');
remove.textContent='Fjern 7 testflasker';
remove.title='Fjern kun testdata fra dette foto';
utils.append(add,remove);
const getTests=()=>wines.filter(w=>w.demoPhotoBatch===batch);
add.onclick=()=>{
 if(getTests().length){notify('Testflaskerne er allerede indsat');return;}
 const test=entries.map(([producer,name,year,type],i)=>({
 id:'c85eab34-0f48-4c62-a8c2-'+String(100000000001+i),
 producer,name,year,type,country:'Frankrig',region:'Champagne',count:1,rating:null,
 from:null,to:null,notes:'TESTFLASKE fra foto · kontrollér producent, cuvée og årgang.',tasted:'',
 demoPhotoBatch:batch
 }));
 wines.push(...test);
 try{save();render();notify('7 testflasker tilføjet')}catch(e){wines=wines.filter(w=>w.demoPhotoBatch!==batch);alert('Kunne ikke gemme testflaskerne: '+e.message)}
};
remove.onclick=()=>{
 const n=getTests().length;
 if(!n){notify('Ingen testflasker at fjerne');return;}
 if(!confirm('Fjern de '+n+' testflasker fra billedet? Dine andre vine bevares.'))return;
 const old=wines.slice();
 wines=wines.filter(w=>w.demoPhotoBatch!==batch);
 try{save();render();notify(n+' testflasker fjernet')}catch(e){wines=old;alert('Kunne ikke slette: '+e.message)}
};
})();
