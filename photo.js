// Gratis, lokal tekstgenkendelse. Ikke en produktdatabase eller sikker vinidentifikation.
(function(){
const btn=document.createElement('button');btn.className='btn ghost';btn.textContent='📷 Scan etiket';btn.type='button';
document.querySelector('#manual-tools-buttons').append(btn);
const upload=document.createElement('input');upload.type='file';upload.accept='image/*';upload.setAttribute('capture','environment');upload.hidden=true;document.body.append(upload);
btn.onclick=()=>upload.click();
function loadScript(){return new Promise((resolve,reject)=>{if(window.Tesseract)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Kunne ikke indlæse tekstgenkendelse'));document.head.append(s)})}
upload.onchange=async()=>{const file=upload.files?.[0];upload.value='';if(!file)return;
btn.disabled=true;btn.textContent='Læser etiketten…';
try{await loadScript();const worker=await Tesseract.createWorker('eng');let result;
try{result=await worker.recognize(file)}finally{await worker.terminate()}
const lines=result.data.text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const joined=lines.join(' ');const match=joined.match(/\b(19[5-9]\d|20\d{2})\b/);
openEditor();
const f=document.getElementById('form');
f.elements.producer.value=(lines[0]||'').slice(0,100);
f.elements.name.value=(lines.slice(1,3).join(' ')||lines[0]||'').slice(0,120);
f.elements.year.value=match?match[0]:'';
const low=joined.toLowerCase();
if(/champagne/.test(low)){f.elements.type.value='Champagne';f.elements.country.value='Frankrig';f.elements.region.value='Champagne'}
else if(/sauternes/.test(low)){f.elements.type.value='Dessertvin';f.elements.country.value='Frankrig';f.elements.region.value='Sauternes'}
else if(/rioja/.test(low)){f.elements.type.value='Rødvin';f.elements.country.value='Spanien';f.elements.region.value='Rioja'}
const extra=document.getElementById('scan-result');if(extra)extra.remove();
const pre=document.createElement('div');pre.id='scan-result';pre.className='wide';pre.style.cssText='background:#29362d;border-radius:8px;padding:12px;white-space:pre-wrap;font-size:12px';
pre.textContent='Foreslåede felter fra foto – RET OG GODKEND INDEN GEM.\nLæst tekst:\n'+(result.data.text||'Ingen tekst fundet').slice(0,1200);
f.prepend(pre);notify('Kontrollér vinens oplysninger før du gemmer');
}catch(e){alert('Billedet kunne ikke læses: '+e.message)}finally{btn.disabled=false;btn.textContent='📷 Scan etiket'}
};
document.getElementById('add').addEventListener('click',()=>document.getElementById('scan-result')?.remove());
})();
