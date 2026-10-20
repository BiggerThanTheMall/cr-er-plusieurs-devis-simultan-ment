// ==UserScript==
// @name         Modulr - Devis en masse Fetch (beta)
// @namespace    https://github.com/BiggerThanTheMall/cr-er-plusieurs-devis-simultan-ment
// @version      2.0.0-beta.5
// @description  Creation de devis sur la session Modulr de chaque collaborateur, sans cookies integres.
// @match        https://courtage.modulr.fr/fr/scripts/clients/clients_card.php*
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  const TYPES = [["2 roues",20],["Animaux",58],["Assurance scolaire",49],["Assurance Vie",53],["Assurance voyage",8],["Audit Assurance Global",40],["Automobile",2],["Dommage ouvrage",10],["Emprunteur",26],["Epargne Salariale",60],["Extension santé - Renfort ou Ayant Droit",52],["Flotte auto",6],["Flotte immeubles",7],["Habitation principale",1],["Habitation secondaire",11],["Marchandises transportées",13],["MRC",30],["MRH",3],["MRI",29],["MRP",41],["Perte d'exploitation",14],["PJ",15],["PNO",23],["Prévoyance collective C",28],["Prévoyance collective EP",48],["Prévoyance collective NC",47],["Prévoyance Décès",38],["Prévoyance Frais Généraux Permanents (FGP)",35],["Prévoyance Garantie Accident de la Vie",32],["Prévoyance Homme Clé",36],["Prévoyance Indemnité Journalière Hospitalisation (IJH)",34],["Prévoyance Individuelle TNS",27],["Prévoyance Mandataire Sociale",37],["Prévoyance Obsèques",33],["Rapatriement (GRC)",44],["RC Batiment",55],["RC constructeur",16],["RC décennale",17],["RC des dirigeants",18],["RC Marchandise",42],["RC PRO",25],["RC Terrain",62],["RC Vie privée",24],["RCMS",61],["Retraite",50],["Santé collective C",45],["Santé collective EP",46],["Santé collective NC",19],["Santé Individuelle Particulier",5],["Santé Individuelle TNS",39],["Surcomplémentaire Santé",43],["Surcomplémentaire Santé Non Résponsable",56],["TRC - Tous risques chantier",51],["Vie",9],["ZZZ_Biennale",57],["ZZZ_Libre2",21],["ZZZ_Libre3",54],["ZZZ_Libre4",4],["ZZZ_Libre5",12],["ZZZ_Libre6",22]];
  const BINOMES = [['', 'Aucun'], ['138','Eddy'],['144','Ghais'],['141','Jake'],['217','Louli'],['139','Nadia'],['163','Youness'],['140','ZZZ_Faicel'],['142','ZZZ_Inssaf'],['143','ZZZ_Wesley']];
  const REFERENTS = [['','Aucun'],['33','Doryan KALAH'],['23','Eddy KALAH'],['24','Ghais Kalah'],['28','Jake CASIMIR'],['36','Louli VULLIOD-PIN'],['22','Nadia KALAH'],['2','Sheana KRIEF'],['29','Wesley DAUX'],['39','Youness OUACHBAB']];
  const COMPANIES = [["67","+SIMPLE"],["41","2MA"],["80","ACPS"],["43","ACS AMI"],["35","ADD VALUE"],["37","AFI ESCA"],["50","AGIS"],["2","ALLIANZ"],["48","ALPTIS"],["90","AMY UNDERWRITING"],["49","APICIL"],["59","APIVIA"],["3","APRIL"],["51","AS SOLUTION"],["62","ASAF AFPS"],["54","ASSURMAX"],["38","AVANTAGE"],["5","AXA"],["83","AXA Juridica"],["104","AXECE"],["105","AXECE"],["31","Ami 3F"],["76","BROKOLI"],["100","CAMACTE"],["53","CARMINE"],["75","CBA"],["91","CEGEMA"],["45","CFDP"],["65","CIEL ASSURANCES"],["101","CO-COURTAGE ALDEA"],["97","Colonna Partners"],["34","Coverity"],["82","DAMAN Assurances"],["103","DIF ASSURANCE"],["44","DIGITAL INSURE"],["86","EDIFICA"],["56","ENTORIA"],["89","Eres Group"],["33","FMA"],["92","Fil Assistance"],["4","GENERALI"],["94","GENERALI - CO-COURTAGE YACINE ACHAHDI"],["78","HELVETIA"],["63","HENNER"],["85","Help Courtage"],["39","Heomi"],["40","IASSURE"],["88","ILONA"],["81","KASE"],["47","KOLBAT (ex RCDPRO)"],["36","LABALETTE"],["102","MATRISK"],["46","MAXANCE"],["52","METLIFE"],["84","MFA"],["95","MILA"],["72","MONDIAL CARE"],["70","MUTUELLE MIEUX ETRE"],["71","Malakoff"],["55","NEOLIANE"],["32","NOVELIA"],["29","Netvox"],["74","ODDO"],["93","ORUS"],["68","REGIS CO-COURTIER - ALLIANZ"],["61","REPAM"],["30","SANTIANE neoliane"],["64","SOLLY AZAR"],["99","SPRING"],["57","SPVIE"],["9","SWISS LIFE"],["107","Santé Vet'"],["98","Stoïk"],["66","TETRIS"],["79","UNICED"],["42","UNIM"],["73","VIE PLUS"],["69","YSA SOLUTIONS"],["77","ZENIOO"],["58","ZEPHIR"]];
  const STATUTS = [['current','En cours'],['pricing','En tarification'],['delivered','Remis'],['canceled','Sans suite'],['refused','Refus'],['pending_approval','En attente de validation'],['pending_parts','En attente de pièce']];
  const $ = (sel, parent=document) => parent.querySelector(sel);
  const escapeHTML = v => String(v).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const clientId = new URL(location.href).searchParams.get('id');
  if (!clientId || !/^\d+$/.test(clientId)) return;
  let busy = false, stop = false, rows = [], companyCache = new Map();
  const today = () => { const d = new Date(); return [String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('/'); };
  const options = (list, v='') => list.map(([id,label]) => '<option value="'+escapeHTML(id)+'"'+(String(id)===String(v)?' selected':'')+'>'+escapeHTML(label)+'</option>').join('');
  const style=document.createElement('style');
  style.textContent=`
#devis-fetch-overlay{backdrop-filter:blur(2px)}
#devis-fetch-overlay>section{box-sizing:border-box;display:flex;flex-direction:column;gap:12px!important;width:min(1250px,96vw)!important;height:min(90vh,950px)!important;padding:24px!important;border-radius:14px!important;box-shadow:0 22px 70px #0004;overflow:hidden!important}
#devis-fetch-overlay h2{margin:0 0 5px;font-size:22px;font-weight:650;color:#173b55}
#devis-fetch-overlay p{margin:0;color:#64748b}
#devis-fetch-overlay input:not([type=checkbox]),#devis-fetch-overlay select{box-sizing:border-box;border:1px solid #d6dee7;background:#fff;border-radius:7px;padding:9px 11px;color:#26394b;min-width:0}
#devis-fetch-overlay button{border:1px solid #c8d4df;border-radius:7px;background:#f7f9fc;color:#294b63;padding:9px 13px;font-weight:600;cursor:pointer}
#devis-fetch-overlay button:hover{background:#eaf2f7}
#devis-fetch-overlay #df-run{background:#216389;color:white;border-color:#216389}
#devis-fetch-overlay #df-types{border:1px solid #e0e7ef;border-radius:10px;min-height:110px;max-height:175px!important;padding:12px;align-content:start;gap:9px!important;overscroll-behavior:contain}
#devis-fetch-overlay #df-types label{display:flex;gap:8px;align-items:center;padding:7px 9px;background:#f6f9fc;border-radius:6px;font-size:12px!important;min-height:18px;cursor:pointer}
#devis-fetch-overlay #df-types label:hover{background:#e9f2f8}
#devis-fetch-overlay .df-table-wrap{min-height:130px;flex:1;overflow:auto;overscroll-behavior:contain;border:1px solid #dce5ee;border-radius:10px}
#devis-fetch-overlay table{min-width:860px;border-collapse:separate!important;border-spacing:0}
#devis-fetch-overlay th{position:sticky;top:0;z-index:1;text-align:left;background:#eaf1f6;padding:12px;color:#37516a;font-size:12px}
#devis-fetch-overlay td{padding:10px 7px;border-top:1px solid #e9eef3;vertical-align:middle;font-size:12px}
#devis-fetch-overlay td select{width:100%;max-width:100%}
#devis-fetch-overlay tr:nth-child(even) td{background:#f9fbfc}
#devis-fetch-overlay #df-log{flex:0 0 auto;max-height:105px!important;min-height:35px;overflow:auto;border-radius:8px;margin:0!important}
#devis-fetch-overlay .df-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
#devis-fetch-overlay .df-confirm{padding:6px 0}
@media(max-width:850px){#devis-fetch-overlay #df-types{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
`;
  document.head.appendChild(style);
  const picked=new Set();
  const setOptions = (sel,list,val) => { sel.innerHTML=options(list,val); };
  const modal = document.createElement('div');
  modal.id = 'devis-fetch-overlay';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:#0008;z-index:2147483000;align-items:center;justify-content:center;font-family:Arial,sans-serif';
  modal.innerHTML = '<section style="background:white;width:min(1250px,96vw);height:min(90vh,950px);overflow:auto;padding:18px;border-radius:8px;color:#243745"><h2>Creation de devis en masse - Fetch (beta)</h2><p>Chaque devis est cree dans votre session Modulr. Ne pas lancer simultanement deux creations pour le meme client.</p><input id="df-search" placeholder="Rechercher un produit" style="padding:8px;width:95%"><div id="df-types" style="max-height:145px;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:12px 0"></div><div style="overflow:auto"><table style="width:100%;border-collapse:collapse" id="df-table"></table></div><p><button id="df-add" type="button">Ajouter les produits coches</button> <button id="df-all" type="button">Tout cocher (filtre)</button></p><div style="margin:12px 0"><label><input type="checkbox" id="df-confirm"> Je confirme la creation reelle des devis selectionnes</label></div><button id="df-run" type="button">Creer les devis</button> <button id="df-stop" type="button">Interrompre apres le devis en cours</button> <button id="df-close" type="button">Fermer</button><pre id="df-log" style="white-space:pre-wrap;max-height:180px;overflow:auto;background:#f3f5f7;padding:10px"></pre></section>';
  document.body.appendChild(modal);
  const section=modal.firstElementChild;
  const heading=section.querySelector('h2'); heading.textContent='Création de devis en masse';
  section.querySelector('p').textContent='Sélectionnez vos produits, puis définissez le référent, le binôme et la compagnie pour chaque devis.';
  const table=$('#df-table',modal), tableWrap=table.parentElement; tableWrap.classList.add('df-table-wrap');
  const add=$('#df-add',modal), all=$('#df-all',modal);
  const addBar=document.createElement('div');addBar.className='df-actions';add.parentElement.replaceWith(addBar);addBar.append(all);
  all.textContent='Tout sélectionner (filtre)';
  const clear=document.createElement('button');clear.type='button';clear.textContent='Tout désélectionner';addBar.append(clear);
  const global=document.createElement('div');global.className='df-actions';global.style.cssText='padding:10px 12px;background:#f2f7fa;border:1px solid #dae6ef;border-radius:8px';
  global.innerHTML='<strong style="margin-right:9px">Appliquer à tous</strong> <label>État <select id="df-global-status"></select></label> <label>Référent <select id="df-global-referent"></select></label> <label>Binôme <select id="df-global-binome"></select></label> <label>Compagnie <select id="df-global-company"></select></label>';
  tableWrap.before(global);
  setOptions($('#df-global-status',modal),[['','Sans changement'],...STATUTS],'');
  setOptions($('#df-global-referent',modal),REFERENTS,'');
  setOptions($('#df-global-binome',modal),BINOMES,'');
  setOptions($('#df-global-company',modal),[['','Sans changement'],...COMPANIES],'');
  for(const [id,key] of [['df-global-status','status'],['df-global-referent','referent'],['df-global-binome','binome'],['df-global-company','company']]){
    $('#'+id,modal).onchange=e=>{if(!e.target.value)return;rows.forEach(r=>r[key]=e.target.value);renderRows();};
  }
  clear.onclick=()=>{rows=[];picked.clear();renderTypes();renderRows();};
  all.onclick=()=>{$('#df-types',modal).querySelectorAll('.df-type').forEach(el=>{picked.add(el.value);el.checked=true;});syncRows();};
  
  $('#df-confirm',modal).closest('div').classList.add('df-confirm');
  const run=$('#df-run',modal), halt=$('#df-stop',modal), close=$('#df-close',modal);
  const actions=document.createElement('div');actions.className='df-actions';run.before(actions);actions.append(run,halt,close);
  const search=$('#df-search',modal);search.placeholder='Rechercher un type de devis...';search.style.width='100%';
  const log = s => { $('#df-log',modal).textContent += s+'\n'; };
  function renderTypes() {
    const search = $('#df-search',modal).value.toLowerCase();
    $('#df-types',modal).innerHTML = TYPES.filter(x=>x[0].toLowerCase().includes(search)).map(([label,id])=>'<label style="font-size:12px"><input type="checkbox" class="df-type" value="'+id+'" '+(picked.has(String(id))?'checked':'')+'> '+escapeHTML(label)+'</label>').join('');
    $('#df-types',modal).querySelectorAll('.df-type').forEach(el=>el.onchange=()=>{
      if(el.checked)picked.add(el.value);else picked.delete(el.value);
      syncRows();
    });
  }
  function syncRows(){
    rows=rows.filter(r=>picked.has(r.id));
    TYPES.forEach(([label,id])=>{if(picked.has(String(id))&&!rows.some(r=>r.id===String(id)))rows.push({id:String(id),label,status:'current',referent:'',binome:'',company:''});});
    renderRows();
  }
  function renderRows() {
    $('#df-table',modal).innerHTML = '<thead><tr><th>Produit</th><th>Etat</th><th>Referent</th><th>Binome</th><th>Compagnie</th><th></th></tr></thead><tbody>'+rows.map((r,i)=>'<tr data-i="'+i+'"><td>'+escapeHTML(r.label)+'</td><td><select data-key="status">'+options(STATUTS,r.status)+'</select></td><td><select data-key="referent">'+options(REFERENTS,r.referent)+'</select></td><td><select data-key="binome">'+options(BINOMES,r.binome)+'</select></td><td><select data-key="company">'+options([['','Aucune compagnie'],...COMPANIES],r.company)+'</select></td><td><button data-remove="'+i+'" type="button">Retirer</button></td></tr>').join('')+'</tbody>';
    $('#df-table',modal).querySelectorAll('select[data-key]').forEach(sel=>{
      const index=Number(sel.closest('tr').dataset.i), key=sel.dataset.key;
      sel.onchange=()=>{rows[index][key]=sel.value;};
    });
    $('#df-table',modal).querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const removed=rows[Number(b.dataset.remove)];picked.delete(removed.id);rows.splice(Number(b.dataset.remove),1);renderTypes();renderRows();});
    rows.forEach((r,i)=>loadCompanies(r).then(list=>{
      if(rows[i]!==r)return;
      const sel=$('#df-table tr[data-i="'+i+'"] select[data-key="company"]',modal);
      if(sel) {setOptions(sel,[['','Aucune compagnie'],...list],r.company); sel.onchange=()=>r.company=sel.value;}
    }).catch(err=>{const sel=$('#df-table tr[data-i="'+i+'"] select[data-key="company"]',modal);if(sel){setOptions(sel,[['','Aucune compagnie'],...COMPANIES],r.company);sel.onchange=()=>r.company=sel.value;}log('Compagnies '+r.label+' : liste de secours utilisée'); }));
  }
  async function loadCompanies(row) {
    if(companyCache.has(row.id)) return companyCache.get(row.id);
    const response=await fetch('/fr/scripts/companies_product_types/companies_product_types_get_companies.php',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({product_type_id:row.id})
    });
    if(!response.ok)throw Error('Chargement compagnies HTTP '+response.status);
    const body=await response.text();
    let companies=[];
    const html=new DOMParser().parseFromString(body,'text/html');
    const inputs=Array.from(html.querySelectorAll('input[name="companies[]"]'));
    if(inputs.length) {
      companies=inputs.map(input=>{
        const label=html.querySelector('label[for="'+input.id+'"]');
        return [String(input.value), (label?.textContent||input.closest('label')?.textContent||'').trim()];
      }).filter(item=>item[0]&&item[1]);
    } else {
      try {
        let json=JSON.parse(body);
        if(typeof json==='string'){const temp=new DOMParser().parseFromString(json,'text/html');companies=Array.from(temp.querySelectorAll('input[name="companies[]"]')).map(el=>[el.value,temp.querySelector('label[for="'+el.id+'"]')?.textContent?.trim()||'']).filter(x=>x[0]&&x[1]);}
        if(typeof json==='object' && typeof json.html==='string'){const temp=new DOMParser().parseFromString(json.html,'text/html');companies=Array.from(temp.querySelectorAll('input[name="companies[]"]')).map(el=>[el.value,temp.querySelector('label[for="'+el.id+'"]')?.textContent?.trim()||'']).filter(x=>x[0]&&x[1]);}
        const source=Array.isArray(json)?json:Array.isArray(json.companies)?json.companies:Array.isArray(json.data)?json.data:null;
        if(source)companies=source.map(x=>[String(x.id??x.company_id??x.value??''),String(x.name??x.company_name??x.label??'')]).filter(x=>x[0]&&x[1]);
      } catch {}
    }
    if(!companies.length)companies=COMPANIES;
    companyCache.set(row.id,companies);
    return companies;
  }
  async function createOne(row) {
    // Charger une vraie page de creation pour conserver les champs caches et valeurs propres a la session.
    const path='/fr/scripts/estimates/estimates_manage.php?client_id='+encodeURIComponent(clientId)+'&estimate_id=0';
    const page=await fetch(path,{credentials:'same-origin'});
    if(!page.ok)throw Error('Formulaire HTTP '+page.status);
    const doc=new DOMParser().parseFromString(await page.text(),'text/html');
    const form=Array.from(doc.forms).find(f=>f.querySelector('[name="estimate[product_type_id]"]'));
    if(!form)throw Error('Formulaire de creation introuvable (connexion expiree ?)');
    const data=new FormData(form);
    const set=(key,val)=>{data.set(key,String(val));};
    set('mcut',data.get('mcut')||'');
    set('action','send');set('estimate[estimate_id]','');set('estimate[client_id]',clientId);
    set('estimate[product_type_id]',row.id);set('selectItemestimate[product_type_id]',row.id);
    set('estimate[status]',row.status);set('selectItemestimate[status]',row.status);
    set('estimate[referent_user_id]',row.referent);set('selectItemestimate[referent_user_id]',row.referent);
    set('estimate[custom_12]',row.binome);set('selectItemestimate[custom_12]',row.binome);
    set('estimate[input_date]',today());set('estimate[custom_14]',today());
    data.delete('companies[]'); if(row.company)data.append('companies[]',row.company);
    // La requete observee est urlencoded ; conserver tous les noms de champs repetes.
    const params=new URLSearchParams();
    for(const [k,v] of data.entries()) {if(typeof v!=='string')throw Error('Champ fichier non gere');params.append(k,v);}
    // Le POST observe utilise client_id=0 et estimate_id=0 dans l'URL ; conserver l'action originale si presente.
    const target=new URL(form.getAttribute('action')||'/fr/scripts/estimates/estimates_manage.php?client_id=0&estimate_id=0',page.url);
    if(target.origin!==location.origin||!target.pathname.endsWith('/estimates_manage.php'))throw Error('Destination de formulaire inattendue');
    const response=await fetch(target.href,{method:'POST',credentials:'same-origin',redirect:'follow',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params});
    if(!response.ok)throw Error('Enregistrement HTTP '+response.status);
    const resultUrl=new URL(response.url,location.href);
    const match=resultUrl.searchParams.get('open')?.match(/^element_toggle_estimate_(\d+)$/);
    if(!match)throw Error('Enregistrement non confirme : verifier la fiche client avant toute relance');
    const resultId=match[1];
    if(resultUrl.searchParams.get('id')!==clientId)throw Error('Retour vers mauvais client');
    return resultId;
  }
  $('#df-search',modal).oninput=renderTypes;
  $('#df-close',modal).onclick=()=>{if(!busy)modal.style.display='none';};
  $('#df-stop',modal).onclick=()=>{stop=true;log('Interruption demandee.');};
  $('#df-run',modal).onclick=async()=>{
    if(busy||!$('#df-confirm',modal).checked||!rows.length)return alert('Selectionner des devis et confirmer leur creation.');
    // Modulr autorise l'absence de compagnie : ne pas bloquer l'ensemble du lot.
    if(!confirm('Creer '+rows.length+' nouveau(x) devis sur la fiche client '+clientId+' ?'))return;
    busy=true;stop=false;let success=0;const copy=rows.map(x=>({...x}));
    try {for(const row of copy){if(stop)break;log('Creation : '+row.label);
      try {const id=await createOne(row);success++;log('Cree : '+row.label+' - devis '+id);}
      catch(err) {log('A verifier : '+row.label+' - '+err.message);log('Arret de securite pour eviter les doublons.');break;}
    }}finally {busy=false;log('Termine : '+success+'/'+copy.length+' confirms. Actualiser la fiche client pour verifier.');}
  };
  renderTypes();
  function install() {if($('#devis-fetch-trigger'))return;const button=document.createElement('button');button.id='devis-fetch-trigger';button.type='button';button.textContent='Devis en masse (Fetch beta)';button.style.cssText='padding:8px 12px;margin:8px;background:#215c7f;color:white;border:0;cursor:pointer;border-radius:4px';button.onclick=()=>{modal.style.display='flex';};const place=document.querySelector('.entity_info_block_1')||document.body;place.prepend(button);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
