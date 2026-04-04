import { FIREBASE_CONFIG, USER_ID } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, doc,
  getDocs, setDoc, deleteDoc, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ══════════════════════════════════════════════════
//  CONSTANTES
// ══════════════════════════════════════════════════
const SUELDO   = 1130;
const LOCAL_KEY = 'mf_v6';

const TARJ = {
  oh:        { n:'Tarjeta Oh',     normal:9,  urgente:3,  cls:'oh', ac:'var(--oh)' },
  interbank: { n:'Interbank',      normal:19, urgente:15, cls:'ib', ac:'var(--ib)' },
  saga:      { n:'Saga Falabella', normal:9,  urgente:1,  cls:'sg', ac:'var(--sg)' },
  bbva:      { n:'BBVA',           normal:9,  urgente:5,  cls:'bv', ac:'var(--bv)' },
};
const PERSONAS = { yo:'Yo', mama:'Mamá', anny:'Anny', hnaanny:'Hna. de Anny', carlos:'Carlos', otro:'Otro' };
const P_COLORS = { yo:'var(--gr)', mama:'var(--pk)', anny:'var(--bl)', hnaanny:'#818cf8', carlos:'var(--ye)', otro:'var(--pu)' };
const P_BADGE  = { yo:'byo', mama:'bmm', anny:'ban', hnaanny:'bha', carlos:'bca', otro:'bot' };
const PAGO_NAMES = { oh:'Oh', interbank:'Interbank', saga:'Saga', bbva:'BBVA', efectivo:'Efectivo', yape:'Yape', transferencia:'Transfer.' };
const PAGO_BADGE = { oh:'boh', interbank:'bib', saga:'bsg', bbva:'bbv', efectivo:'bef', yape:'byp', transferencia:'btr' };

// ══════════════════════════════════════════════════
//  FIREBASE SETUP
// ══════════════════════════════════════════════════
let db_fire = null;
let USE_FIREBASE = false;

const configOk = FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes('PEGA_AQUI');

if (configOk) {
  try {
    const app = initializeApp(FIREBASE_CONFIG);
    db_fire = getFirestore(app);
    USE_FIREBASE = true;
  } catch(e) {
    console.warn('Firebase init failed:', e.message);
  }
}

// ══════════════════════════════════════════════════
//  CAPA DE DATOS (Firebase + localStorage en paralelo)
// ══════════════════════════════════════════════════
function readLocal() {
  try { const r = localStorage.getItem(LOCAL_KEY); return r ? JSON.parse(r) : { gastos:[], ingresos:[] }; }
  catch(e) { return { gastos:[], ingresos:[] }; }
}
function writeLocal(d) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch(e) {}
}

async function loadAll() {
  if (!USE_FIREBASE) return readLocal();
  try {
    setSdot('syn');
    const [gsSnap, isSnap] = await Promise.all([
      getDocs(collection(db_fire, `users/${USER_ID}/gastos`)),
      getDocs(collection(db_fire, `users/${USER_ID}/ingresos`))
    ]);
    const gastos   = gsSnap.docs.map(d => ({ ...d.data() }));
    const ingresos = isSnap.docs.map(d => ({ ...d.data() }));
    // Arreglar historial faltante
    gastos.forEach(g => { if (g.deuda && !g.deuda.historial) g.deuda.historial = []; });
    const data = { gastos, ingresos };
    writeLocal(data);
    setSdot('ok');
    return data;
  } catch(e) {
    console.error('Firebase load error:', e);
    setSdot('err');
    toast('Sin conexión — usando datos locales', 'ye');
    return readLocal();
  }
}

async function saveGastoRec(g) {
  const local = readLocal();
  const idx = local.gastos.findIndex(x => x.id === g.id);
  if (idx >= 0) local.gastos[idx] = g; else local.gastos.push(g);
  writeLocal(local);
  if (USE_FIREBASE) {
    try {
      setSdot('syn');
      await setDoc(doc(db_fire, `users/${USER_ID}/gastos`, String(g.id)), g);
      setSdot('ok');
    } catch(e) { setSdot('err'); console.error(e); }
  }
}

async function saveIngresoRec(i) {
  const local = readLocal();
  const idx = local.ingresos.findIndex(x => x.id === i.id);
  if (idx >= 0) local.ingresos[idx] = i; else local.ingresos.push(i);
  writeLocal(local);
  if (USE_FIREBASE) {
    try {
      setSdot('syn');
      await setDoc(doc(db_fire, `users/${USER_ID}/ingresos`, String(i.id)), i);
      setSdot('ok');
    } catch(e) { setSdot('err'); console.error(e); }
  }
}

async function delGasto(id) {
  const local = readLocal();
  local.gastos = local.gastos.filter(g => g.id !== id);
  writeLocal(local);
  if (USE_FIREBASE) {
    try { await deleteDoc(doc(db_fire, `users/${USER_ID}/gastos`, String(id))); }
    catch(e) { console.error(e); }
  }
}

async function delIngreso(id) {
  const local = readLocal();
  local.ingresos = local.ingresos.filter(i => i.id !== id);
  writeLocal(local);
  if (USE_FIREBASE) {
    try { await deleteDoc(doc(db_fire, `users/${USER_ID}/ingresos`, String(id))); }
    catch(e) { console.error(e); }
  }
}

// Cache en memoria
let C = { gastos: [], ingresos: [] };

// ══════════════════════════════════════════════════
//  UTILIDADES
// ══════════════════════════════════════════════════
function getMeses() {
  const n = new Date(), l = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
    l.push({
      v:  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      lb: d.toLocaleDateString('es-PE', { year:'numeric', month:'long' })
    });
  }
  return l;
}
const mesAct = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; };
const mesAnt = m => { const[y,mo]=m.split('-').map(Number); return `${mo===1?y-1:y}-${String(mo===1?12:mo-1).padStart(2,'0')}`; };
const mesSig = m => { const[y,mo]=m.split('-').map(Number); return `${mo===12?y+1:y}-${String(mo===12?1:mo+1).padStart(2,'0')}`; };
const mesLb  = v => new Date(v+'-02').toLocaleDateString('es-PE',{year:'numeric',month:'long'});
const fmt    = n => 'S/ '+parseFloat(n||0).toFixed(2);
const today  = () => new Date().toISOString().slice(0,10);
const dayNow = () => new Date().getDate();
const esc    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function getFechaLimite(tarjeta, mesF) {
  if (!TARJ[tarjeta]) return '';
  const sig = mesSig(mesF);
  const [y,m] = sig.split('-').map(Number);
  return `${y}-${String(m).padStart(2,'0')}-${String(TARJ[tarjeta].normal).padStart(2,'0')}`;
}
function diasHasta(f) {
  if (!f) return null;
  const h = new Date(); h.setHours(0,0,0,0);
  return Math.round((new Date(f+'T00:00:00') - h) / 864e5);
}
const urgColor = d => d===null?'var(--mu)':d<0||d<=3?'var(--re)':d<=7?'var(--ye)':'var(--gr)';
function urgLabel(d) {
  if (d===null) return '';
  if (d < 0)  return `Venció hace ${Math.abs(d)} día(s)`;
  if (d === 0) return '⚠ Vence HOY';
  if (d <= 3)  return `⚠ Vence en ${d} día(s)`;
  if (d <= 7)  return `Vence en ${d} días`;
  return `${d} días restantes`;
}

