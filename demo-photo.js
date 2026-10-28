'use strict';
(function(){
const batch='chatgpt-foto-test-2026-10-28';
// Vinmæssige skøn pr. oktober 2026, ikke producentgaranterede udløbsdatoer.
// NV-flaskers optimale vindue afhænger især af degorgeringsdato og opbevaring.
const windows=[
 [2026,2029,'Almindelig non-vintage Brut. Drik gerne nu; estimat afhænger af dégorgement.'],
 [2026,2030,'Blanc de Blancs Grand Cru. Anslået vindue, da dégorgement er ukendt.'],
 [2026,2031,'Fyldig Grand Cru Nuance med reservevine. Drikkeklar nu.'],
 [2026,2029,'Origin Brut non-vintage. Bedst vurderet til at nyde relativt ung.'],
 [2026,2031,'Black Jackets: anslået ekstra gemmepotentiale, afhænger af flaskens dégorgement.'],
 [2026,2034,'Special Club 2016: moden nu, sandsynligvis videre udvikling ved god opbevaring. Bekræft årgang på flasken.'],
 [2026,2031,'Special Club 2008: moden Champagne, som bør prioriteres i den kommende årrække.']
];
const critic=[
 {score:88,source:'Wine Enthusiast',kind:'anmeldelse',url:'https://www.wineenthusiast.com/buying-guide/charlier-fils-nv-brut-carte-noire-champagne/',context:'Anmeldt NV-aftapning 2017; flaskens dégorgement kan afvige.'},
 {low:89,high:92,source:'ChatGPT',kind:'estimat',context:'Kvalitetsinterval, ikke offentliggjort anmelderpoint; præcis cuvée bør verificeres.'},
 {low:90,high:93,source:'ChatGPT',kind:'estimat',context:'Skøn baseret på stil og producent, ikke en blindsmagning.'},
 {low:89,high:92,source:'ChatGPT',kind:'estimat',context:'Skøn baseret på cuvée og stil, ikke en blindsmagning.'},
 {low:91,high:94,source:'ChatGPT',kind:'estimat',context:'2014-udgaven fik 93 fra Wine Enthusiast, men denne flaskes årgang er ukendt.'},
 {low:92,high:95,source:'ChatGPT',kind:'estimat',context:'Årgang 2016 er ikke sikkert aflæst. Ingen verificeret Parker-score.'},
 {score:96,source:'Houlbergs Vinblog',kind:'anmeldelse',url:'https://houlberg.it/?p=116504',context:'Houlbergs anmeldelse af Charlier & Fils Spécial Club 2008.'}
];
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
 from:windows[i][0],to:windows[i][1],notes:'Anslået drikkevindue: '+windows[i][2],tasted:'',drinkWindowSource:'ChatGPT-skøn 2026',
 critic:critic[i],demoPhotoBatch:batch
 })).filter(w=>!existing.has(w.id));
 try{
  wines.push(...test);
  save();
  localStorage.setItem(key,'done');
  render();
  if(test.length)notify(test.length+' flasker fra foto tilføjet');
 }catch(e){wines=wines.filter(w=>!test.some(t=>t.id===w.id));alert('Import mislykkedes: '+e.message)}
}
function enrichExisting(){
 let updated=0;
 for(const w of wines){
 if(typeof w.notes==='string'){
 const cleaned=w.notes
  .split('TESTFLASKE fra foto · ').join('')
  .split('kontrollér producent, cuvée og årgang. · ').join('')
  .split('Kontrollér producent, cuvée og årgang. · ').join('')
  .split('kontrollér producent, cuvée og årgang.').join('')
  .split('Kontrollér producent, cuvée og årgang.').join('')
  .replace(/^(\\s*·\\s*)+|(\\s*·\\s*)+$/g,'').trim();
 if(cleaned!==w.notes){w.notes=cleaned;updated++;}
}

 const ix=entries.findIndex(([producer,name,year])=>producer.toLowerCase()===String(w.producer).toLowerCase()&&name.toLowerCase()===String(w.name).toLowerCase()&&(year??null)===(w.year??null));
 if(ix<0)continue;
 if(!w.critic){w.critic=critic[ix];updated++}
 if(w.from!=null||w.to!=null)continue;
 w.from=windows[ix][0];w.to=windows[ix][1];
 w.drinkWindowSource='ChatGPT-skøn 2026';
 w.notes=[w.notes,'Anslået drikkevindue: '+windows[ix][2]].filter(Boolean).join(' · ');
 updated++;
 }
 if(updated){save();render();}
 return updated;
}
window.importPhotoExamplesOnce=()=>{importOnce();enrichExisting()};
})();