function setSdot(state) {
  const el = document.getElementById('sdot');
  if (!el) return;
  el.className = `sdot ${state}`;
  el.title = state==='ok'?'☁ Conectado a Firebase':state==='syn'?'Sincronizando...':state==='err'?'Sin conexión a la nube':'';
}

let _toastTimer;
function toast(msg, t='gr') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.display = 'block';
  const cs = { gr:['var(--gr-a)','var(--gr)','var(--gr-b)'], re:['var(--re-a)','var(--re)','var(--re-b)'], ye:['var(--ye-a)','var(--ye)','var(--ye-b)'] };
  const c = cs[t]||cs.gr;
  el.style.cssText += `background:${c[0]};color:${c[1]};border-color:${c[2]};animation:fadeUp .2s`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.style.display = 'none', 3000);
}

function initSelects() {
  const ms = getMeses(), cur = mesAct();
  ['fmg','fmi','fmb','fmt','fmd','fmm','ia-mes','cfg-mes'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = '';
    ms.forEach(m => { const o=document.createElement('option'); o.value=m.v; o.textContent=m.lb; if(m.v===cur)o.selected=true; el.appendChild(o); });
  });
  ['g-mesf','i-mes'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = '';
    ms.forEach(m => { const o=document.createElement('option'); o.value=m.v; o.textContent=m.lb; if(m.v===cur)o.selected=true; el.appendChild(o); });
  });
  document.getElementById('g-fecha').value = today();
  document.getElementById('g-hora').value  = new Date().toTimeString().slice(0,5);
  document.getElementById('i-f').value     = today();
  document.getElementById('pr-f').value    = today();
}

// Badge helpers
const bPago  = p => `<span class="b ${PAGO_BADGE[p]||'bef'}">${PAGO_NAMES[p]||p}</span>`;
const bQuien = (q,c) => `<span class="b ${P_BADGE[q]||'bot'}">${q==='otro'&&c?esc(c):(PERSONAS[q]||q)}</span>`;
const bStatus = st => ({ pagado:`<span class="b sp">✓ Pagado</span>`, parcial:`<span class="b ss">Parcial</span>`, pendiente:`<span class="b sn">Pendiente</span>` }[st]||'');

// ══════════════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════════════
window.show = function(id, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.tb').forEach(b => b.classList.remove('on'));
  document.getElementById('s-'+id).classList.add('on');
  btn.classList.add('on');
  // Scroll content to top
  document.querySelector('.content').scrollTo(0,0);
  const fns = { gastos:renderGastos, cobros:renderCobros, ingresos:renderIngresos, balance:renderBalance, tarjetas:renderTarjetas, mama:renderMama, cfg:renderCfg };
  if (fns[id]) fns[id]();
};

window.tog = (bid,aid) => {
  document.getElementById(bid).classList.toggle('on');
  document.getElementById(aid).classList.toggle('on');
};

window.prevI = (inp,prv) => {
  const i = document.getElementById(inp), p = document.getElementById(prv);
  if (i.files && i.files[0]) { const r=new FileReader(); r.onload=e=>{p.src=e.target.result;p.style.display='block'}; r.readAsDataURL(i.files[0]); }
};

window.openPM = src => { document.getElementById('pm-img').src=src; document.getElementById('pm').style.display='flex'; };
window.copyText = text => { navigator.clipboard?.writeText(text).then(()=>toast('Copiado ✓')); };

// ══════════════════════════════════════════════════
//  GASTOS
// ══════════════════════════════════════════════════
window.chkQuien = () => {
  document.getElementById('g-custom-box').style.display = document.getElementById('g-quien').value === 'otro' ? 'block' : 'none';
};

window.chkPago = () => {
  const pago = document.getElementById('g-pago').value;
  const mesF = document.getElementById('g-mesf').value;
  const info = document.getElementById('g-tar-info');
  if (TARJ[pago]) {
    const fl = getFechaLimite(pago, mesF);
    info.style.display = 'block';
    info.textContent = `${TARJ[pago].n} — Para no generar intereses, esta persona debe pagarte antes del ${fl} (día ${TARJ[pago].normal} del mes siguiente).`;
    document.getElementById('g-df').value = fl;
    document.getElementById('g-df-hint').textContent = `Fecha límite calculada: ${fl}`;
  } else {
    info.style.display = 'none';
  }
};

window.saveGasto = async () => {
  const desc  = document.getElementById('g-desc').value.trim();
  const monto = parseFloat(document.getElementById('g-monto').value);
  if (!desc || isNaN(monto) || monto <= 0) { toast('Completa descripción y monto','re'); return; }

  const btn = document.getElementById('g-btn');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const quien  = document.getElementById('g-quien').value;
  const custom = document.getElementById('g-custom').value.trim();
  const pago   = document.getElementById('g-pago').value;
  const mesF   = document.getElementById('g-mesf').value;
  const dt     = document.getElementById('g-dt').value;
  const dm     = parseFloat(document.getElementById('g-dm').value)||0;
  const mf     = document.getElementById('g-mf').value;
  const mm     = parseFloat(document.getElementById('g-mm').value)||0;
  const fpv    = document.getElementById('g-fpv');
  const foto   = fpv.style.display!=='none' && fpv.src.startsWith('data:') ? fpv.src : null;

  const tieneDeuda = dt !== 'no' && (dm > 0 || (dt === 'todo' && monto > 0));
  const montoDeuda = dt === 'todo' ? monto : dm;

  const gasto = {
    id:     Date.now(),
    fecha:  document.getElementById('g-fecha').value,
    hora:   document.getElementById('g-hora').value,
    desc, monto, quien, custom, pago, mesF,
    detalle: document.getElementById('g-det').value.trim(),
    foto,
    deuda: tieneDeuda ? {
      monto:         montoDeuda,
      fechaLimite:   document.getElementById('g-df').value || getFechaLimite(pago, mesF),
      formaEsperada: document.getElementById('g-dforma').value,
      pagado: 0, estado: 'pendiente', historial: []
    } : null,
    mama: mf && mm > 0 ? {
      forma: mf, monto: mm,
      uso:   document.getElementById('g-mu').value,
      nota:  document.getElementById('g-mn').value.trim()
    } : null
  };

  await saveGastoRec(gasto);
  C.gastos.push(gasto);

  // Reset form
  ['g-desc','g-monto','g-det','g-custom','g-mn'].forEach(id => document.getElementById(id).value = '');
  ['g-foto','g-mm','g-dm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('g-fpv').style.display = 'none';
  document.getElementById('g-fpv').src = '';
  document.getElementById('g-dt').value = 'no';
  document.getElementById('g-df').value = '';
  document.getElementById('g-mf').value = '';
  document.getElementById('g-tar-info').style.display = 'none';
  document.getElementById('g-hora').value = new Date().toTimeString().slice(0,5);
  btn.disabled = false; btn.textContent = '+ Registrar Gasto';

  renderGastos(); renderCobros();
  toast(`Gasto registrado${tieneDeuda ? ' + cobro pendiente' : ''} ✓`);
};

window.elimGasto = async id => {
  if (!confirm('¿Eliminar este gasto y su cobro asociado?')) return;
  await delGasto(id);
  C.gastos = C.gastos.filter(g => g.id !== id);
  renderGastos(); renderCobros(); renderBalance(); renderTarjetas();
  toast('Gasto eliminado');
};

function renderGastos() {
  const mes = document.getElementById('fmg')?.value;
  const qf  = document.getElementById('fqg')?.value;
  if (!mes) return;
  let gs = C.gastos.filter(g => g.mesF === mes);
  if (qf) {
    gs = qf === 'otro'
      ? gs.filter(g => !['yo','mama','anny','hnaanny','carlos'].includes(g.quien))
      : gs.filter(g => g.quien === qf);
  }
  gs.sort((a,b) => (b.fecha+b.hora||'').localeCompare(a.fecha+a.hora||''));

  const tot  = gs.reduce((a,g) => a+g.monto, 0);
  const tc   = gs.filter(g => TARJ[g.pago]).reduce((a,g) => a+g.monto, 0);
  const te   = gs.filter(g => !TARJ[g.pago]).reduce((a,g) => a+g.monto, 0);
  const cob  = gs.filter(g => g.deuda && g.deuda.estado !== 'pagado').reduce((a,g) => a+(g.deuda.monto-g.deuda.pagado), 0);

  document.getElementById('g-t').textContent   = fmt(tot);
  document.getElementById('g-tc').textContent  = fmt(tc);
  document.getElementById('g-te').textContent  = fmt(te);
  document.getElementById('g-cob').textContent = fmt(cob);

  const lista = document.getElementById('lista-g');
  if (!gs.length) { lista.innerHTML = '<div class="empty">Sin gastos en este mes</div>'; return; }

  lista.innerHTML = gs.map(g => {
    let dtag = '';
    if (g.deuda) {
      const pend = g.deuda.monto - g.deuda.pagado;
      const dias = diasHasta(g.deuda.fechaLimite);
      dtag = `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;align-items:center">
        ${bStatus(g.deuda.estado)}
        <span style="font-size:10px;font-weight:700;color:${urgColor(dias)}">${fmt(pend)} por cobrar · ${urgLabel(dias)}</span>
      </div>`;
    }
    return `<div class="row">
      <div class="ri">
        <div class="rt">${esc(g.desc)}</div>
        <div class="rm">${g.fecha} ${g.hora||''} ${bPago(g.pago)} ${bQuien(g.quien,g.custom)}</div>
        ${dtag}
        ${g.mama ? `<div style="font-size:10px;color:var(--pk);margin-top:2px">💗 Mamá dio ${fmt(g.mama.monto)} (${g.mama.forma})</div>` : ''}
        ${g.detalle ? `<div style="font-size:11px;color:var(--mu);margin-top:2px">${esc(g.detalle)}</div>` : ''}
      </div>
      <div class="row-actions">
        ${g.foto ? `<img src="${g.foto}" class="pt" onclick="openPM('${g.foto}')">` : ''}
        <div class="ra re">${fmt(g.monto)}</div>
        <div style="display:flex;gap:2px">
          <button class="ico ed" onclick="openEditGasto(${g.id})" title="Editar">✏</button>
          <button class="ico" onclick="elimGasto(${g.id})" title="Eliminar">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  COBROS
// ══════════════════════════════════════════════════
function renderCobros() {
  const mes = document.getElementById('fmd')?.value;
  const sf  = document.getElementById('fsd')?.value;
  if (!mes) return;

  const gastos = C.gastos.filter(g => g.deuda && g.mesF === mes);
  const totD = gastos.reduce((a,g) => a+g.deuda.monto, 0);
  const totP = gastos.reduce((a,g) => a+g.deuda.pagado, 0);
  document.getElementById('d-tot').textContent = fmt(totD);
  document.getElementById('d-cob').textContent = fmt(totP);
  document.getElementById('d-pen').textContent = fmt(totD - totP);

  // Llenar select de gasto específico
  const prSel = document.getElementById('pr-gid');
  prSel.innerHTML = '<option value="auto">Automático — gasto más antiguo primero</option>';
  gastos.filter(g => g.deuda.estado !== 'pagado').forEach(g => {
    const o = document.createElement('option');
    o.value = g.id;
    const nom = g.quien==='otro'&&g.custom ? g.custom : (PERSONAS[g.quien]||g.quien);
    o.textContent = `${g.fecha} · ${esc(g.desc)} · ${nom} debe ${fmt(g.deuda.monto-g.deuda.pagado)}`;
    prSel.appendChild(o);
  });

  // Agrupar por persona
  const grupos = {};
  gastos.forEach(g => {
    const k = g.quien + (g.custom ? ':'+g.custom : '');
    if (!grupos[k]) grupos[k] = { quien:g.quien, custom:g.custom, gastos:[] };
    grupos[k].gastos.push(g);
  });

  let entries = Object.entries(grupos);
  if (sf) entries = entries.map(([k,p]) => [k,{...p,gastos:p.gastos.filter(g=>g.deuda.estado===sf)}]).filter(([,p]) => p.gastos.length);

  const cont = document.getElementById('cobros-cont');
  if (!entries.length) { cont.innerHTML = '<div class="empty">Sin cobros en este mes</div>'; return; }

  const pNames = { mama:'💗 Mamá', anny:'Anny', hnaanny:'Hna. de Anny', carlos:'Carlos', yo:'Yo', otro:'Otro' };

  cont.innerHTML = entries.map(([k,p]) => {
    const totD2 = p.gastos.reduce((a,g) => a+g.deuda.monto, 0);
    const totP2 = p.gastos.reduce((a,g) => a+g.deuda.pagado, 0);
    const pen   = totD2 - totP2;
    const allPaid = pen <= 0;
    const anyPaid = totP2 > 0 && !allPaid;
    const cls   = allPaid ? 'ok' : anyPaid ? 'pa' : 'pe';
    const nombre = p.quien==='otro'&&p.custom ? p.custom : (pNames[p.quien]||p.quien);
    const col   = P_COLORS[p.quien]||'var(--mu)';
    const ini   = nombre.replace(/[^a-zA-Z]/g,'').charAt(0).toUpperCase() || '?';
    const masUrg = p.gastos.filter(g=>g.deuda.estado!=='pagado').map(g=>g.deuda.fechaLimite).filter(Boolean).sort()[0]||null;
    const diasUrg = diasHasta(masUrg);

    return `<div class="dc ${cls}">
      <div class="dch">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${col}22;color:${col}">${ini}</div>
          <div>
            <div style="font-weight:700;font-size:13px">${nombre}</div>
            <div style="font-size:10px;color:var(--mu)">${p.gastos.length} gasto(s) · Total: ${fmt(totD2)}</div>
          </div>
        </div>
        <div style="text-align:right">
          ${allPaid
            ? `<span class="b sp">✓ Todo pagado</span>`
            : anyPaid
              ? `<span class="b ss">Parcial — debe ${fmt(pen)}</span>`
              : `<span class="b sn">Debe ${fmt(pen)}</span>`}
          <div style="font-size:17px;font-weight:700;font-family:'DM Mono';margin-top:3px;color:${allPaid?'var(--gr)':anyPaid?'var(--ye)':'var(--re)'}">${fmt(pen)}</div>
          ${!allPaid && masUrg ? `<div style="font-size:10px;font-weight:700;color:${urgColor(diasUrg)}">${urgLabel(diasUrg)} · límite ${masUrg}</div>` : ''}
        </div>
      </div>
      <div class="dcb">
        ${p.gastos.map(g => {
          const pend  = g.deuda.monto - g.deuda.pagado;
          const dias  = diasHasta(g.deuda.fechaLimite);
          const venc  = dias !== null && dias < 0;
          return `<div class="payr">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:12px">${esc(g.desc)}</div>
              <div style="color:var(--mu);font-size:10px">${g.fecha} · ${bPago(g.pago).replace(/<[^>]+>/g,'').trim()} · Gasto: ${fmt(g.monto)}</div>
              ${g.deuda.fechaLimite ? `<div style="font-size:10px;font-weight:700;color:${urgColor(dias)};margin-top:2px">
                Pagar antes: <b>${g.deuda.fechaLimite}</b> · ${urgLabel(dias)}
                ${venc ? '<br><span style="font-weight:400;color:var(--re)">Puede haberse aplazado al siguiente ciclo — verifica con la tarjeta</span>' : ''}
              </div>` : ''}
              ${g.deuda.historial && g.deuda.historial.length ? `<div style="font-size:10px;color:var(--mu);margin-top:3px">
                Pagos recibidos: ${g.deuda.historial.filter(h=>h.monto>0).map(h=>`${fmt(h.monto)} el ${h.fecha} vía ${h.forma}`).join(' · ')}
              </div>` : ''}
            </div>
            <div style="text-align:right;min-width:82px;flex-shrink:0">
              <div style="font-size:12px;font-weight:700;font-family:'DM Mono';color:${g.deuda.estado==='pagado'?'var(--gr)':venc?'var(--re)':'var(--ye)'}">${fmt(pend)}</div>
              ${bStatus(g.deuda.estado)}
              ${g.deuda.estado !== 'pagado' ? `<br><button class="btn sm gr" style="margin-top:5px" onclick="pagarUno(${g.id})">✓ Pago</button>` : ''}
            </div>
          </div>`;
        }).join('')}
        ${!allPaid ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn gr sm full" onclick="pagarTodo('${k}','${mes}')">✓ Todo pagado — ${nombre}</button>
          <button class="btn ye sm" onclick="aplazar('${k}','${mes}')">↪ Aplazar al siguiente ciclo</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

window.pagarUno = async gastoId => {
  const g = C.gastos.find(g => g.id === gastoId);
  if (!g || !g.deuda) return;
  const pend = g.deuda.monto - g.deuda.pagado;
  const raw  = prompt(`¿Cuánto pagó?\nPendiente: ${fmt(pend)}`, pend.toFixed(2));
  if (raw === null) return;
  const monto = parseFloat(raw);
  if (isNaN(monto) || monto <= 0) return;
  const forma = prompt('¿Cómo pagó? (yape / efectivo / transferencia)', 'yape') || 'yape';
  g.deuda.pagado += monto;
  g.deuda.historial.push({ monto, fecha:today(), forma });
  g.deuda.estado = g.deuda.pagado >= g.deuda.monto ? 'pagado' : 'parcial';
  await saveGastoRec(g);
  renderCobros(); renderGastos();
  toast(`Pago de ${fmt(monto)} registrado ✓`);
};

window.pagarTodo = async (personaKey, mes) => {
  if (!confirm('¿Marcar todos los gastos de esta persona como pagados?')) return;
  const forma = prompt('¿Cómo pagó?', 'yape') || 'yape';
  const gs = C.gastos.filter(g => g.mesF===mes && g.deuda && g.deuda.estado!=='pagado');
  for (const g of gs) {
    const k = g.quien + (g.custom ? ':'+g.custom : '');
    if (k !== personaKey) continue;
    const pend = g.deuda.monto - g.deuda.pagado;
    if (pend <= 0) continue;
    g.deuda.pagado = g.deuda.monto;
    g.deuda.historial.push({ monto:pend, fecha:today(), forma });
    g.deuda.estado = 'pagado';
    await saveGastoRec(g);
  }
  renderCobros(); renderGastos();
  toast('Todo marcado como pagado ✓');
};

window.aplazar = async (personaKey, mes) => {
  if (!confirm('¿Aplazar al siguiente ciclo de facturación?\nSe actualiza la fecha límite al mes siguiente.')) return;
  const sigMes = mesSig(mes);
  const gs = C.gastos.filter(g => g.mesF===mes && g.deuda && g.deuda.estado!=='pagado');
  for (const g of gs) {
    const k = g.quien + (g.custom ? ':'+g.custom : '');
    if (k !== personaKey) continue;
    g.deuda.fechaLimite = TARJ[g.pago] ? getFechaLimite(g.pago, sigMes) : sigMes+'-28';
    g.deuda.historial.push({ monto:0, fecha:today(), forma:'aplazamiento', nota:'Aplazado al siguiente ciclo' });
    await saveGastoRec(g);
  }
  renderCobros(); renderGastos();
  toast('Aplazado al siguiente ciclo ↪', 'ye');
};

window.regPago = async () => {
  const quien  = document.getElementById('pr-q').value;
  const monto  = parseFloat(document.getElementById('pr-m').value);
  const fecha  = document.getElementById('pr-f').value;
  const forma  = document.getElementById('pr-forma').value;
  const gastoId = document.getElementById('pr-gid').value;
  const nota   = document.getElementById('pr-n').value.trim();
  const fpv    = document.getElementById('pr-fpv');
  const foto   = fpv.style.display!=='none' && fpv.src.startsWith('data:') ? fpv.src : null;
  if (isNaN(monto) || monto <= 0) { toast('Ingresa monto válido', 're'); return; }

  const mes = document.getElementById('fmd').value;

  if (gastoId === 'auto') {
    const pendientes = C.gastos
      .filter(g => g.deuda && g.deuda.estado!=='pagado' && g.quien===quien)
      .sort((a,b) => a.id - b.id);
    let rest = monto;
    for (const g of pendientes) {
      if (rest <= 0) break;
      const pend = g.deuda.monto - g.deuda.pagado;
      const aplica = Math.min(rest, pend);
      g.deuda.pagado += aplica;
      g.deuda.historial.push({ monto:aplica, fecha, forma, nota, foto });
      g.deuda.estado = g.deuda.pagado >= g.deuda.monto ? 'pagado' : 'parcial';
      await saveGastoRec(g);
      rest -= aplica;
    }
  } else {
    const g = C.gastos.find(g => g.id == gastoId);
    if (g && g.deuda) {
      const aplica = Math.min(monto, g.deuda.monto - g.deuda.pagado);
      g.deuda.pagado += aplica;
      g.deuda.historial.push({ monto:aplica, fecha, forma, nota, foto });
      g.deuda.estado = g.deuda.pagado >= g.deuda.monto ? 'pagado' : 'parcial';
      await saveGastoRec(g);
    }
  }

  const ingreso = { id:Date.now()+1, fecha, mes, desc:`Cobro a ${PERSONAS[quien]||quien}${nota?' — '+nota:''}`, monto, tipo:'cobro', notas:nota||'', foto };
  await saveIngresoRec(ingreso);
  C.ingresos.push(ingreso);

  ['pr-m','pr-n'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pr-foto').value = '';
  document.getElementById('pr-fpv').style.display = 'none';
  renderCobros(); renderGastos(); renderIngresos();
  toast(`Pago de ${fmt(monto)} registrado ✓`);
};

// ══════════════════════════════════════════════════
//  INGRESOS
// ══════════════════════════════════════════════════
window.saveIngreso = async () => {
  const desc  = document.getElementById('i-desc').value.trim();
  const monto = parseFloat(document.getElementById('i-m').value);
  if (!desc || isNaN(monto) || monto <= 0) { toast('Completa descripción y monto', 're'); return; }
  const fpv  = document.getElementById('i-fpv');
  const foto = fpv.style.display!=='none' && fpv.src.startsWith('data:') ? fpv.src : null;
  const ingreso = {
    id: Date.now(), fecha:document.getElementById('i-f').value, mes:document.getElementById('i-mes').value,
    desc, monto, tipo:document.getElementById('i-tipo').value, notas:document.getElementById('i-n').value.trim(), foto
  };
  await saveIngresoRec(ingreso);
  C.ingresos.push(ingreso);
  ['i-desc','i-m','i-n'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('i-foto').value = '';
  document.getElementById('i-fpv').style.display = 'none';
  renderIngresos(); renderBalance();
  toast('Ingreso registrado ✓');
};

window.elimIngreso = async id => {
  if (!confirm('¿Eliminar este ingreso?')) return;
  await delIngreso(id);
  C.ingresos = C.ingresos.filter(i => i.id !== id);
  renderIngresos(); renderBalance();
  toast('Ingreso eliminado');
};

function getTotIng(mes) {
  const ings = C.ingresos.filter(i => i.mes === mes);
  const hasSueldo = ings.some(i => i.tipo === 'sueldo');
  return (hasSueldo ? 0 : SUELDO) + ings.reduce((a,i) => a+i.monto, 0);
}

function renderIngresos() {
  const mes = document.getElementById('fmi')?.value; if (!mes) return;
  const ings = C.ingresos.filter(i => i.mes === mes);
  const hasSueldo = ings.some(i => i.tipo === 'sueldo');
  const todos = hasSueldo ? ings : [{ id:'auto', desc:'Sueldo base (incluido automáticamente)', monto:SUELDO, tipo:'sueldo', fecha:'', notas:'' }, ...ings];
  const tot = todos.reduce((a,i) => a+i.monto, 0);
  const su  = todos.filter(i => i.tipo==='sueldo').reduce((a,i) => a+i.monto, 0);
  const ex  = todos.filter(i => i.tipo!=='sueldo').reduce((a,i) => a+i.monto, 0);
  document.getElementById('it-tot').textContent = fmt(tot);
  document.getElementById('it-su').textContent  = fmt(su);
  document.getElementById('it-ex').textContent  = fmt(ex);
  const lista = document.getElementById('lista-i');
  lista.innerHTML = todos.map(i => `
    <div class="row">
      <div class="ri">
        <div class="rt">${esc(i.desc)}</div>
        <div class="rm">${i.fecha||''} <span class="b byo">${i.tipo}</span></div>
        ${i.notas ? `<div style="font-size:11px;color:var(--mu)">${esc(i.notas)}</div>` : ''}
      </div>
      <div class="row-actions">
        ${i.foto ? `<img src="${i.foto}" class="pt" onclick="openPM('${i.foto}')">` : ''}
        <div class="ra gr">${fmt(i.monto)}</div>
        ${i.id !== 'auto' ? `<div style="display:flex;gap:2px">
          <button class="ico ed" onclick="openEditIngreso(${i.id})" title="Editar">✏</button>
          <button class="ico" onclick="elimIngreso(${i.id})" title="Eliminar">✕</button>
        </div>` : ''}
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════
//  BALANCE
// ══════════════════════════════════════════════════
function renderBalance() {
  const mes = document.getElementById('fmb')?.value; if (!mes) return;
  const gs  = C.gastos.filter(g => g.mesF === mes);
  const totIng = getTotIng(mes);
  const totGas = gs.reduce((a,g) => a+g.monto, 0);
  const saldo  = totIng - totGas;
  const pct    = totIng > 0 ? Math.min(100, Math.round((totGas/totIng)*100)) : 0;

  document.getElementById('b-ing').textContent = fmt(totIng);
  document.getElementById('b-gas').textContent = fmt(totGas);
  const bs = document.getElementById('b-sal');
  bs.textContent  = fmt(saldo);
  bs.style.color  = saldo >= 0 ? 'var(--gr)' : 'var(--re)';
  const pb = document.getElementById('b-pb');
  pb.style.width      = pct + '%';
  pb.style.background = pct < 60 ? 'var(--gr)' : pct < 80 ? 'var(--ye)' : 'var(--re)';
  document.getElementById('b-pct').textContent = `Gastado: ${pct}% de tus ingresos este mes`;

  const ah = Math.round(totIng * .20), em = Math.round(totIng * .10);
  const es = Math.round(totIng * .50), pe = totIng - ah - em - es;
  document.getElementById('b-dist').innerHTML = `
    <div style="font-size:10px;color:var(--mu);margin-bottom:10px">Basado en tus ingresos de ${fmt(totIng)} este mes</div>
    ${[['Gastos esenciales (50%)',es,'var(--bl)',totGas],['Ahorro (20%)',ah,'var(--gr)',0],['Fondo emergencia (10%)',em,'var(--ye)',0],['Personal / libre (20%)',pe,'var(--pu)',0]]
      .map(([lb,val,col,act]) => {
        const p = totIng > 0 ? Math.round((val/totIng)*100) : 0;
        const d = act > 0 ? act - val : null;
        return `<div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
            <span>${lb}</span><span style="font-weight:700;color:${col}">${fmt(val)}</span>
          </div>
          ${d!==null ? `<div style="font-size:10px;color:${d>0?'var(--re)':'var(--gr)'};margin-bottom:2px">${d>0?`⚠ Excediste en ${fmt(d)}`:'✓ Dentro del presupuesto'}</div>` : ''}
          <div class="pb"><div class="pf" style="width:${p}%;background:${col}"></div></div>
        </div>`;
      }).join('')}`;

  const pers = [['yo','Yo'],['mama','Mamá'],['anny','Anny'],['hnaanny','Hna. Anny'],['carlos','Carlos']];
  document.getElementById('b-pers').innerHTML = pers.map(([k,n]) => {
    const t = gs.filter(g=>g.quien===k).reduce((a,g)=>a+g.monto,0); if(!t) return '';
    const p = totGas > 0 ? Math.round((t/totGas)*100) : 0;
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span>${n}</span><span style="font-weight:700">${fmt(t)} <span style="color:var(--mu)">${p}%</span></span>
      </div>
      <div class="pb"><div class="pf" style="width:${p}%;background:${P_COLORS[k]||'var(--mu)'}"></div></div>
    </div>`;
  }).join('');

  document.getElementById('b-med').innerHTML = Object.keys(PAGO_NAMES).map(m => {
    const t = gs.filter(g=>g.pago===m).reduce((a,g)=>a+g.monto,0); if(!t) return '';
    const p = totGas > 0 ? Math.round((t/totGas)*100) : 0;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bord)">
      ${bPago(m)}<span style="font-weight:700;font-size:12px">${fmt(t)}</span><span style="color:var(--mu);font-size:10px">${p}%</span>
    </div>`;
  }).join('');

  const meses = getMeses().slice(0,6).reverse();
  const maxG  = Math.max(...meses.map(m => C.gastos.filter(g=>g.mesF===m.v).reduce((a,g)=>a+g.monto,0)), 1);
  document.getElementById('b-chart').innerHTML = meses.map(m => {
    const t = C.gastos.filter(g=>g.mesF===m.v).reduce((a,g)=>a+g.monto,0);
    const h = Math.max(3, Math.round((t/maxG)*62));
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
      <div style="font-size:9px;color:var(--mu)">${t>0?fmt(t).replace('S/ ',''):''}</div>
      <div style="width:100%;height:${h}px;background:${m.v===mes?'var(--gr)':'var(--bord2)'};border-radius:3px 3px 0 0;transition:height .4s"></div>
      <div style="font-size:9px;color:var(--mu)">${m.lb.slice(0,3)}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  TARJETAS
// ══════════════════════════════════════════════════
function renderTarjetas() {
  const mes = document.getElementById('fmt')?.value; if (!mes) return;
  const dn  = dayNow();
  const ant = mesAnt(mes);

  document.getElementById('tar-cards').innerHTML = Object.entries(TARJ).map(([k,info]) => {
    const gm = C.gastos.filter(g => g.pago===k && g.mesF===mes);
    const ga = C.gastos.filter(g => g.pago===k && g.mesF===ant);
    const totM = gm.reduce((a,g)=>a+g.monto,0);
    const totA = ga.reduce((a,g)=>a+g.monto,0);
    const tieneDeuda = totA > 0;
    const fp = tieneDeuda ? info.urgente : info.normal;
    const dl = fp - dn;
    let sc='var(--gr)', st=`Pagar el día ${fp}`;
    if (dl < 0)       { sc='var(--re)'; st=`VENCIDO hace ${Math.abs(dl)} día(s)`; }
    else if (dl <= 2) { sc='var(--re)'; st=`⚠ Urgente: ${dl} día(s) restantes`; }
    else if (dl <= 7) { sc='var(--ye)'; st=`En ${dl} días`; }

    const porCob = gm.filter(g=>g.deuda&&g.deuda.estado!=='pagado').reduce((a,g)=>a+(g.deuda.monto-g.deuda.pagado),0);
    const pers   = [...new Set(gm.map(g => PERSONAS[g.quien]||g.custom||g.quien))].join(', ');
    const pDet   = [];
    gm.filter(g=>g.deuda&&g.deuda.estado!=='pagado').forEach(g => {
      const pend = g.deuda.monto - g.deuda.pagado;
      const nom  = g.quien==='otro'&&g.custom ? g.custom : (PERSONAS[g.quien]||g.quien);
      const ex   = pDet.find(x => x.nom===nom);
      if (ex) ex.pend += pend; else pDet.push({ nom, pend });
    });

    return `<div class="tc ${info.cls}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="b b${info.cls}" style="font-size:12px;padding:3px 11px">${info.n}</span>
        <span style="font-family:'DM Mono';font-size:17px;font-weight:700;color:${info.ac}">${fmt(totM)}</span>
      </div>
      <div style="font-size:10px;color:var(--mu);margin-bottom:6px">${gm.length} gasto(s)${pers?' · '+pers:''}</div>
      ${porCob > 0 ? `<div style="font-size:11px;color:var(--ye);margin-bottom:6px">
        💰 Por cobrar: ${fmt(porCob)}<br>
        ${pDet.map(x=>`<span style="padding-left:10px">· ${x.nom}: ${fmt(x.pend)}</span>`).join('<br>')}
      </div>` : ''}
      ${tieneDeuda ? `<div class="al ye" style="padding:6px 10px;font-size:10px;margin-bottom:6px">Deuda mes ant.: ${fmt(totA)} · Pagar antes del día ${info.urgente} para evitar intereses</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--bord)">
        <span style="font-size:10px;color:var(--mu)">Próx. pago: día ${fp}</span>
        <span style="font-size:10px;font-weight:700;color:${sc}">${st}</span>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  MAMÁ
// ══════════════════════════════════════════════════
function renderMama() {
  const mes = document.getElementById('fmm')?.value; if (!mes) return;
  const gs  = C.gastos.filter(g => g.mesF===mes && g.mama && g.mama.monto>0);
  const recib = gs.reduce((a,g) => a+(g.mama?.monto||0), 0);
  const uM    = gs.filter(g => ['pago-directo','pago-parcial'].includes(g.mama?.uso)).reduce((a,g) => a+(g.mama?.monto||0), 0);
  const uY    = gs.filter(g => !['pago-directo','pago-parcial'].includes(g.mama?.uso)).reduce((a,g) => a+(g.mama?.monto||0), 0);
  document.getElementById('m-r').textContent = fmt(recib);
  document.getElementById('m-m').textContent = fmt(uM);
  document.getElementById('m-y').textContent = fmt(uY);
  const uLb = { 'pago-directo':'Pagué gasto de mamá', 'pago-parcial':'Pago parcial', 'pago-tarjeta':'Para mi tarjeta', 'yape-propios':'Yapié propios', 'guarde':'Guardé' };
  const lista = document.getElementById('lista-m');
  if (!gs.length) { lista.innerHTML = '<div class="empty">Sin movimientos de mamá este mes</div>'; return; }
  lista.innerHTML = [...gs].reverse().map(g => `
    <div class="row">
      <div class="ri">
        <div class="rt">${esc(g.desc)}</div>
        <div class="rm">${g.fecha} ${bPago(g.pago)} ${bQuien(g.quien,g.custom)}</div>
        <div style="font-size:10px;color:var(--pk);margin-top:2px">💗 Mamá dio ${fmt(g.mama.monto)} (${g.mama.forma}) → <span style="color:var(--bl)">${uLb[g.mama.uso]||g.mama.uso}</span></div>
        ${g.mama.nota ? `<div style="font-size:10px;color:var(--mu)">${esc(g.mama.nota)}</div>` : ''}
      </div>
      <div class="ra re">${fmt(g.monto)}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════════════
function renderCfg() {
  document.getElementById('cfg-ng').textContent  = C.gastos.length;
  document.getElementById('cfg-ni').textContent  = C.ingresos.length;
  document.getElementById('cfg-src').textContent = USE_FIREBASE ? '☁ Firebase' : '💾 Local';

  const statusBox = document.getElementById('cfg-status-box');
  const guideEl   = document.getElementById('cfg-guide');
  if (USE_FIREBASE) {
    statusBox.innerHTML = `<div class="al gr">☁ <strong>Conectado a Firebase</strong> — tus datos se guardan en la nube y se sincronizan en tiempo real en cualquier dispositivo.<br><small style="opacity:.8">Proyecto: ${FIREBASE_CONFIG.projectId} · Usuario: ${USER_ID}</small></div>`;
    guideEl.style.display = 'none';
  } else {
    statusBox.innerHTML = `<div class="al re">⚠ <strong>Sin conexión a Firebase</strong> — los datos se guardan solo en este navegador y dispositivo.</div>`;
    guideEl.style.display = 'block';
  }

  const todos = [...new Set([...C.gastos.map(g=>g.mesF),...C.ingresos.map(i=>i.mes)])].sort().reverse();
  document.getElementById('cfg-meses').textContent = todos.length ? `Meses con datos: ${todos.map(m=>mesLb(m)).join(' · ')}` : 'Sin datos aún.';
  renderCfgLista();
}

window.renderCfgLista = () => {
  const mes  = document.getElementById('cfg-mes')?.value;
  const tipo = document.getElementById('cfg-tipo')?.value || 'gastos';
  if (!mes) return;
  const lista = document.getElementById('cfg-lista');
  if (tipo === 'gastos') {
    const gs = C.gastos.filter(g=>g.mesF===mes).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    if (!gs.length) { lista.innerHTML = '<div class="empty">Sin gastos en este mes</div>'; return; }
    lista.innerHTML = gs.map(g => `
      <div class="row">
        <div class="ri">
          <div class="rt">${esc(g.desc)}</div>
          <div class="rm">${g.fecha} ${g.hora||''} ${bPago(g.pago)} ${bQuien(g.quien,g.custom)}</div>
          ${g.deuda ? `<div style="font-size:10px;color:var(--ye)">Cobro: ${fmt(g.deuda.monto)} · ${g.deuda.estado}</div>` : ''}
        </div>
        <div class="row-actions">
          <span class="ra re">${fmt(g.monto)}</span>
          <div style="display:flex;gap:2px">
            <button class="ico ed" onclick="openEditGasto(${g.id})">✏</button>
            <button class="ico" onclick="elimGastoDesde(${g.id})">✕</button>
          </div>
        </div>
      </div>`).join('');
  } else {
    const ings = C.ingresos.filter(i=>i.mes===mes);
    if (!ings.length) { lista.innerHTML = '<div class="empty">Sin ingresos en este mes</div>'; return; }
    lista.innerHTML = ings.map(i => `
      <div class="row">
        <div class="ri">
          <div class="rt">${esc(i.desc)}</div>
          <div class="rm">${i.fecha||''} <span class="b byo">${i.tipo}</span></div>
        </div>
        <div class="row-actions">
          <span class="ra gr">${fmt(i.monto)}</span>
          <div style="display:flex;gap:2px">
            <button class="ico ed" onclick="openEditIngreso(${i.id})">✏</button>
            <button class="ico" onclick="elimIngresoDesde(${i.id})">✕</button>
          </div>
        </div>
      </div>`).join('');
  }
};

window.elimGastoDesde = async id => {
  if (!confirm('¿Eliminar este gasto?')) return;
  await delGasto(id);
  C.gastos = C.gastos.filter(g=>g.id!==id);
  renderCfgLista(); renderGastos(); renderCobros(); renderBalance(); renderTarjetas();
  toast('Gasto eliminado');
};
window.elimIngresoDesde = async id => {
  if (!confirm('¿Eliminar este ingreso?')) return;
  await delIngreso(id);
  C.ingresos = C.ingresos.filter(i=>i.id!==id);
  renderCfgLista(); renderIngresos(); renderBalance();
  toast('Ingreso eliminado');
};

// ── EDICIÓN ───────────────────────────────────────
let editId = null, editTipo = null;

window.openEditGasto = id => {
  const g = C.gastos.find(x=>x.id===id); if (!g) return;
  editId = id; editTipo = 'gasto';
  document.getElementById('edit-title').textContent = '✏ Editar Gasto';
  const ms = getMeses().map(m=>`<option value="${m.v}"${g.mesF===m.v?' selected':''}>${m.lb}</option>`).join('');
  document.getElementById('edit-body').innerHTML = `
    <div class="g2">
      <div class="fg"><label>Fecha</label><input type="date" id="ed-fecha" value="${g.fecha||''}"></div>
      <div class="fg"><label>Hora</label><input type="time" id="ed-hora" value="${g.hora||''}"></div>
    </div>
    <div class="fg"><label>Descripción</label><input type="text" id="ed-desc" value="${esc(g.desc)}"></div>
    <div class="g2">
      <div class="fg"><label>Monto (S/)</label><input type="number" id="ed-monto" value="${g.monto}" step="0.01" min="0" inputmode="decimal"></div>
      <div class="fg"><label>Pagado con</label>
        <select id="ed-pago">
          <option value="efectivo">Efectivo</option>
          <option value="yape">Yape</option>
          <option value="oh">Tarjeta Oh</option>
          <option value="interbank">Interbank</option>
          <option value="saga">Saga Falabella</option>
          <option value="bbva">BBVA</option>
        </select>
      </div>
    </div>
    <div class="g2">
      <div class="fg"><label>¿Quién generó el gasto?</label>
        <select id="ed-quien">
          ${Object.entries(PERSONAS).map(([k,v])=>`<option value="${k}"${g.quien===k?' selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>Mes de facturación</label><select id="ed-mesf">${ms}</select></div>
    </div>
    <div class="fg"><label>Nombre (si es "Otra persona")</label><input type="text" id="ed-custom" value="${esc(g.custom||'')}"></div>
    <div class="fg"><label>Notas / detalle</label><textarea id="ed-det">${esc(g.detalle||'')}</textarea></div>
    ${g.deuda ? `<div class="csm" style="margin-top:4px">
      <div style="font-weight:700;font-size:12px;color:var(--ye);margin-bottom:8px">Cobro asociado a este gasto</div>
      <div class="g2">
        <div class="fg" style="margin:0"><label>Monto a cobrar (S/)</label><input type="number" id="ed-dm" value="${g.deuda.monto}" step="0.01" min="0" inputmode="decimal"></div>
        <div class="fg" style="margin:0"><label>Fecha límite</label><input type="date" id="ed-df" value="${g.deuda.fechaLimite||''}"></div>
      </div>
      <div style="font-size:10px;color:var(--mu);margin-top:4px">Ya cobrado: ${fmt(g.deuda.pagado)} · Estado: ${g.deuda.estado}</div>
    </div>` : ''}
  `;
  document.getElementById('edit-modal').style.display = 'block';
  // Fix select values after innerHTML set
  setTimeout(() => {
    const ps = document.getElementById('ed-pago');
    if (ps) ps.value = g.pago;
    const qs = document.getElementById('ed-quien');
    if (qs) qs.value = g.quien;
  }, 10);
};

window.openEditIngreso = id => {
  const i = C.ingresos.find(x=>x.id===id); if (!i) return;
  editId = id; editTipo = 'ingreso';
  document.getElementById('edit-title').textContent = '✏ Editar Ingreso';
  const ms = getMeses().map(m=>`<option value="${m.v}"${i.mes===m.v?' selected':''}>${m.lb}</option>`).join('');
  document.getElementById('edit-body').innerHTML = `
    <div class="g2">
      <div class="fg"><label>Fecha</label><input type="date" id="ed-fecha" value="${i.fecha||''}"></div>
      <div class="fg"><label>Mes que corresponde</label><select id="ed-mes">${ms}</select></div>
    </div>
    <div class="fg"><label>Descripción</label><input type="text" id="ed-desc" value="${esc(i.desc)}"></div>
    <div class="g2">
      <div class="fg"><label>Monto (S/)</label><input type="number" id="ed-monto" value="${i.monto}" step="0.01" min="0" inputmode="decimal"></div>
      <div class="fg"><label>Tipo</label>
        <select id="ed-tipo">
          ${['sueldo','extra','liquidacion','cobro','prestamo','devolucion','otro'].map(t=>`<option value="${t}"${i.tipo===t?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="fg"><label>Notas</label><textarea id="ed-det">${esc(i.notas||'')}</textarea></div>
  `;
  document.getElementById('edit-modal').style.display = 'block';
};

window.saveEdit = async () => {
  if (editTipo === 'gasto') {
    const g = C.gastos.find(x=>x.id===editId); if (!g) return;
    const monto = parseFloat(document.getElementById('ed-monto').value);
    const desc  = document.getElementById('ed-desc').value.trim();
    if (!desc || isNaN(monto) || monto <= 0) { toast('Descripción y monto requeridos', 're'); return; }
    g.fecha    = document.getElementById('ed-fecha').value;
    g.hora     = document.getElementById('ed-hora').value;
    g.desc     = desc; g.monto = monto;
    g.pago     = document.getElementById('ed-pago').value;
    g.quien    = document.getElementById('ed-quien').value;
    g.mesF     = document.getElementById('ed-mesf').value;
    g.custom   = document.getElementById('ed-custom').value.trim();
    g.detalle  = document.getElementById('ed-det').value.trim();
    if (g.deuda && document.getElementById('ed-dm')) {
      g.deuda.monto       = parseFloat(document.getElementById('ed-dm').value) || g.deuda.monto;
      g.deuda.fechaLimite = document.getElementById('ed-df').value || g.deuda.fechaLimite;
    }
    await saveGastoRec(g);
  } else {
    const i = C.ingresos.find(x=>x.id===editId); if (!i) return;
    const monto = parseFloat(document.getElementById('ed-monto').value);
    const desc  = document.getElementById('ed-desc').value.trim();
    if (!desc || isNaN(monto) || monto <= 0) { toast('Descripción y monto requeridos', 're'); return; }
    i.fecha  = document.getElementById('ed-fecha').value;
    i.mes    = document.getElementById('ed-mes').value;
    i.desc   = desc; i.monto = monto;
    i.tipo   = document.getElementById('ed-tipo').value;
    i.notas  = document.getElementById('ed-det').value.trim();
    await saveIngresoRec(i);
  }
  closeEdit();
  renderGastos(); renderCobros(); renderIngresos(); renderBalance(); renderTarjetas(); renderCfgLista();
  toast('Cambios guardados ✓');
};

window.closeEdit = () => {
  document.getElementById('edit-modal').style.display = 'none';
  editId = null; editTipo = null;
};

// ── BACKUP ────────────────────────────────────────
window.exportJSON = () => {
  const data = { version:7, exportado:new Date().toISOString(), nota:'Backup MisFinanzas', ...C };
  const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `MisFinanzas_backup_${today()}.json`;
  a.click();
  toast('Backup descargado ✓');
};

window.exportCSV = () => {
  const rows = [['TIPO','FECHA','HORA','DESCRIPCION','MONTO','QUIEN','PAGO','MES','ESTADO_COBRO','MONTO_COBRO','FECHA_LIMITE','NOTAS']];
  C.gastos.forEach(g => rows.push(['GASTO',g.fecha||'',g.hora||'',g.desc||'',g.monto||0,g.quien==='otro'&&g.custom?g.custom:(PERSONAS[g.quien]||g.quien),g.pago||'',g.mesF||'',g.deuda?(g.deuda.estado||''):'',g.deuda?(g.deuda.monto||0):'',g.deuda?(g.deuda.fechaLimite||''):'',g.detalle||'']));
  C.ingresos.forEach(i => rows.push(['INGRESO',i.fecha||'','',i.desc||'',i.monto||0,'Yo','',i.mes||'','','','',i.notas||'']));
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `MisFinanzas_${today()}.csv`;
  a.click();
  toast('CSV exportado ✓');
};

window.importJSON = async input => {
  if (!input.files || !input.files[0]) return;
  if (!confirm('¿Restaurar desde este backup?\n\n⚠ Reemplazará TODOS los datos actuales.')) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.gastos || !data.ingresos) { toast('Archivo no válido', 're'); return; }
      data.gastos.forEach(g => { if (g.deuda && !g.deuda.historial) g.deuda.historial = []; });
      C = { gastos: data.gastos, ingresos: data.ingresos };
      writeLocal(C);
      if (USE_FIREBASE) {
        toast('Importando a Firebase...', 'ye');
        for (const g of C.gastos) await saveGastoRec(g);
        for (const i of C.ingresos) await saveIngresoRec(i);
      }
      renderCfg(); renderGastos(); renderIngresos(); renderBalance();
      toast(`✓ ${data.gastos.length} gastos y ${data.ingresos.length} ingresos restaurados`);
    } catch(err) { toast('Error al leer archivo: '+err.message, 're'); }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
};

window.borrarTodo = async () => {
  if (!confirm('¿Borrar TODOS los datos permanentemente? No se puede deshacer.')) return;
  if (!confirm('Última confirmación: ¿borrar todo?')) return;
  if (USE_FIREBASE) {
    toast('Borrando de Firebase...', 'ye');
    for (const g of C.gastos) await delGasto(g.id);
    for (const i of C.ingresos) await delIngreso(i.id);
  }
  C = { gastos:[], ingresos:[] };
  localStorage.removeItem(LOCAL_KEY);
  writeLocal(C);
  renderCfg(); renderGastos(); renderIngresos(); renderBalance();
  toast('Todos los datos borrados', 're');
};

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initSelects();
  document.getElementById('g-pago').addEventListener('change', window.chkPago);
  document.getElementById('g-mesf').addEventListener('change', window.chkPago);

  setSdot(USE_FIREBASE ? 'syn' : 'err');
  C = await loadAll();
  setSdot(USE_FIREBASE ? 'ok' : 'err');
  renderGastos();
});
