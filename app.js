/* Plata Clara · lógica de la app
   Todo se guarda en este dispositivo (localStorage). Respaldo: exportar/importar JSON. */
'use strict';

const KEY = 'plata-clara-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const lc = s => s === s.toUpperCase() ? s : s.toLowerCase();

/* ---------- Números y fechas ---------- */
const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(n, dec) { n = Number(n) || 0; return (n < 0 ? '−' : '') + '$ ' + (dec ? nf2 : nf0).format(Math.abs(n)); }
function short(n) {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e6) return s + '$ ' + (a / 1e6).toLocaleString('es-AR', { maximumFractionDigits: a >= 1e7 ? 1 : 2 }) + ' M';
  if (a >= 1e3) return s + '$ ' + Math.round(a / 1e3) + ' mil';
  return s + money(a);
}
function heroMoney(n) { const t = nf2.format(Math.abs(n)); const [e, d] = t.split(','); return (n < 0 ? '−' : '') + '$ ' + e + '<small>,' + d + '</small>'; }
function parseNum(s) { s = String(s ?? '').trim().replace(/\s/g, '').replace(/\$/g, ''); if (!s) return 0; s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isFinite(n) ? n : 0; }
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const today = () => ymd(new Date());
const mkey = s => s.slice(0, 7);
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
function addMonths(s, n) { const d = parseD(s), day = d.getDate(); const t = new Date(d.getFullYear(), d.getMonth() + n, 1); const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(day, last)); return ymd(t); }
const shiftMonth = (k, n) => addMonths(k + '-01', n).slice(0, 7);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const monthName = k => MESES[Number(k.slice(5, 7)) - 1];
const mes3 = k => MES3[Number(k.slice(5, 7)) - 1];
function relDay(s) {
  const t = today(); if (s === t) return 'Hoy';
  if (s === ymd(new Date(Date.now() - 864e5))) return 'Ayer';
  const d = parseD(s); return cap(DIAS[d.getDay()]) + ' ' + d.getDate();
}
function monthsUntil(fecha) { if (!fecha) return 0; const a = parseD(today()), b = parseD(fecha); return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); }
function fechaLarga(s) { if (!s) return ''; const d = parseD(s); return MESES[d.getMonth()] + ' ' + d.getFullYear(); }

/* ---------- Datos ---------- */
const MEDIOS = ['Efectivo', 'Débito', 'Mercado Pago', 'Transferencia', 'Tarjeta de crédito'];
const MEDIO_ICO = { 'Efectivo': '💵', 'Débito': '💳', 'Mercado Pago': '🔵', 'Transferencia': '🔁', 'Tarjeta de crédito': '💳' };
const MEDIO_CORTO = { 'Tarjeta de crédito': 'Crédito' };
const FUENTES = {
  sueldo: { nombre: 'Sueldo', emoji: '💼', color: 'c9' },
  dj: { nombre: 'DJ', emoji: '🎧', color: 'c7' },
  aguinaldo: { nombre: 'Aguinaldo', emoji: '🎄', color: 'c1' },
  bono: { nombre: 'Bono', emoji: '⭐', color: 'c2' },
  otros: { nombre: 'Otros ingresos', emoji: '💰', color: 'c8' }
};
const COLORES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c7', 'c8', 'c9', 'c6'];

function defaults() {
  const C = (id, nombre, emoji, color, k) => ({ id, nombre, emoji, color, presupuesto: 0, k });
  return {
    version: 1,
    config: {
      ahorroPct: 20, metaAhorro: 'm-emerg', metaDJ: 'm-emerg',
      extraCasa: 'm-casa', extraCorto: 'm-viaje', extraPctCasa: 70,
      parejaOn: true, pareja: 'Melani', miParte: 50,
      tema: 'auto', ultimoRespaldo: null, ultimoMedio: 'Débito', creado: today()
    },
    categorias: [
      C('viv', 'Vivienda', '🏠', 'c9', ['alquiler', 'expensas', 'casa']),
      C('serv', 'Servicios', '💡', 'c2', ['luz', 'gas', 'agua', 'internet', 'celular', 'telefono', 'epe', 'litoral']),
      C('super', 'Súper', '🛒', 'c1', ['super', 'supermercado', 'coto', 'carrefour', 'almacen', 'verduleria', 'chino', 'carniceria', 'dietetica', 'kiosco']),
      C('comida', 'Comida afuera', '🍔', 'c3', ['delivery', 'pedidosya', 'rappi', 'pizza', 'resto', 'almuerzo', 'cena', 'cafe', 'birra', 'helado', 'empanadas', 'hamburguesa', 'sushi']),
      C('trans', 'Transporte', '🚗', 'c4', ['nafta', 'sube', 'colectivo', 'taxi', 'uber', 'cabify', 'didi', 'peaje', 'estacionamiento', 'mecanico', 'cochera', 'seguro']),
      C('salud', 'Salud', '💊', 'c8', ['farmacia', 'medico', 'remedio', 'remedios', 'dentista', 'prepaga', 'gimnasio', 'gym', 'psicologo']),
      C('ropa', 'Ropa y cuidado', '👕', 'c2', ['zapatillas', 'ropa', 'remera', 'pantalon', 'campera', 'peluqueria', 'perfume', 'barberia']),
      C('salidas', 'Salidas', '🎉', 'c5', ['salida', 'bar', 'cine', 'boliche', 'recital', 'entrada', 'teatro', 'previa']),
      C('subs', 'Suscripciones', '📺', 'c5', ['netflix', 'spotify', 'disney', 'youtube', 'icloud', 'hbo', 'prime', 'chatgpt']),
      C('dj', 'DJ', '🎧', 'c7', ['parlante', 'cables', 'auriculares', 'controladora', 'vinilo', 'equipo', 'pendrive']),
      C('edu', 'Educación', '📚', 'c8', ['curso', 'libro', 'facultad', 'clase', 'ingles']),
      C('regalos', 'Regalos', '🎁', 'c3', ['regalo', 'cumple']),
      C('otros', 'Otros', '📦', 'c6', [])
    ],
    movimientos: [],
    fijos: [],
    metas: [
      { id: 'm-emerg', nombre: 'Fondo de emergencia', emoji: '🛟', color: 'c8', objetivo: 0, fecha: '', inicial: 0 },
      { id: 'm-casa', nombre: 'Casa', emoji: '🏡', color: 'c9', objetivo: 0, fecha: '', inicial: 0 },
      { id: 'm-viaje', nombre: 'Viaje', emoji: '✈️', color: 'c2', objetivo: 0, fecha: '', inicial: 0 },
      { id: 'm-auto', nombre: 'Auto', emoji: '🚙', color: 'c4', objetivo: 0, fecha: '', inicial: 0 }
    ],
    cierres: {}
  };
}

let S;
function load() {
  try { const r = localStorage.getItem(KEY); if (r) { S = JSON.parse(r); migrate(); return; } } catch (e) { }
  S = defaults();
}
function migrate() {
  const d = defaults();
  S.config = Object.assign({}, d.config, S.config || {});
  if (!Array.isArray(S.categorias) || !S.categorias.length) S.categorias = d.categorias;
  if (!S.categorias.find(c => c.id === 'otros')) S.categorias.push(d.categorias.find(c => c.id === 'otros'));
  S.movimientos = Array.isArray(S.movimientos) ? S.movimientos : [];
  S.fijos = Array.isArray(S.fijos) ? S.fijos : [];
  S.metas = Array.isArray(S.metas) ? S.metas : d.metas;
  S.cierres = S.cierres || {};
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('No pude guardar: revisá el espacio del iPhone'); }
}

const cat = id => S.categorias.find(c => c.id === id) || S.categorias.find(c => c.id === 'otros');
const meta = id => S.metas.find(m => m.id === id);
const pareja = () => S.config.parejaOn && S.config.pareja ? S.config.pareja : null;
const parteMia = m => m.compartido ? m.monto * S.config.miParte / 100 : m.monto;
const movsMes = k => S.movimientos.filter(m => mkey(m.fecha) === k);
const sortMovs = arr => arr.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado || 0) - (a.creado || 0));

function pendientes(k) {
  const pagados = new Set(movsMes(k).filter(m => m.fijoId).map(m => m.fijoId));
  return S.fijos.filter(f => f.activo !== false && !pagados.has(f.id)).sort((a, b) => a.dia - b.dia);
}
function resumenMes(k) {
  let ing = 0, aho = 0, fij = 0, vari = 0, dj = 0;
  for (const m of movsMes(k)) {
    if (m.tipo === 'ingreso') { ing += m.monto; if (m.fuente === 'dj') dj += m.monto; }
    else if (m.tipo === 'ahorro') aho += m.monto;
    else if (m.fijoId) fij += parteMia(m);
    else vari += parteMia(m);
  }
  const pend = k === mkey(today()) ? pendientes(k).reduce((a, f) => a + (f.compartido ? f.monto * S.config.miParte / 100 : f.monto), 0) : 0;
  return { ing, aho, fij, vari, pend, dj, gastos: fij + vari, disp: ing - aho - fij - pend - vari };
}
function balance(k) {
  const p = S.config.miParte / 100;
  const list = sortMovs(movsMes(k).filter(m => m.tipo === 'gasto' && m.compartido));
  let yo = 0, ella = 0;
  for (const m of list) { if (m.pagoPor === 'pareja') ella += m.monto; else yo += m.monto; }
  return { list, yo, ella, total: yo + ella, debe: yo * (1 - p) - ella * p };
}
function metaJuntado(id) { const m = meta(id); return (m ? Number(m.inicial) || 0 : 0) + S.movimientos.filter(x => x.tipo === 'ahorro' && x.metaId === id).reduce((a, x) => a + x.monto, 0); }
function catUso() { const u = {}; for (const m of S.movimientos) if (m.tipo === 'gasto' && !m.fijoId) u[m.categoriaId] = (u[m.categoriaId] || 0) + 1; return u; }
function catsOrdenadas() { const u = catUso(); return S.categorias.slice().sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0)); }

/* Ahorro automático al cargar un ingreso ("págate primero") */
function autoAhorro(ing) {
  S.movimientos = S.movimientos.filter(m => m.origenId !== ing.id);
  if (!ing.auto) return;
  const c = S.config;
  const add = (metaId, monto, nota) => { if (monto > 0 && meta(metaId)) S.movimientos.push({ id: uid(), tipo: 'ahorro', monto: Math.round(monto), metaId, fecha: ing.fecha, nota, origenId: ing.id, creado: Date.now() }); };
  if (ing.fuente === 'sueldo' && c.ahorroPct > 0) add(c.metaAhorro, ing.monto * c.ahorroPct / 100, `Me pagué primero (${c.ahorroPct} %)`);
  if (ing.fuente === 'dj') add(c.metaDJ, ing.monto, 'Fecha de DJ a la meta');
  if (ing.fuente === 'aguinaldo' || ing.fuente === 'bono') {
    const n = FUENTES[ing.fuente].nombre;
    add(c.extraCasa, ing.monto * c.extraPctCasa / 100, `${n}: ${c.extraPctCasa} %`);
    add(c.extraCorto, ing.monto * (100 - c.extraPctCasa) / 100, `${n}: ${100 - c.extraPctCasa} %`);
  }
}
function autoAhorroTexto(fuente) {
  const c = S.config, mn = id => meta(id)?.nombre || '—';
  if (fuente === 'sueldo') return `Separar ${c.ahorroPct} % para ${mn(c.metaAhorro)}`;
  if (fuente === 'dj') return `Mandar todo a ${mn(c.metaDJ)}`;
  if (fuente === 'aguinaldo' || fuente === 'bono') return `Repartir ${c.extraPctCasa} % ${mn(c.extraCasa)} y ${100 - c.extraPctCasa} % ${mn(c.extraCorto)}`;
  return '';
}

/* ---------- Carga tipo chat ---------- */
const W_CRED = ['tarjeta', 'credito', 'visa', 'master', 'mastercard', 'amex', 'naranja', 'cuotas', 'cuota'];
const W_STOP = new Set(['en', 'de', 'con', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'por', 'y', 'a', 'mp', 'mercado', 'pago', 'pague', 'efectivo', 'cash', 'debito', 'transf', 'transferencia', 'compartido', 'compartida', 'mitad', 'ayer', 'anteayer', 'hoy', 'ahorro', 'ahorre', 'guarde', 'cobre', 'cobro', 'ingreso', 'pesos', '$', ...W_CRED]);

function parseChat(text) {
  const raw = String(text || '').trim(); if (!raw) return null;
  const lower = raw.toLowerCase();
  const m = lower.match(/(\d[\d.]*(?:,\d{1,2})?)(\s?k\b|\s?mil\b|\s?lucas?\b)?/);
  if (!m) return null;
  let monto = parseNum(m[1]); if (m[2]) monto *= 1000;
  if (!(monto > 0)) return null;
  const rest = (lower.slice(0, m.index) + ' ' + lower.slice(m.index + m[0].length));
  const toks = rest.split(/\s+/).filter(Boolean);
  const words = toks.map(norm);
  const has = w => words.includes(w);
  const pz = pareja() ? norm(pareja()) : null;

  const F = blankForm();
  F.monto = String(Math.round(monto * 100) / 100).replace('.', ',');
  if (has('ayer')) F.fecha = ymd(new Date(Date.now() - 864e5));
  if (has('anteayer')) F.fecha = ymd(new Date(Date.now() - 2 * 864e5));

  const djIngreso = has('dj') && words.some(w => ['fecha', 'toque', 'evento', 'show', 'cobre', 'cumple', 'casamiento', 'fiesta'].includes(w));
  if (has('sueldo') || has('aguinaldo') || has('bono') || has('cobre') || has('cobro') || has('ingreso') || djIngreso) {
    F.tipo = 'ingreso';
    F.fuente = has('sueldo') ? 'sueldo' : has('aguinaldo') ? 'aguinaldo' : has('bono') ? 'bono' : (has('dj') || djIngreso) ? 'dj' : 'otros';
    F.auto = F.fuente !== 'otros';
    F.medio = 'Transferencia';
  } else if (has('ahorro') || has('ahorre') || has('guarde')) {
    F.tipo = 'ahorro';
    const mt = S.metas.find(x => norm(x.nombre).split(/\s+/).some(p => p.length > 3 && words.includes(p)));
    F.metaId = mt ? mt.id : S.config.metaAhorro;
  } else {
    const c = S.categorias.find(c => [...(c.k || []), ...norm(c.nombre).split(/\s+/).filter(p => p.length > 2)].some(k => words.includes(norm(k))))
      || (has('dj') ? cat('dj') : null);
    F.categoriaId = c ? c.id : 'otros';
    if (words.some(w => W_CRED.includes(w))) {
      F.medio = 'Tarjeta de crédito';
      const q = lower.match(/(?:tarjeta|cr[eé]dito|visa|master(?:card)?|amex|naranja)\s+(\d{1,2})\b/) || lower.match(/(\d{1,2})\s*cuotas?/);
      if (q) F.cuotas = Math.max(1, Math.min(48, parseInt(q[1], 10)));
    } else if (has('mp') || has('mercado')) F.medio = 'Mercado Pago';
    else if (has('efectivo') || has('cash')) F.medio = 'Efectivo';
    else if (has('debito')) F.medio = 'Débito';
    else if (has('transf') || has('transferencia')) F.medio = 'Transferencia';
    const esPareja = w => pz && w.length >= 3 && (w === pz || (w.length <= pz.length && w.slice(0, 3) === pz.slice(0, 3)));
    if (pz && (words.some(esPareja) || has('compartido') || has('compartida') || has('mitad'))) {
      F.compartido = true;
      if (has('pago') && !has('mercado') && words.indexOf('pago') > -1) F.pagoPor = 'pareja';
    }
  }
  const skip = new Set([...W_STOP, ...(F.compartido ? words.filter(w => pz && w.length >= 3 && w.slice(0, 3) === pz.slice(0, 3)) : []), String(F.cuotas)]);
  if (F.tipo === 'ingreso') ['sueldo', 'aguinaldo', 'bono', 'dj', 'fecha'].forEach(w => skip.add(w));
  F.nota = cap(toks.filter((t, i) => !skip.has(words[i])).join(' '));
  if (F.tipo === 'gasto' && F.nota && norm(cat(F.categoriaId).nombre).startsWith(norm(F.nota))) F.nota = '';
  return F;
}

/* ---------- Formulario de movimiento ---------- */
let F = null;
function blankForm(tipo) {
  const c0 = catsOrdenadas()[0];
  return { id: null, tipo: tipo || 'gasto', monto: '', categoriaId: c0 ? c0.id : 'otros', medio: S.config.ultimoMedio || 'Débito', cuotas: 1, compartido: false, pagoPor: 'yo', fecha: today(), nota: '', fuente: 'sueldo', auto: true, metaId: S.config.metaAhorro, retiro: false, fijoId: null };
}
function formFromMov(m) {
  return { id: m.id, tipo: m.tipo, monto: String(Math.abs(m.monto)).replace('.', ','), categoriaId: m.categoriaId || 'otros', medio: m.medio || 'Débito', cuotas: 1, compartido: !!m.compartido, pagoPor: m.pagoPor || 'yo', fecha: m.fecha, nota: m.nota || '', fuente: m.fuente || 'otros', auto: !!m.auto, metaId: m.metaId || S.config.metaAhorro, retiro: m.tipo === 'ahorro' && m.monto < 0, fijoId: m.fijoId || null, grupoId: m.grupoId, cuotaNumero: m.cuotaNumero, cuotasTot: m.cuotas };
}
function movTitulo(m) {
  if (m.tipo === 'gasto') { const c = cat(m.categoriaId); return (m.nota || (m.fijoId ? (S.fijos.find(f => f.id === m.fijoId)?.nombre || c.nombre) : c.nombre)) + (m.cuotas > 1 ? ` · cuota ${m.cuotaNumero} de ${m.cuotas}` : ''); }
  if (m.tipo === 'ingreso') return m.nota || FUENTES[m.fuente]?.nombre || 'Ingreso';
  return m.nota || ('Ahorro: ' + (meta(m.metaId)?.nombre || 'meta'));
}
function movVisual(m) {
  if (m.tipo === 'gasto') { const c = cat(m.categoriaId); return { e: c.emoji, c: c.color }; }
  if (m.tipo === 'ingreso') { const f = FUENTES[m.fuente] || FUENTES.otros; return { e: f.emoji, c: f.color }; }
  const mt = meta(m.metaId); return { e: mt ? mt.emoji : '🐷', c: 'accent' };
}
function vMovForm() {
  const t = F.tipo, n = parseNum(F.monto), pz = pareja();
  const editing = !!F.id;
  let h = `<div class="grab"></div><div class="shead"><button data-act="close">Cancelar</button><b>${editing ? 'Editar' : 'Nuevo'}</b><button data-act="saveMov">Guardar</button></div>`;
  if (!editing) h += `<div class="types">${['gasto', 'ingreso', 'ahorro'].map(x => `<button class="${t === x ? 'on' : ''}" data-act="ftipo" data-v="${x}">${cap(x)}</button>`).join('')}</div>`;
  let sub = '';
  if (t === 'gasto' && F.medio === 'Tarjeta de crédito' && F.cuotas > 1 && n) sub = `${F.cuotas} cuotas de ${money(n / F.cuotas)}`;
  if (t === 'gasto' && F.compartido && n) sub = (sub ? sub + ' · ' : '') + `tu parte ${money(n * S.config.miParte / 100)}`;
  h += `<div class="amount num ${n ? '' : 'zero'}" id="fAmount">${F.retiro ? '−' : ''}${money(n, n % 1 !== 0)}${sub ? `<small>${sub}</small>` : ''}</div>`;
  if (t === 'gasto') {
    h += `<div class="cats">${catsOrdenadas().map(c => `<button class="cat ${F.categoriaId === c.id ? 'on' : ''}" data-act="fcat" data-v="${c.id}"><span class="ico" style="--c:var(--${c.color})">${c.emoji}</span><span>${esc(c.nombre)}</span></button>`).join('')}</div>`;
    h += `<div class="meta">${MEDIOS.map(x => `<button class="chip ${F.medio === x ? 'on' : ''}" data-act="fmedio" data-v="${x}">${MEDIO_ICO[x]} ${MEDIO_CORTO[x] || x}</button>`).join('')}</div>`;
    if (F.medio === 'Tarjeta de crédito' && !editing) h += `<div class="optrow"><span>Cuotas</span><div class="stepper"><button data-act="fcuota" data-v="-1" aria-label="Menos cuotas">−</button><b class="num">${F.cuotas}</b><button data-act="fcuota" data-v="1" aria-label="Más cuotas">+</button></div></div>`;
    if (editing && F.cuotasTot > 1) h += `<div class="optrow muted"><span>Cuota ${F.cuotaNumero} de ${F.cuotasTot}. Lo que cambies acá vale solo para esta cuota.</span></div>`;
    if (pz) {
      h += `<div class="optrow"><span>👫 Compartido con ${esc(pz)}</span><button class="tog ${F.compartido ? 'on' : ''}" data-act="fcomp" aria-label="Compartido"></button></div>`;
      if (F.compartido) h += `<div class="optrow"><span>¿Quién pagó?</span><div class="seg"><button class="${F.pagoPor !== 'pareja' ? 'on' : ''}" data-act="fpago" data-v="yo">Yo</button><button class="${F.pagoPor === 'pareja' ? 'on' : ''}" data-act="fpago" data-v="pareja">${esc(pz)}</button></div></div>`;
    }
  } else if (t === 'ingreso') {
    h += `<div class="meta">${Object.entries(FUENTES).map(([k, f]) => `<button class="chip ${F.fuente === k ? 'on' : ''}" data-act="ffuente" data-v="${k}">${f.emoji} ${f.nombre.replace(' ingresos', '')}</button>`).join('')}</div>`;
    const tx = autoAhorroTexto(F.fuente);
    if (tx) h += `<div class="optrow"><span>🐷 ${esc(tx)}</span><button class="tog ${F.auto ? 'on' : ''}" data-act="fauto" aria-label="Ahorro automático"></button></div>`;
  } else {
    h += `<div class="meta">${S.metas.map(m => `<button class="chip ${F.metaId === m.id ? 'on' : ''}" data-act="fmeta" data-v="${m.id}">${m.emoji} ${esc(m.nombre)}</button>`).join('')}</div>`;
    h += `<div class="optrow"><span>Saqué plata de esta meta</span><button class="tog ${F.retiro ? 'on' : ''}" data-act="fretiro" aria-label="Retiro"></button></div>`;
  }
  h += `<div class="pad" id="pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map(k => `<button data-act="key" data-v="${k}" ${k === '⌫' ? 'aria-label="Borrar"' : ''}>${k}</button>`).join('')}</div>`;
  h += `<div class="fields"><label for="fFecha">Fecha</label><input type="date" id="fFecha" value="${F.fecha}"><label for="fNota">Nota</label><input id="fNota" value="${esc(F.nota)}" placeholder="Opcional" maxlength="60"></div>`;
  h += `<button class="btn" data-act="saveMov">Guardar</button>`;
  if (editing) h += `<button class="btn danger" data-act="delMov" data-id="${F.id}">Borrar</button>`;
  return h;
}
function syncForm() { const f = $('#fFecha'), n = $('#fNota'); if (f && f.value) F.fecha = f.value; if (n) F.nota = n.value.trim(); }
function openMovForm(form) { F = form; openSheet(vMovForm()); }
function rerenderForm() { syncForm(); const sc = $('#sheet').scrollTop; $('#sheet').innerHTML = vMovForm(); $('#sheet').scrollTop = sc; }
function updateAmount() { const tmp = document.createElement('div'); tmp.innerHTML = vMovForm(); $('#fAmount').outerHTML = tmp.querySelector('#fAmount').outerHTML; }

function saveMov(fromChat) {
  if (!fromChat) syncForm();
  let monto = parseNum(F.monto);
  if (!(monto > 0)) { toast('Escribí un monto'); return; }
  if (F.tipo === 'ahorro' && F.retiro) monto = -monto;
  const base = { tipo: F.tipo, fecha: F.fecha || today(), nota: F.nota || '' };
  if (F.tipo === 'gasto') Object.assign(base, { categoriaId: F.categoriaId, medio: F.medio, compartido: !!(F.compartido && pareja()), pagoPor: F.compartido ? F.pagoPor : 'yo', fijoId: F.fijoId || undefined });
  if (F.tipo === 'ingreso') Object.assign(base, { fuente: F.fuente, medio: F.medio || 'Transferencia', auto: !!F.auto && F.fuente !== 'otros' });
  if (F.tipo === 'ahorro') Object.assign(base, { metaId: F.metaId });

  if (F.id) {
    const m = S.movimientos.find(x => x.id === F.id);
    if (m) { Object.assign(m, base, { monto }); if (m.tipo === 'ingreso') autoAhorro(m); }
    toast('✓ Cambios guardados');
  } else if (F.tipo === 'gasto' && F.medio === 'Tarjeta de crédito' && F.cuotas > 1) {
    const g = uid(), n = F.cuotas, cuota = Math.round(monto / n * 100) / 100;
    for (let i = 0; i < n; i++) S.movimientos.push({ ...base, id: uid(), monto: cuota, cuotas: n, cuotaNumero: i + 1, grupoId: g, fecha: addMonths(base.fecha, i), creado: Date.now() + i });
    toast(`✓ Guardado en ${n} cuotas de ${money(cuota)}`);
  } else {
    const m = { ...base, id: uid(), monto, creado: Date.now() };
    S.movimientos.push(m);
    if (m.tipo === 'ingreso') autoAhorro(m);
    toast('✓ Guardado: ' + money(Math.abs(monto)));
  }
  if (F.tipo === 'gasto') S.config.ultimoMedio = F.medio;
  save(); haptic(); closeSheet(); render();
}
function askDelete(id) {
  const m = S.movimientos.find(x => x.id === id); if (!m) return;
  const del = ids => { S.movimientos = S.movimientos.filter(x => !ids.includes(x.id) && !ids.includes(x.origenId)); save(); closeSheet(); render(); toast('Borrado'); };
  const btns = [];
  if (m.grupoId) {
    btns.push({ label: 'Borrar solo esta cuota', act: () => del([m.id]) });
    btns.push({ label: `Borrar las ${m.cuotas} cuotas`, cls: 'danger', act: () => del(S.movimientos.filter(x => x.grupoId === m.grupoId).map(x => x.id)) });
  } else btns.push({ label: 'Borrar', cls: 'danger', act: () => del([m.id]) });
  const extra = m.tipo === 'ingreso' && S.movimientos.some(x => x.origenId === m.id) ? ' También se borra el ahorro que se separó con este ingreso.' : '';
  confirmSheet('¿Borrar este movimiento?', `${esc(movTitulo(m))} · ${money(Math.abs(m.monto))}.${extra}`, btns);
}

/* ---------- Vistas ---------- */
let ui = { mes: null, fCat: '', fMedio: '', fComp: false };
function rowMov(m, conFecha) {
  const v = movVisual(m), sh = m.compartido && pareja();
  const sub = [];
  if (conFecha) sub.push(relDay(m.fecha));
  if (m.tipo === 'gasto') { if (!conFecha) sub.push(m.fijoId ? 'Gasto fijo' : cat(m.categoriaId).nombre); sub.push(m.compartido && m.pagoPor === 'pareja' ? 'Pagó ' + pareja() : (MEDIO_CORTO[m.medio] || m.medio)); }
  if (m.tipo === 'ingreso') { sub.push('Ingreso'); if (m.auto && m.fuente !== 'otros') sub.push('con ahorro'); }
  if (m.tipo === 'ahorro') sub.push((m.monto < 0 ? 'Retiro de ' : 'A ') + (meta(m.metaId)?.nombre || 'meta'));
  const sign = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '−' : '';
  const cls = m.tipo === 'ingreso' ? 'in' : m.tipo === 'ahorro' ? 'sav' : '';
  return `<div class="row tap" data-act="edit" data-id="${m.id}"><div class="ico" style="--c:var(--${v.c})">${v.e}</div><div class="txt"><div class="t1">${esc(movTitulo(m))}${sh ? ' <span class="tag">Compartido</span>' : ''}</div><div class="t2">${esc(sub.join(' · '))}</div></div><div class="amt num ${cls}">${m.tipo === 'ahorro' && m.monto < 0 ? '−' : sign}${money(Math.abs(m.monto), m.monto % 1 !== 0)}${sh ? `<small>tu parte ${money(parteMia(m))}</small>` : ''}</div></div>`;
}
function swipeRow(m, conFecha) { return `<div class="sw" data-id="${m.id}"><div class="acts"><button class="a-edit" data-act="edit" data-id="${m.id}">Editar</button><button class="a-del" data-act="delMov" data-id="${m.id}">Borrar</button></div>${rowMov(m, conFecha)}</div>`; }

function vInicio() {
  const k = mkey(today()), r = resumenMes(k), d = new Date();
  const left = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
  const pz = pareja(), ms = movsMes(k);
  let h = `<h1>${cap(monthName(k))}</h1>`;
  if (!S.movimientos.length) h += `<div class="welcome"><b>¡Hola, Santiago!</b> Para arrancar, anotá tu sueldo en la barra de abajo, por ejemplo <b>2400000 sueldo</b>. La app separa sola tu ahorro.<div class="stack"><button class="pill soft" data-act="go" data-v="#ajustes-fijos">Cargar mis gastos fijos</button><button class="pill soft" data-act="ejemplo">Probar con datos de ejemplo</button></div></div>`;
  else if (!ms.some(m => m.tipo === 'ingreso' && m.fuente === 'sueldo')) h += `<div class="card nudge" style="margin-bottom:12px"><span style="font-size:22px">💼</span><div class="txt">¿Ya cobraste el sueldo de ${monthName(k)}? Anotalo abajo, por ejemplo "2400000 sueldo".</div></div>`;
  h += `<div class="card hero"><div class="lbl">Disponible este mes</div><div class="big num ${r.disp < 0 ? 'neg' : ''}">${heroMoney(r.disp)}</div>`;
  if (r.disp > 0) h += `<div class="perday num">≈ ${money(r.disp / left)} por día · ${left === 1 ? 'queda 1 día' : 'quedan ' + left + ' días'}</div>`;
  else if (r.disp < 0 && r.ing > 0) h += `<div class="perday warn">Este mes ya salió más de lo que entró</div>`;
  h += `<div class="formula num"><span>Ingresos</span><span>${money(r.ing)}</span><span>− Ahorro</span><span>${money(r.aho)}</span><span>− Gastos fijos</span><span>${money(r.fij + r.pend)}</span><span>− Gastos del día a día</span><span>${money(r.vari)}</span><span class="tot">Te queda</span><span class="tot">${money(r.disp)}</span></div></div>`;

  if (pz) {
    const b = balance(k);
    if (b.list.length) {
      const t = Math.abs(b.debe) < 1 ? `Están a mano con ${esc(pz)}` : b.debe > 0 ? `${esc(pz)} te debe <b class="pos num">${money(b.debe)}</b>` : `Le debés a ${esc(pz)} <b class="neg num">${money(-b.debe)}</b>`;
      h += `<h2>Con ${esc(pz)}</h2><a class="card mel" href="#cierre"><div class="ico" style="--c:var(--c7)">👫</div><div class="txt"><div class="t1">${t}</div><div class="t2">${S.cierres[k] ? 'Saldado' : 'Gastos compartidos de ' + monthName(k)}</div></div><span class="chev">›</span></a>`;
    }
  }
  const pend = pendientes(k);
  if (pend.length) {
    h += `<h2>Fijos por pagar</h2><div class="card list-card">${pend.map(f => { const c = cat(f.categoriaId); return `<div class="row"><div class="ico" style="--c:var(--${c.color})">${c.emoji}</div><div class="txt"><div class="t1">${esc(f.nombre)}${f.compartido && pz ? ' <span class="tag">Compartido</span>' : ''}</div><div class="t2 num">${f.dia < d.getDate() ? 'Venció el ' : 'Vence el '}${f.dia} · ≈ ${money(f.monto)}</div></div><button class="pill pay" data-act="pagar" data-id="${f.id}">Pagar</button></div>`; }).join('')}</div>`;
  }
  const ult = sortMovs(S.movimientos.filter(m => m.fecha <= today())).slice(0, 5);
  if (ult.length) h += `<h2>Últimos movimientos</h2><div class="card list-card">${ult.map(m => rowMov(m, true)).join('')}<a class="link" href="#movimientos">Ver todos</a></div>`;
  if (S.movimientos.length) {
    const lr = S.config.ultimoRespaldo, dias = lr ? Math.floor((parseD(today()) - parseD(lr)) / 864e5) : null;
    if (dias === null || dias > 7) h += `<h2>Respaldo</h2><div class="card nudge"><span style="font-size:22px">☁️</span><div class="txt">${dias === null ? 'Todavía no guardaste una copia de tus datos.' : `Hace ${dias} días que no guardás una copia.`} Lleva 2 toques.</div><button class="pill pay" data-act="exportar">Guardar</button></div>`;
  }
  return h;
}

function vMovimientos() {
  const k = ui.mes || mkey(today());
  let list = sortMovs(movsMes(k));
  if (ui.fCat) list = list.filter(m => m.tipo === 'gasto' && m.categoriaId === ui.fCat);
  if (ui.fMedio) list = list.filter(m => m.medio === ui.fMedio);
  if (ui.fComp) list = list.filter(m => m.compartido);
  const [y] = k.split('-');
  let h = `<h1>Movimientos</h1><div class="monthbar"><button data-act="mes" data-v="-1" aria-label="Mes anterior">‹</button><b>${cap(monthName(k))} ${y}</b><button data-act="mes" data-v="1" aria-label="Mes siguiente">›</button></div>`;
  h += `<div class="chips"><select class="chip ${ui.fCat ? 'on' : ''}" id="selCat" aria-label="Filtrar por categoría"><option value="">Categoría ▾</option>${S.categorias.map(c => `<option value="${c.id}" ${ui.fCat === c.id ? 'selected' : ''}>${c.emoji} ${esc(c.nombre)}</option>`).join('')}</select><select class="chip ${ui.fMedio ? 'on' : ''}" id="selMedio" aria-label="Filtrar por medio de pago"><option value="">Medio de pago ▾</option>${MEDIOS.map(x => `<option ${ui.fMedio === x ? 'selected' : ''}>${x}</option>`).join('')}</select>${pareja() ? `<button class="chip ${ui.fComp ? 'on' : ''}" data-act="fcompfil">👫 Compartidos</button>` : ''}</div>`;
  if (!list.length) return h + `<div class="empty">No hay movimientos ${ui.fCat || ui.fMedio || ui.fComp ? 'con esos filtros' : 'en ' + monthName(k)}.</div>`;
  const byDay = {};
  for (const m of list) (byDay[m.fecha] = byDay[m.fecha] || []).push(m);
  for (const [dia, ms] of Object.entries(byDay)) {
    const g = ms.filter(m => m.tipo === 'gasto').reduce((a, m) => a + parteMia(m), 0), i = ms.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
    const d = parseD(dia), lab = (relDay(dia) === 'Hoy' ? 'Hoy · ' : relDay(dia) === 'Ayer' ? 'Ayer · ' : '') + DIAS[d.getDay()] + ' ' + d.getDate();
    h += `<div class="day"><span>${lab}</span><span class="num">${[g ? '−' + money(g) : '', i ? '+' + money(i) : ''].filter(Boolean).join(' · ')}</span></div><div class="card list-card">${ms.map(m => swipeRow(m, false)).join('')}</div>`;
  }
  return h + `<div class="hint">Tocá un movimiento para editarlo, o deslizalo hacia la izquierda</div>`;
}

function vCierre() {
  const k = ui.mes && ui.mesCierre ? ui.mesCierre : mkey(today()), pz = pareja() || 'tu pareja';
  const b = balance(k), done = S.cierres[k];
  let h = `<a class="back" href="#inicio">‹ Inicio</a><h1>Cierre con ${esc(pz)}</h1>`;
  if (!b.list.length) return h + `<div class="empty">Todavía no hay gastos compartidos en ${monthName(k)}. Al cargar un gasto, prendé "Compartido con ${esc(pz)}" o escribí su nombre, por ejemplo "18000 super ${esc(norm(pz))}".</div>`;
  const pos = b.debe >= 0, mi = S.config.miParte;
  h += `<div class="card owe"><div class="t2">${cap(monthName(k))} · ${mi === 50 ? 'mitad y mitad' : `vos ${mi} %, ${esc(pz)} ${100 - mi} %`}</div><div class="big num ${Math.abs(b.debe) < 1 ? '' : pos ? 'pos' : 'neg'}">${money(Math.abs(b.debe))}</div><div style="font-size:17px;font-weight:600">${Math.abs(b.debe) < 1 ? 'Están a mano' : pos ? esc(pz) + ' te debe' : 'Le debés a ' + esc(pz)}</div>`;
  h += `<div class="who num"><div>Pagaste vos<b>${money(b.yo)}</b></div><div>Pagó ${esc(pz)}<b>${money(b.ella)}</b></div></div><div class="t2 num" style="margin-top:12px;white-space:normal">Total compartido ${money(b.total)} · a vos te toca ${money(b.total * mi / 100)}</div>${done ? '<span class="done-badge">✓ Saldado</span>' : ''}</div>`;
  h += `<h2>Gastos compartidos</h2><div class="card list-card">${b.list.map(m => { const c = cat(m.categoriaId); return `<div class="row tap" data-act="edit" data-id="${m.id}"><div class="ico" style="--c:var(--${c.color})">${c.emoji}</div><div class="txt"><div class="t1">${esc(movTitulo(m))}</div><div class="t2">${m.pagoPor === 'pareja' ? 'Pagó ' + esc(pz) : 'Pagaste vos'} · ${relDay(m.fecha)}</div></div><div class="amt num">${money(m.monto)}</div></div>`; }).join('')}</div>`;
  h += `<div class="stack" style="margin-top:16px"><button class="btn" data-act="copiarCierre">Copiar resumen para mandarle</button><button class="btn ghost" data-act="saldar">${done ? 'Marcar como pendiente' : 'Marcar como saldado'}</button></div>`;
  return h;
}

/* Gráficos en SVG (livianos y funcionan sin internet) */
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
function donutSVG(segs, center) {
  const tot = segs.reduce((a, s) => a + s.v, 0) || 1; let off = 25, s = '';
  for (const x of segs) { const p = x.v / tot * 100; s += `<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--${x.c})" stroke-width="7" stroke-dasharray="${p.toFixed(2)} ${(100 - p).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>`; off -= p; }
  return `<svg viewBox="0 0 42 42" role="img" aria-label="Gasto por categoría">${s}<text x="21" y="20.5" text-anchor="middle" font-size="4.6" font-weight="700" fill="var(--fg)" font-family="var(--font)">${short(tot)}</text><text x="21" y="26" text-anchor="middle" font-size="3" fill="var(--muted)" font-family="var(--font)">gastado</text></svg>`;
}
function lineSVG(labels, a, b, partialLast) {
  const x0 = 16, x1 = 300, y0 = 12, y1 = 120, n = labels.length;
  const mx = niceMax(Math.max(...a, ...b, 1));
  const X = i => x0 + (x1 - x0) * i / (n - 1), Y = v => y1 - v / mx * (y1 - y0);
  const pts = arr => arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const pa = pts(a), pb = pts(b);
  let s = `<line class="grid" x1="${x0}" x2="${x1 + 4}" y1="${y0}" y2="${y0}"/><line class="grid" x1="${x0}" x2="${x1 + 4}" y1="${(y0 + y1) / 2}" y2="${(y0 + y1) / 2}"/><line class="grid" x1="${x0}" x2="${x1 + 4}" y1="${y1}" y2="${y1}"/>`;
  s += `<text x="${x0}" y="${y0 - 3}">${short(mx)}</text><text x="${x0}" y="${(y0 + y1) / 2 - 3}">${short(mx / 2)}</text>`;
  s += `<polyline fill="none" stroke="var(--in)" stroke-width="2.5" stroke-linejoin="round" points="${pa.join(' ')}"/>`;
  if (partialLast) { s += `<polyline fill="none" stroke="var(--out)" stroke-width="2.5" stroke-linejoin="round" points="${pb.slice(0, -1).join(' ')}"/><polyline fill="none" stroke="var(--out)" stroke-width="2.5" stroke-dasharray="4 4" points="${pb.slice(-2).join(' ')}"/>`; }
  else s += `<polyline fill="none" stroke="var(--out)" stroke-width="2.5" stroke-linejoin="round" points="${pb.join(' ')}"/>`;
  s += `<circle cx="${X(n - 1)}" cy="${Y(a[n - 1])}" r="4" fill="var(--in)"/><circle cx="${X(n - 1)}" cy="${Y(b[n - 1])}" r="4" fill="var(--out)"/>`;
  s += labels.map((l, i) => `<text x="${X(i)}" y="138" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${l}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 320 145" width="100%" role="img" aria-label="Ingresos y gastos de los últimos meses">${s}</svg>`;
}
function vbars(items, color) {
  const mx = Math.max(...items.map(i => i.v), 1);
  return `<div class="vbars num">${items.map(i => `<div><span class="v">${i.v ? short(i.v).replace('$ ', '') : ''}</span><div class="col" style="height:${Math.max(2, i.v / mx * 80)}%;background:var(--${color})"></div>${i.l}</div>`).join('')}</div>`;
}
const DONUT_COLS = ['c1', 'c3', 'c4', 'c5', 'c7', 'c6'];

function vResumen() {
  const k = mkey(today()), r = resumenMes(k), prev = resumenMes(shiftMonth(k, -1));
  const tasa = r.ing ? r.aho / r.ing * 100 : 0;
  const pctVs = (a, b) => b ? Math.round((a - b) / b * 100) : null;
  const vi = pctVs(r.ing, prev.ing);
  let h = `<h1>Resumen</h1><div class="kpis">`;
  h += `<div class="card kpi"><div class="k">Ingresos</div><div class="v num" style="color:var(--in)">${short(r.ing)}</div><div class="s">${vi === null ? cap(monthName(k)) : (vi >= 0 ? '+' : '') + vi + ' % vs. ' + monthName(shiftMonth(k, -1))}</div></div>`;
  h += `<div class="card kpi"><div class="k">Gastos</div><div class="v num">${short(r.gastos)}</div><div class="s">${r.pend ? 'faltan fijos por ' + short(r.pend) : 'tu parte'}</div></div>`;
  h += `<div class="card kpi"><div class="k">Ahorro</div><div class="v num" style="color:var(--accent)">${short(r.aho)}</div><div class="s">${r.dj ? 'incluye DJ' : 'a tus metas'}</div></div>`;
  h += `<div class="card kpi"><div class="k">Tasa de ahorro</div><div class="v num">${Math.round(tasa)} %</div><div class="s">${tasa >= 20 ? 'bien, arriba del 20 %' : r.ing ? 'la meta es 20 %' : 'sin ingresos aún'}</div></div></div>`;

  // 1. Dona por categoría (gastos del día a día)
  const porCat = {};
  for (const m of movsMes(k)) if (m.tipo === 'gasto' && !m.fijoId) porCat[m.categoriaId] = (porCat[m.categoriaId] || 0) + parteMia(m);
  const ord = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  h += `<h2>¿En qué se fue la plata?</h2><div class="card">`;
  if (!ord.length) h += `<p class="ct">Todavía no hay gastos del día a día este mes</p><p class="cs">Cuando anotes gastos, acá ves en qué se va la plata.</p>`;
  else {
    const tot = ord.reduce((a, x) => a + x[1], 0);
    const top = ord.slice(0, 5), rest = ord.slice(5).reduce((a, x) => a + x[1], 0);
    const segs = top.map(([id, v], i) => ({ v, c: DONUT_COLS[i], l: cat(id).emoji + ' ' + cat(id).nombre }));
    if (rest) segs.push({ v: rest, c: 'c6', l: '📦 Resto' });
    const c0 = cat(ord[0][0]), p0 = Math.round(ord[0][1] / tot * 100);
    const pPrev = (() => { let t = 0, x = 0; for (const m of movsMes(shiftMonth(k, -1))) if (m.tipo === 'gasto' && !m.fijoId) { t += parteMia(m); if (m.categoriaId === c0.id) x += parteMia(m); } return t ? x : null; })();
    const delta = pPrev ? Math.round((ord[0][1] - pPrev) / pPrev * 100) : null;
    h += `<p class="ct">${esc(c0.nombre)} es tu gasto más grande: ${p0} %</p><p class="cs">${delta !== null && Math.abs(delta) >= 5 ? `Vas ${Math.abs(delta)} % ${delta > 0 ? 'más' : 'menos'} que todo ${monthName(shiftMonth(k, -1))}. ` : ''}Tu parte, sin los gastos fijos.</p>`;
    h += `<div class="donut">${donutSVG(segs)}<div class="legend num">${segs.map(s => `<div><i style="background:var(--${s.c})"></i><span>${esc(s.l)}</span><b>${Math.round(s.v / tot * 100)} %</b></div>`).join('')}</div></div>`;
  }
  h += `</div>`;

  // 2. Presupuesto vs real
  const conPres = S.categorias.filter(c => c.presupuesto > 0);
  h += `<h2>Presupuesto</h2><div class="card stack">`;
  if (!conPres.length) h += `<p class="ct">Todavía no pusiste presupuestos</p><p class="cs" style="margin:0">Elegí cuánto querés gastar por mes en cada categoría.</p><button class="pill soft" data-act="go" data-v="#ajustes-presupuesto">Poner presupuestos</button>`;
  else {
    const gastoCat = {};
    for (const m of movsMes(k)) if (m.tipo === 'gasto') gastoCat[m.categoriaId] = (gastoCat[m.categoriaId] || 0) + parteMia(m);
    const rows = conPres.map(c => ({ c, g: gastoCat[c.id] || 0, p: (gastoCat[c.id] || 0) / c.presupuesto })).sort((a, b) => b.p - a.p);
    const peor = rows[0];
    h += `<p class="ct">${peor.p > 1 ? `En ${esc(lc(peor.c.nombre))} te pasaste un ${Math.round((peor.p - 1) * 100)} %` : peor.p >= .75 ? `Cuidado con ${esc(lc(peor.c.nombre))}: ya usaste el ${Math.round(peor.p * 100)} %` : 'Vas bien: todas las categorías están en verde'}</p>`;
    h += rows.map(x => `<div><div class="bl"><span>${x.c.emoji} ${esc(x.c.nombre)}</span><span class="num">${money(x.g)} de ${money(x.c.presupuesto)}</span></div><div class="bar"><div class="${x.p > 1 ? 'r' : x.p >= .75 ? 'y' : 'g'}" style="width:${Math.min(100, x.p * 100).toFixed(0)}%"></div></div></div>`).join('');
  }
  h += `</div>`;

  // 3. Últimos 6 meses
  const meses = [...Array(6)].map((_, i) => shiftMonth(k, i - 5));
  const rs = meses.map(resumenMes);
  const conDatos = meses.filter((m, i) => rs[i].ing || rs[i].gastos);
  h += `<h2>Últimos 6 meses</h2><div class="card">`;
  if (conDatos.length < 2) h += `<p class="ct">Acá vas a ver cómo evolucionan tus ingresos y gastos</p><p class="cs" style="margin:0">Aparece cuando tengas al menos dos meses anotados.</p>`;
  else {
    const cerr = meses.slice(0, 5).map((m, i) => ({ m, r: rs[i] })).filter(x => x.r.ing || x.r.gastos);
    const sobro = cerr.filter(x => x.r.ing > x.r.gastos).length;
    const tit = sobro === cerr.length ? (cerr.length > 1 ? `Los últimos ${cerr.length} meses te sobró plata` : 'El mes pasado te sobró plata') : `En ${cerr.length - sobro} de ${cerr.length} meses gastaste más de lo que entró`;
    h += `<p class="ct">${tit}</p>${lineSVG(meses.map((m, i) => mes3(m) + (i === 5 ? '*' : '')), rs.map(x => x.ing), rs.map(x => x.gastos), true)}<div class="key"><span><i style="background:var(--in)"></i>Ingresos</span><span><i style="background:var(--out)"></i>Gastos</span><span class="muted">* mes en curso</span></div>`;
  }
  h += `</div>`;

  // 4. DJ
  const dj = meses.map(m => { const l = movsMes(m).filter(x => x.tipo === 'ingreso' && x.fuente === 'dj'); return { l: mes3(m) + (l.length ? ' · ' + l.length : ''), v: l.reduce((a, x) => a + x.monto, 0) }; });
  const djTot = dj.reduce((a, x) => a + x.v, 0);
  h += `<h2>DJ</h2><div class="card">`;
  if (!djTot) h += `<p class="ct">Cuando cobres una fecha, anotala y va directo a tus metas</p><p class="cs" style="margin:0">Por ejemplo: "200000 fecha dj".</p>`;
  else h += `<p class="ct">Con el DJ juntaste ${short(djTot)} en 6 meses</p><p class="cs">Lo que cobraste por mes y cuántas fechas hiciste. Va a ${esc(meta(S.config.metaDJ)?.nombre || 'tus metas')}.</p>${vbars(dj, 'c7')}`;
  h += `</div>`;

  // 5. Cuotas que vienen
  const fut = [...Array(6)].map((_, i) => shiftMonth(k, i + 1)).map(m => ({ m, l: mes3(m), v: movsMes(m).filter(x => x.tipo === 'gasto' && x.grupoId).reduce((a, x) => a + parteMia(x), 0) }));
  const futTot = fut.reduce((a, x) => a + x.v, 0);
  h += `<h2>Cuotas que vienen</h2><div class="card">`;
  if (!futTot) h += `<p class="ct">No tenés cuotas pendientes para los próximos meses</p>`;
  else { const ultimo = [...fut].reverse().find(x => x.v); h += `<p class="ct">Ya tenés ${money(futTot)} comprometidos en cuotas hasta ${MESES[Number(ultimo.m.slice(5)) - 1]}</p><p class="cs">Lo que vas a pagar de tarjeta por compras que ya hiciste.</p>${vbars(fut, 'c4')}`; }
  h += `</div>`;
  return h;
}

function vMetas() {
  let h = `<h1>Metas</h1><div class="stack">`;
  S.metas.forEach((m, i) => {
    const j = metaJuntado(m.id), obj = Number(m.objetivo) || 0, p = obj ? Math.min(1, j / obj) : 0;
    const meses = monthsUntil(m.fecha), falta = Math.max(0, obj - j);
    let tip;
    if (!obj) tip = 'Tocá para ponerle un monto y una fecha.';
    else if (falta <= 0) tip = '🎉 ¡Llegaste! Ya juntaste todo.';
    else if (!m.fecha) tip = `Te faltan <b>${money(falta)}</b>. Ponele una fecha y te digo cuánto separar por mes.`;
    else if (meses <= 0) tip = `La fecha ya llegó y te faltan <b>${money(falta)}</b>. Podés mover la fecha.`;
    else tip = `Para llegar, separá <b>${money(Math.ceil(falta / meses))} por mes</b> (${meses} ${meses === 1 ? 'mes' : 'meses'}).`;
    const roles = [];
    if (S.config.metaAhorro === m.id) roles.push(`el ${S.config.ahorroPct} % del sueldo`);
    if (S.config.metaDJ === m.id) roles.push('las fechas de DJ');
    if (S.config.extraCasa === m.id) roles.push(`el ${S.config.extraPctCasa} % de aguinaldo y bono`);
    if (S.config.extraCorto === m.id) roles.push(`el ${100 - S.config.extraPctCasa} % de aguinaldo y bono`);
    h += `<div class="card goal" data-act="meta" data-id="${m.id}"><div class="top"><div class="ico" style="--c:var(--${m.color})">${m.emoji}</div><div><div class="name">${esc(m.nombre)}</div><div class="sub">${m.fecha ? 'Para ' + fechaLarga(m.fecha) : 'Sin fecha'}</div></div>${i === 0 ? '<span class="prio">Primero</span>' : ''}</div>`;
    h += `<div class="bar"><div style="width:${(p * 100).toFixed(1)}%;background:var(--${m.color})"></div></div><div class="nums num"><span>${money(j)} juntados</span><span>${obj ? 'de ' + money(obj) : ''}</span></div><div class="tip num">${tip}${roles.length ? `<br><span class="muted">Acá va ${roles.join(' y ')}.</span>` : ''}</div></div>`;
  });
  const c = S.config, now = new Date(), mth = now.getMonth() + 1;
  const prox = mth < 4 ? 'el bono de abril' : mth < 6 ? 'el aguinaldo de junio' : mth < 12 ? 'el aguinaldo de diciembre' : 'el aguinaldo de diciembre';
  const ultSueldo = sortMovs(S.movimientos.filter(m => m.tipo === 'ingreso' && m.fuente === 'sueldo'))[0];
  const est = ultSueldo ? ultSueldo.monto / 2 : 0;
  h += `<h2 style="margin-bottom:0">Aguinaldo y bono</h2><div class="card" data-act="go" data-v="#ajustes-extra" style="cursor:pointer"><p class="ct">Así se reparte ${prox}</p><p class="cs num">${est && prox.includes('aguinaldo') ? '≈ ' + money(est) + ' (medio sueldo) · ' : ''}se reparte solo cuando lo anotás</p>`;
  h += `<div class="split num"><div style="flex:${c.extraPctCasa};background:var(--${meta(c.extraCasa)?.color || 'c9'})">${c.extraPctCasa} %</div><div style="flex:${100 - c.extraPctCasa};background:var(--${meta(c.extraCorto)?.color || 'c2'})">${100 - c.extraPctCasa} %</div></div>`;
  h += `<div class="bl" style="margin:0"><span>${meta(c.extraCasa)?.emoji || ''} ${esc(meta(c.extraCasa)?.nombre || '—')}</span><span class="num">${est && prox.includes('aguinaldo') ? money(est * c.extraPctCasa / 100) : c.extraPctCasa + ' %'}</span></div><div class="bl" style="margin:0"><span>${meta(c.extraCorto)?.emoji || ''} ${esc(meta(c.extraCorto)?.nombre || '—')}</span><span class="num">${est && prox.includes('aguinaldo') ? money(est * (100 - c.extraPctCasa) / 100) : (100 - c.extraPctCasa) + ' %'}</span></div></div>`;
  h += `<button class="btn ghost" data-act="meta" data-id="">＋ Nueva meta</button></div>`;
  return h;
}

function vAjustes() {
  const c = S.config, mn = id => esc(meta(id)?.nombre || '—');
  let h = `<h1>Ajustes</h1><h2>Categorías</h2><div class="list"><div class="catgrid">${S.categorias.map(x => `<button data-act="cat" data-id="${x.id}"><span class="ico sm" style="--c:var(--${x.color})">${x.emoji}</span><span>${esc(x.nombre)}</span></button>`).join('')}<button data-act="cat" data-id=""><span class="ico sm" style="--c:var(--line)">＋</span><span>Nueva</span></button></div></div>`;
  h += `<h2>Tu plata</h2><div class="list">`;
  h += `<button class="li" data-act="go" data-v="#ajustes-presupuesto"><span class="txt">Presupuesto por categoría</span><span class="val num">${S.categorias.filter(x => x.presupuesto > 0).length || 'Sin cargar'}</span><span class="chev">›</span></button>`;
  h += `<button class="li" data-act="go" data-v="#ajustes-fijos"><span class="txt">Gastos fijos</span><span class="val">${S.fijos.length || 'Sin cargar'}</span><span class="chev">›</span></button>`;
  h += `<button class="li" data-act="cfgAhorro"><span class="txt">Ahorro al cobrar el sueldo</span><span class="val">${c.ahorroPct} % a ${mn(c.metaAhorro)}</span><span class="chev">›</span></button>`;
  h += `<button class="li" data-act="cfgDJ"><span class="txt">Fechas de DJ van a</span><span class="val">${mn(c.metaDJ)}</span><span class="chev">›</span></button>`;
  h += `<button class="li" data-act="go" data-v="#ajustes-extra"><span class="txt">Aguinaldo y bono</span><span class="val">${c.extraPctCasa} / ${100 - c.extraPctCasa}</span><span class="chev">›</span></button></div>`;
  h += `<h2>Compartido</h2><div class="list"><div class="li static"><span class="txt">Gastos compartidos</span><button class="tog ${c.parejaOn ? 'on' : ''}" data-act="togPareja" aria-label="Gastos compartidos"></button></div>`;
  if (c.parejaOn) h += `<button class="li" data-act="cfgPareja"><span class="txt">Con quién y cómo se reparte</span><span class="val">${esc(c.pareja)} · ${c.miParte === 50 ? 'mitad y mitad' : c.miParte + ' / ' + (100 - c.miParte)}</span><span class="chev">›</span></button>`;
  h += `</div>`;
  const lr = c.ultimoRespaldo;
  h += `<h2>Respaldo</h2><div class="list"><button class="li" data-act="exportar"><span class="txt">Guardar copia<div class="t2">Se abre Compartir y elegís Drive</div></span><span class="chev">›</span></button><button class="li" data-act="importar"><span class="txt">Recuperar desde una copia</span><span class="chev">›</span></button><button class="li" data-act="csv"><span class="txt">Exportar para Excel</span><span class="chev">›</span></button></div>`;
  h += `<p class="foot">${lr ? 'Última copia: ' + relDay(lr).toLowerCase().replace(/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) /, 'el ') : 'Todavía no guardaste ninguna copia'}. Tus datos quedan solo en este iPhone.</p>`;
  h += `<h2>Apariencia</h2><div class="list"><div class="li static"><span class="txt">Tema</span><div class="seg">${[['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<button class="${c.tema === v ? 'on' : ''}" data-act="tema" data-v="${v}">${l}</button>`).join('')}</div></div></div>`;
  h += `<h2>Datos</h2><div class="list"><button class="li" data-act="ejemplo"><span class="txt">Probar con datos de ejemplo</span><span class="chev">›</span></button><button class="li" data-act="borrarTodo"><span class="txt" style="color:var(--out)">Borrar todos los datos</span></button></div>`;
  h += `<p class="foot">Plata Clara · versión 1.0</p>`;
  return h;
}
function vFijos() {
  let h = `<a class="back" href="#ajustes">‹ Ajustes</a><h1>Gastos fijos</h1>`;
  if (!S.fijos.length) h += `<div class="empty">Cargá lo que pagás todos los meses: alquiler, luz, internet, celular, suscripciones. Cada mes te aparecen en Inicio para marcarlos con un toque.</div>`;
  else {
    const tot = S.fijos.filter(f => f.activo !== false).reduce((a, f) => a + (f.compartido && pareja() ? f.monto * S.config.miParte / 100 : f.monto), 0);
    h += `<div class="card list-card">${S.fijos.slice().sort((a, b) => a.dia - b.dia).map(f => { const c = cat(f.categoriaId); return `<div class="row tap" data-act="fijo" data-id="${f.id}"><div class="ico" style="--c:var(--${c.color})">${c.emoji}</div><div class="txt"><div class="t1">${esc(f.nombre)}${f.compartido && pareja() ? ' <span class="tag">Compartido</span>' : ''}</div><div class="t2">Día ${f.dia}${f.activo === false ? ' · pausado' : ''}</div></div><div class="amt num">${money(f.monto)}</div></div>`; }).join('')}</div><p class="foot num">Total por mes (tu parte): ${money(tot)}</p>`;
  }
  return h + `<div style="margin-top:16px"><button class="btn" data-act="fijo" data-id="">＋ Agregar gasto fijo</button></div>`;
}
function vPresupuesto() {
  const tot = S.categorias.reduce((a, c) => a + (Number(c.presupuesto) || 0), 0);
  let h = `<a class="back" href="#ajustes">‹ Ajustes</a><h1>Presupuesto</h1><p class="foot" style="margin:0 4px 12px">Cuánto querés gastar por mes en cada categoría. Dejalo vacío si no querés controlarla.</p><div class="card list-card">`;
  h += S.categorias.map(c => `<div class="row"><div class="ico" style="--c:var(--${c.color})">${c.emoji}</div><div class="txt"><div class="t1">${esc(c.nombre)}</div></div><input class="num" style="width:130px;min-height:40px;border-radius:10px;border:1px solid var(--line);background:var(--bg);padding:0 10px;text-align:right" inputmode="numeric" data-pres="${c.id}" value="${c.presupuesto ? nf0.format(c.presupuesto) : ''}" placeholder="$ 0" aria-label="Presupuesto ${esc(c.nombre)}"></div>`).join('');
  h += `</div><p class="foot num" id="presTot">Total: ${money(tot)} por mes</p>`;
  const sueldo = sortMovs(S.movimientos.filter(m => m.tipo === 'ingreso' && m.fuente === 'sueldo'))[0];
  if (sueldo) {
    const fij = S.fijos.filter(f => f.activo !== false).reduce((a, f) => a + (f.compartido && pareja() ? f.monto * S.config.miParte / 100 : f.monto), 0);
    const libre = sueldo.monto * (1 - S.config.ahorroPct / 100) - fij;
    h += `<p class="foot num">Con tu sueldo, después del ahorro y los fijos te quedan ${money(libre)} para el día a día.${tot > libre ? ' <b style="color:var(--out)">Tus presupuestos suman más que eso.</b>' : ''}</p>`;
  }
  return h;
}
function vExtra() {
  const c = S.config;
  const opts = sel => S.metas.map(m => `<option value="${m.id}" ${sel === m.id ? 'selected' : ''}>${m.emoji} ${esc(m.nombre)}</option>`).join('');
  return `<a class="back" href="#ajustes">‹ Ajustes</a><h1>Aguinaldo y bono</h1><p class="foot" style="margin:0 4px 12px">Cuando anotás un aguinaldo o un bono, se reparte solo entre dos metas.</p><div class="card form">
  <label class="field">Meta de largo plazo<select id="exCasa">${opts(c.extraCasa)}</select></label>
  <label class="field">Porcentaje para esa meta<input id="exPct" inputmode="numeric" value="${c.extraPctCasa}"><span class="hintline">El resto (${100 - c.extraPctCasa} %) va a la meta de corto plazo.</span></label>
  <label class="field">Meta de corto plazo<select id="exCorto">${opts(c.extraCorto)}</select></label>
  <button class="btn" data-act="saveExtra">Guardar</button></div>`;
}

/* ---------- Hojas de edición ---------- */
function sheetCat(id) {
  const c = id ? cat(id) : { id: '', nombre: '', emoji: '🏷️', color: 'c4', presupuesto: 0 };
  let h = `<div class="grab"></div><div class="shead"><button data-act="close">Cancelar</button><b>${id ? 'Categoría' : 'Nueva categoría'}</b><button data-act="saveCat" data-id="${c.id}">Guardar</button></div><div class="form">`;
  h += `<label class="field">Nombre<input id="cNom" value="${esc(c.nombre)}" maxlength="24"></label><label class="field">Emoji<input id="cEmo" value="${esc(c.emoji)}" maxlength="4" style="font-size:24px"></label>`;
  h += `<div class="field">Color<div class="colors" id="cCol">${COLORES.map(x => `<button type="button" class="${c.color === x ? 'on' : ''}" style="--c:var(--${x})" data-act="pickColor" data-v="${x}" aria-label="Color"></button>`).join('')}</div></div>`;
  h += `<label class="field">Presupuesto por mes<input id="cPres" inputmode="numeric" value="${c.presupuesto ? nf0.format(c.presupuesto) : ''}" placeholder="$ 0"></label>`;
  h += `<button class="btn" data-act="saveCat" data-id="${c.id}">Guardar</button>${id && id !== 'otros' ? `<button class="btn danger" data-act="delCat" data-id="${id}">Borrar categoría</button>` : ''}</div>`;
  openSheet(h); $('#cCol').dataset.v = c.color;
}
function sheetFijo(id) {
  const f = id ? S.fijos.find(x => x.id === id) : { id: '', nombre: '', monto: 0, categoriaId: 'serv', dia: 10, activo: true, compartido: false };
  let h = `<div class="grab"></div><div class="shead"><button data-act="close">Cancelar</button><b>${id ? 'Gasto fijo' : 'Nuevo gasto fijo'}</b><button data-act="saveFijo" data-id="${f.id}">Guardar</button></div><div class="form">`;
  h += `<label class="field">Nombre<input id="fjNom" value="${esc(f.nombre)}" placeholder="Ej: Alquiler" maxlength="30"></label>`;
  h += `<label class="field">Monto aproximado por mes<input id="fjMonto" inputmode="numeric" value="${f.monto ? nf0.format(f.monto) : ''}" placeholder="$ 0"></label>`;
  h += `<label class="field">Día en que vence<input id="fjDia" inputmode="numeric" value="${f.dia}"></label>`;
  h += `<label class="field">Categoría<select id="fjCat">${S.categorias.map(c => `<option value="${c.id}" ${f.categoriaId === c.id ? 'selected' : ''}>${c.emoji} ${esc(c.nombre)}</option>`).join('')}</select></label>`;
  if (pareja()) h += `<div class="optrow"><span>👫 Compartido con ${esc(pareja())}</span><button class="tog ${f.compartido ? 'on' : ''}" id="fjComp" data-act="tog" aria-label="Compartido"></button></div>`;
  h += `<div class="optrow"><span>Activo</span><button class="tog ${f.activo !== false ? 'on' : ''}" id="fjAct" data-act="tog" aria-label="Activo"></button></div>`;
  h += `<button class="btn" data-act="saveFijo" data-id="${f.id}">Guardar</button>${id ? `<button class="btn danger" data-act="delFijo" data-id="${id}">Borrar gasto fijo</button>` : ''}</div>`;
  openSheet(h);
}
function sheetMeta(id) {
  const m = id ? meta(id) : { id: '', nombre: '', emoji: '🎯', color: 'c5', objetivo: 0, fecha: '', inicial: 0 };
  const idx = S.metas.findIndex(x => x.id === id);
  let h = `<div class="grab"></div><div class="shead"><button data-act="close">Cancelar</button><b>${id ? esc(m.nombre) : 'Nueva meta'}</b><button data-act="saveMeta" data-id="${m.id}">Guardar</button></div>`;
  if (id) h += `<div class="stack" style="flex-direction:row;margin:6px 0 10px"><button class="btn" style="margin:0" data-act="aportar" data-id="${id}">＋ Aportar</button><button class="btn ghost" style="margin:0" data-act="retirar" data-id="${id}">Sacar</button></div><p class="foot num" style="margin:0 4px">Juntado: ${money(metaJuntado(id))}</p>`;
  h += `<div class="form"><label class="field">Nombre<input id="mNom" value="${esc(m.nombre)}" maxlength="30"></label><label class="field">Emoji<input id="mEmo" value="${esc(m.emoji)}" maxlength="4" style="font-size:24px"></label>`;
  h += `<div class="field">Color<div class="colors" id="cCol">${COLORES.map(x => `<button type="button" class="${m.color === x ? 'on' : ''}" style="--c:var(--${x})" data-act="pickColor" data-v="${x}" aria-label="Color"></button>`).join('')}</div></div>`;
  h += `<label class="field">Monto objetivo<input id="mObj" inputmode="numeric" value="${m.objetivo ? nf0.format(m.objetivo) : ''}" placeholder="$ 0"></label>`;
  h += `<label class="field">Fecha objetivo<input id="mFecha" type="month" value="${m.fecha ? m.fecha.slice(0, 7) : ''}"></label>`;
  h += `<label class="field">Lo que ya tenías juntado antes de usar la app<input id="mIni" inputmode="numeric" value="${m.inicial ? nf0.format(m.inicial) : ''}" placeholder="$ 0"></label>`;
  h += `<button class="btn" data-act="saveMeta" data-id="${m.id}">Guardar</button>`;
  if (id && idx > 0) h += `<button class="btn ghost" data-act="subirMeta" data-id="${id}">Subir prioridad</button>`;
  if (id && S.metas.length > 1) h += `<button class="btn danger" data-act="delMeta" data-id="${id}">Borrar meta</button>`;
  h += `</div>`;
  openSheet(h); $('#cCol').dataset.v = m.color;
}
function sheetSelectMeta(title, current, pct, onSave) {
  let h = `<div class="grab"></div><div class="shead"><button data-act="close">Cancelar</button><b>${title}</b><button id="okSel">Guardar</button></div><div class="form">`;
  if (pct !== null) h += `<label class="field">Porcentaje del sueldo<input id="selPct" inputmode="numeric" value="${pct}"><span class="hintline">Te recomiendo 20 %. Se separa apenas anotás el sueldo.</span></label>`;
  h += `<label class="field">Meta<select id="selMeta">${S.metas.map(m => `<option value="${m.id}" ${current === m.id ? 'selected' : ''}>${m.emoji} ${esc(m.nombre)}</option>`).join('')}</select></label><button class="btn" id="okSel2">Guardar</button></div>`;
  openSheet(h);
  const go = () => { onSave($('#selMeta').value, pct !== null ? parseNum($('#selPct').value) : null); save(); closeSheet(); render(); toast('✓ Guardado'); };
  $('#okSel').onclick = go; $('#okSel2').onclick = go;
}
function sheetPareja() {
  const c = S.config;
  openSheet(`<div class="grab"></div><div class="shead"><button data-act="close">Cancelar</button><b>Compartido</b><button data-act="savePareja">Guardar</button></div><div class="form"><label class="field">Nombre<input id="pNom" value="${esc(c.pareja)}" maxlength="20"></label><label class="field">Tu parte de cada gasto compartido (%)<input id="pPct" inputmode="numeric" value="${c.miParte}"><span class="hintline">50 es mitad y mitad. Si ganás más y querés poner más, subilo.</span></label><button class="btn" data-act="savePareja">Guardar</button></div>`);
}
function confirmSheet(title, text, btns) {
  let h = `<div class="grab"></div><div class="confirm"><b style="font-size:18px">${title}</b><p>${text}</p>`;
  btns.forEach((b, i) => h += `<button class="btn ${b.cls || ''}" data-cb="${i}">${b.label}</button>`);
  h += `<button class="btn ghost" data-act="close">Cancelar</button></div>`;
  openSheet(h);
  $('#sheet').querySelectorAll('[data-cb]').forEach(el => el.onclick = () => btns[Number(el.dataset.cb)].act());
}

/* ---------- Respaldo ---------- */
async function shareOrDownload(name, text, type) {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true;
  } catch (e) { toast('No pude crear el archivo en esta vista'); return false; }
}
async function exportar() {
  const ok = await shareOrDownload(`plata-clara-respaldo-${today()}.json`, JSON.stringify(S, null, 1), 'application/json');
  if (ok) { S.config.ultimoRespaldo = today(); save(); render(); toast('✓ Copia lista'); }
}
async function exportarCSV() {
  const q = v => { v = String(v ?? ''); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const num = n => String(Math.round(n * 100) / 100).replace('.', ',');
  const rows = [['Fecha', 'Tipo', 'Categoría / Fuente / Meta', 'Detalle', 'Monto', 'Tu parte', 'Medio de pago', 'Cuota', 'Compartido', 'Pagó']];
  for (const m of sortMovs(S.movimientos).reverse()) {
    const grupo = m.tipo === 'gasto' ? cat(m.categoriaId).nombre : m.tipo === 'ingreso' ? (FUENTES[m.fuente]?.nombre || '') : (meta(m.metaId)?.nombre || '');
    rows.push([m.fecha.split('-').reverse().join('/'), cap(m.tipo), grupo, movTitulo(m), num(m.monto), num(m.tipo === 'gasto' ? parteMia(m) : m.monto), m.medio || '', m.cuotas > 1 ? `${m.cuotaNumero}/${m.cuotas}` : '', m.compartido ? 'Sí' : '', m.compartido ? (m.pagoPor === 'pareja' ? pareja() : 'Yo') : '']);
  }
  await shareOrDownload(`plata-clara-${today()}.csv`, '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n'), 'text/csv');
}
function importar(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let d; try { d = JSON.parse(rd.result); } catch (e) { toast('Ese archivo no es una copia de Plata Clara'); return; }
    if (!d || !Array.isArray(d.movimientos) || !d.config) { toast('Ese archivo no es una copia de Plata Clara'); return; }
    confirmSheet('¿Recuperar esta copia?', `Tiene ${d.movimientos.length} movimientos. Reemplaza todo lo que hay ahora en la app.`, [{ label: 'Sí, recuperar', act: () => { S = d; migrate(); save(); applyTheme(); closeSheet(); render(); toast('✓ Copia recuperada'); } }]);
  };
  rd.readAsText(file);
}

/* ---------- Datos de ejemplo ---------- */
function cargarEjemplo() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const R = (a, b) => Math.round((a + rnd() * (b - a)) / 50) * 50;
  S = defaults(); S.config.ejemplo = true; S.config.ultimoRespaldo = ymd(new Date(Date.now() - 3 * 864e5));
  const P = { super: 200000, comida: 100000, trans: 130000, salidas: 120000, ropa: 80000, dj: 60000 };
  S.categorias.forEach(c => c.presupuesto = P[c.id] || 0);
  S.fijos = [
    { id: 'f1', nombre: 'Alquiler', monto: 450000, categoriaId: 'viv', dia: 5, activo: true, compartido: true },
    { id: 'f2', nombre: 'Luz', monto: 38000, categoriaId: 'serv', dia: 25, activo: true, compartido: true },
    { id: 'f3', nombre: 'Internet', monto: 25000, categoriaId: 'serv', dia: 10, activo: true, compartido: true },
    { id: 'f4', nombre: 'Celular', monto: 18500, categoriaId: 'serv', dia: 28, activo: true, compartido: false },
    { id: 'f5', nombre: 'Streaming', monto: 9900, categoriaId: 'subs', dia: 30, activo: true, compartido: false },
    { id: 'f6', nombre: 'Gimnasio', monto: 30000, categoriaId: 'salud', dia: 8, activo: true, compartido: false }
  ];
  const t = today(), k = mkey(t), td = parseD(t).getDate();
  const ms = Object.fromEntries(S.metas.map(m => [m.id, m]));
  Object.assign(ms['m-emerg'], { objetivo: 4200000, fecha: addMonths(k + '-01', 5), inicial: 900000 });
  Object.assign(ms['m-casa'], { objetivo: 24000000, fecha: addMonths(k + '-01', 37), inicial: 1200000 });
  Object.assign(ms['m-viaje'], { objetivo: 1500000, fecha: addMonths(k + '-01', 8), inicial: 150000 });
  Object.assign(ms['m-auto'], { objetivo: 8000000, fecha: addMonths(k + '-01', 25), inicial: 0 });
  const add = m => { const x = { id: uid(), creado: Date.now() + S.movimientos.length, ...m }; S.movimientos.push(x); return x; };
  const djN = [1, 2, 1, 3, 2, 2];
  for (let i = 5; i >= 0; i--) {
    const mk = shiftMonth(k, -i), last = i ? new Date(+mk.slice(0, 4), +mk.slice(5), 0).getDate() : td;
    const F = d => mk + '-' + pad2(d);
    autoAhorro(add({ tipo: 'ingreso', fuente: 'sueldo', monto: 2400000, fecha: F(1), medio: 'Transferencia', auto: true, nota: '' }));
    const mm = Number(mk.slice(5));
    if (mm === 6 || mm === 12) { if (last >= 18) autoAhorro(add({ tipo: 'ingreso', fuente: 'aguinaldo', monto: 1200000, fecha: F(18), medio: 'Transferencia', auto: true, nota: '' })); }
    if (mm === 4 && last >= 15) autoAhorro(add({ tipo: 'ingreso', fuente: 'bono', monto: 600000, fecha: F(15), medio: 'Transferencia', auto: true, nota: '' }));
    for (const f of S.fijos) if (f.dia <= last && !(i === 0 && f.dia > td - 1)) add({ tipo: 'gasto', categoriaId: f.categoriaId, monto: Math.round(f.monto * (0.95 + rnd() * 0.1)), fecha: F(Math.min(f.dia, last)), medio: 'Débito', fijoId: f.id, compartido: f.compartido, pagoPor: f.id === 'f2' ? 'pareja' : 'yo', nota: '' });
    for (let n = 0; n < djN[5 - i]; n++) { const d = Math.min(last, 6 + n * 7 + Math.floor(rnd() * 3)); if (d <= last) autoAhorro(add({ tipo: 'ingreso', fuente: 'dj', monto: 200000, fecha: F(d), medio: 'Transferencia', auto: true, nota: 'Fecha DJ' })); }
    for (let d = 1; d <= last; d++) {
      const x = rnd();
      if (x < .32) add({ tipo: 'gasto', categoriaId: 'super', monto: R(6000, 26000), fecha: F(d), medio: rnd() < .6 ? 'Débito' : 'Mercado Pago', compartido: rnd() < .6, pagoPor: rnd() < .2 ? 'pareja' : 'yo', nota: '' });
      else if (x < .52) add({ tipo: 'gasto', categoriaId: 'comida', monto: R(7000, 19000), fecha: F(d), medio: 'Mercado Pago', compartido: rnd() < .4, pagoPor: 'yo', nota: rnd() < .5 ? 'Delivery' : '' });
      else if (x < .68) add({ tipo: 'gasto', categoriaId: 'trans', monto: R(10000, 28000), fecha: F(d), medio: 'Efectivo', nota: 'Nafta' });
      else if (x < .78) add({ tipo: 'gasto', categoriaId: 'salidas', monto: R(12000, 38000), fecha: F(d), medio: 'Débito', nota: '' });
      else if (x < .82) add({ tipo: 'gasto', categoriaId: 'dj', monto: R(8000, 30000), fecha: F(d), medio: 'Mercado Pago', nota: 'Cables' });
    }
  }
  const grupo = (nota, catId, total, n, fecha) => { const g = uid(); for (let j = 0; j < n; j++) add({ tipo: 'gasto', categoriaId: catId, monto: Math.round(total / n), cuotas: n, cuotaNumero: j + 1, grupoId: g, fecha: addMonths(fecha, j), medio: 'Tarjeta de crédito', nota }); };
  grupo('Zapatillas', 'ropa', 135000, 3, shiftMonth(k, -1) + '-12');
  grupo('Auriculares DJ', 'dj', 324000, 6, shiftMonth(k, -2) + '-20');
  grupo('Heladera', 'viv', 960000, 12, shiftMonth(k, -3) + '-03');
  save(); closeSheet(); location.hash = '#inicio'; render(); toast('✓ Datos de ejemplo cargados');
}

/* ---------- Interfaz general ---------- */
function openSheet(html) { const s = $('#sheet'); s.innerHTML = html; s.scrollTop = 0; s.classList.add('on'); $('#scrim').classList.add('on'); }
function closeSheet() { $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); F = null; }
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2000); }
function haptic() { try { navigator.vibrate && navigator.vibrate(15); } catch (e) { } try { $('#hap').click(); } catch (e) { } }
function applyTheme() { const r = document.documentElement; if (S.config.tema === 'light' || S.config.tema === 'dark') r.dataset.theme = S.config.tema; else delete r.dataset.theme; }

const VIEWS = { inicio: vInicio, movimientos: vMovimientos, resumen: vResumen, metas: vMetas, ajustes: vAjustes, cierre: vCierre, 'ajustes-fijos': vFijos, 'ajustes-presupuesto': vPresupuesto, 'ajustes-extra': vExtra };
let lastView = '';
function render() {
  let v = (location.hash || '#inicio').slice(1); if (!VIEWS[v]) v = 'inicio';
  const app = $('#app'), keep = v === lastView ? window.scrollY : 0;
  app.innerHTML = `<section class="screen">${VIEWS[v]()}</section>`;
  if (v !== lastView) window.scrollTo(0, 0); else window.scrollTo(0, keep);
  const tab = v === 'cierre' ? 'inicio' : v.startsWith('ajustes') ? 'ajustes' : v;
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.s === tab));
  $('#chat').hidden = v !== 'inicio'; document.body.classList.toggle('chaton', v === 'inicio');
  lastView = v;
  renderExamples();
}
function renderExamples() {
  const ex = $('#examples'), pz = pareja();
  const show = !$('#chatIn').value.trim() && S.movimientos.filter(m => !S.config.ejemplo).length < 25;
  ex.hidden = !show;
  if (show) ex.innerHTML = ['3500 super', '45000 zapatillas tarjeta 3', pz ? `18000 delivery mp ${norm(pz).slice(0, 4)}` : '18000 delivery mp', '200000 fecha dj', '2400000 sueldo'].map(t => `<button type="button">${esc(t)}</button>`).join('');
}

/* Chat */
let chatF = null;
function chatPreview() {
  chatF = parseChat($('#chatIn').value);
  $('#sendBtn').disabled = !chatF; $('#preview').hidden = !chatF; renderExamples();
  if (!chatF) return;
  const f = chatF, n = parseNum(f.monto);
  let e, c, t1, bits = [relDay(f.fecha)], amt;
  if (f.tipo === 'gasto') { const k = cat(f.categoriaId); e = k.emoji; c = k.color; t1 = f.nota || k.nombre; bits.push(k.nombre !== t1 ? k.nombre : null, f.compartido && f.pagoPor === 'pareja' ? 'Pagó ' + pareja() : (MEDIO_CORTO[f.medio] || f.medio)); if (f.cuotas > 1) bits.push(`${f.cuotas} cuotas de ${money(n / f.cuotas)}`); if (f.compartido) bits.push('Compartido'); amt = '−' + money(n) + (f.compartido ? `<small>tu parte ${money(n * S.config.miParte / 100)}</small>` : ''); }
  else if (f.tipo === 'ingreso') { const s = FUENTES[f.fuente]; e = s.emoji; c = s.color; t1 = f.nota || s.nombre; bits.push('Ingreso'); const tx = f.auto ? autoAhorroTexto(f.fuente) : ''; if (tx) bits.push(tx); amt = '+' + money(n); }
  else { const m = meta(f.metaId); e = m?.emoji || '🐷'; c = 'accent'; t1 = f.nota || 'Ahorro'; bits.push('A ' + (m?.nombre || 'meta')); amt = money(n); }
  $('#preview').innerHTML = `<span class="ico" style="--c:var(--${c})">${e}</span><span class="txt"><span class="t1" style="display:block">${esc(t1)}</span><span class="t2" style="display:block">${esc(bits.filter(Boolean).join(' · '))}</span><span class="edit">Tocá para ajustar</span></span><span class="amt num ${f.tipo === 'ingreso' ? 'in' : f.tipo === 'ahorro' ? 'sav' : ''}">${amt}</span>`;
}

/* Deslizar para editar o borrar */
let sw = null;
document.addEventListener('touchstart', e => {
  const el = e.target.closest('.sw'); document.querySelectorAll('.sw.open').forEach(o => { if (o !== el) { o.classList.remove('open'); o.querySelector('.row').style.transform = ''; } });
  if (!el) return; sw = { el, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, base: el.classList.contains('open') ? -148 : 0, lock: null };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return; const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
  if (sw.lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) sw.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (sw.lock !== 'x') return;
  sw.dx = dx; sw.el.classList.add('drag'); sw.el.querySelector('.row').style.transform = `translateX(${Math.min(0, Math.max(-170, sw.base + dx))}px)`;
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!sw) return; const { el, lock, base, dx } = sw; sw = null; el.classList.remove('drag');
  if (lock !== 'x') return;
  const open = base + dx < -70; el.classList.toggle('open', open); el.querySelector('.row').style.transform = open ? 'translateX(-148px)' : '';
  el.dataset.justSwiped = '1'; setTimeout(() => delete el.dataset.justSwiped, 300);
});

/* Clicks */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, id = t.dataset.id, v = t.dataset.v;
  const swEl = t.closest('.sw'); if (swEl && swEl.dataset.justSwiped && a === 'edit' && t.classList.contains('row')) return;
  if (swEl && swEl.classList.contains('open') && t.classList.contains('row')) { swEl.classList.remove('open'); swEl.querySelector('.row').style.transform = ''; return; }
  switch (a) {
    case 'close': closeSheet(); break;
    case 'go': closeSheet(); location.hash = v; break;
    case 'nuevo': openMovForm(blankForm()); break;
    case 'edit': { const m = S.movimientos.find(x => x.id === id); if (m) openMovForm(formFromMov(m)); break; }
    case 'delMov': askDelete(id); break;
    case 'saveMov': saveMov(); break;
    case 'ftipo': F.tipo = v; if (v === 'ingreso') { F.medio = 'Transferencia'; F.auto = true; } else if (v === 'gasto') F.medio = S.config.ultimoMedio || 'Débito'; rerenderForm(); break;
    case 'fcat': F.categoriaId = v; rerenderForm(); break;
    case 'fmedio': F.medio = v; if (v !== 'Tarjeta de crédito') F.cuotas = 1; rerenderForm(); break;
    case 'fcuota': F.cuotas = Math.max(1, Math.min(48, F.cuotas + Number(v))); rerenderForm(); break;
    case 'fcomp': F.compartido = !F.compartido; rerenderForm(); break;
    case 'fpago': F.pagoPor = v; rerenderForm(); break;
    case 'ffuente': F.fuente = v; F.auto = v !== 'otros'; rerenderForm(); break;
    case 'fauto': F.auto = !F.auto; rerenderForm(); break;
    case 'fmeta': F.metaId = v; rerenderForm(); break;
    case 'fretiro': F.retiro = !F.retiro; rerenderForm(); break;
    case 'key': { let s = F.monto.replace(',', '.'); if (v === '⌫') s = s.slice(0, -1); else if (s.replace('.', '').length < 11) s = (s + v).replace(/^0+(?=\d)/, ''); F.monto = s.replace('.', ','); updateAmount(); break; }
    case 'pagar': { const f = S.fijos.find(x => x.id === id); if (!f) break; const fm = blankForm('gasto'); Object.assign(fm, { monto: String(f.monto), categoriaId: f.categoriaId, fijoId: f.id, nota: f.nombre, compartido: !!(f.compartido && pareja()), medio: S.config.ultimoMedio }); openMovForm(fm); break; }
    case 'mes': ui.mes = shiftMonth(ui.mes || mkey(today()), Number(v)); render(); break;
    case 'fcompfil': ui.fComp = !ui.fComp; render(); break;
    case 'saldar': { const k = mkey(today()); S.cierres[k] = !S.cierres[k]; save(); render(); toast(S.cierres[k] ? '✓ Marcado como saldado' : 'Marcado como pendiente'); break; }
    case 'copiarCierre': {
      const k = mkey(today()), b = balance(k), pz = pareja() || 'vos';
      const txt = `Gastos compartidos de ${monthName(k)}:\n` + b.list.map(m => `• ${movTitulo(m)}: ${money(m.monto)} (pagó ${m.pagoPor === 'pareja' ? pz : 'Santiago'})`).join('\n') + `\n\nTotal: ${money(b.total)}\n` + (Math.abs(b.debe) < 1 ? 'Estamos a mano 🙌' : b.debe > 0 ? `Me debés ${money(b.debe)} 🙂` : `Te debo ${money(-b.debe)} 🙂`);
      const done = () => toast('✓ Copiado: pegalo en WhatsApp');
      if (navigator.share) navigator.share({ text: txt }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => toast('No pude copiar'));
      break;
    }
    case 'meta': sheetMeta(id); break;
    case 'aportar': case 'retirar': { const fm = blankForm('ahorro'); fm.metaId = id; fm.retiro = a === 'retirar'; openMovForm(fm); break; }
    case 'saveMeta': {
      const nombre = $('#mNom').value.trim(); if (!nombre) { toast('Ponele un nombre'); break; }
      const data = { nombre, emoji: $('#mEmo').value.trim() || '🎯', color: $('#cCol').dataset.v || 'c5', objetivo: parseNum($('#mObj').value), fecha: $('#mFecha').value ? $('#mFecha').value + '-01' : '', inicial: parseNum($('#mIni').value) };
      if (id) Object.assign(meta(id), data); else S.metas.push({ id: 'm-' + uid(), ...data });
      save(); closeSheet(); render(); toast('✓ Meta guardada'); break;
    }
    case 'subirMeta': { const i = S.metas.findIndex(m => m.id === id); if (i > 0) { [S.metas[i - 1], S.metas[i]] = [S.metas[i], S.metas[i - 1]]; save(); closeSheet(); render(); } break; }
    case 'delMeta': {
      const m = meta(id), usos = S.movimientos.filter(x => x.metaId === id).length;
      confirmSheet(`¿Borrar ${esc(m.nombre)}?`, usos ? `Tiene ${usos} aportes. Se pasan a ${esc(S.metas.find(x => x.id !== id).nombre)}.` : 'No tiene aportes.', [{
        label: 'Borrar meta', cls: 'danger', act: () => {
          const otra = S.metas.find(x => x.id !== id).id;
          S.movimientos.forEach(x => { if (x.metaId === id) x.metaId = otra; });
          ['metaAhorro', 'metaDJ', 'extraCasa', 'extraCorto'].forEach(kk => { if (S.config[kk] === id) S.config[kk] = otra; });
          S.metas = S.metas.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Meta borrada');
        }
      }]); break;
    }
    case 'pickColor': t.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); t.parentNode.dataset.v = v; break;
    case 'cat': sheetCat(id); break;
    case 'saveCat': {
      const nombre = $('#cNom').value.trim(); if (!nombre) { toast('Ponele un nombre'); break; }
      const data = { nombre, emoji: $('#cEmo').value.trim() || '🏷️', color: $('#cCol').dataset.v || 'c4', presupuesto: parseNum($('#cPres').value) };
      if (id) Object.assign(cat(id), data); else S.categorias.splice(S.categorias.length - 1, 0, { id: 'cat-' + uid(), k: [], ...data });
      save(); closeSheet(); render(); toast('✓ Categoría guardada'); break;
    }
    case 'delCat': {
      const c = cat(id), n = S.movimientos.filter(m => m.categoriaId === id).length;
      confirmSheet(`¿Borrar ${esc(c.nombre)}?`, n ? `Sus ${n} movimientos pasan a Otros.` : 'No tiene movimientos.', [{ label: 'Borrar categoría', cls: 'danger', act: () => { S.movimientos.forEach(m => { if (m.categoriaId === id) m.categoriaId = 'otros'; }); S.fijos.forEach(f => { if (f.categoriaId === id) f.categoriaId = 'otros'; }); S.categorias = S.categorias.filter(x => x.id !== id); save(); closeSheet(); render(); } }]); break;
    }
    case 'fijo': sheetFijo(id); break;
    case 'tog': t.classList.toggle('on'); break;
    case 'saveFijo': {
      const nombre = $('#fjNom').value.trim(), monto = parseNum($('#fjMonto').value), dia = Math.max(1, Math.min(31, parseInt($('#fjDia').value, 10) || 1));
      if (!nombre) { toast('Ponele un nombre'); break; }
      const data = { nombre, monto, dia, categoriaId: $('#fjCat').value, compartido: !!$('#fjComp')?.classList.contains('on'), activo: $('#fjAct').classList.contains('on') };
      if (id) Object.assign(S.fijos.find(f => f.id === id), data); else S.fijos.push({ id: 'f-' + uid(), ...data });
      save(); closeSheet(); render(); toast('✓ Gasto fijo guardado'); break;
    }
    case 'delFijo': confirmSheet('¿Borrar este gasto fijo?', 'Los pagos que ya anotaste quedan guardados.', [{ label: 'Borrar', cls: 'danger', act: () => { S.fijos = S.fijos.filter(f => f.id !== id); save(); closeSheet(); render(); } }]); break;
    case 'cfgAhorro': sheetSelectMeta('Ahorro al cobrar', S.config.metaAhorro, S.config.ahorroPct, (m, p) => { S.config.metaAhorro = m; S.config.ahorroPct = Math.max(0, Math.min(90, Math.round(p || 0))); }); break;
    case 'cfgDJ': sheetSelectMeta('Fechas de DJ', S.config.metaDJ, null, m => { S.config.metaDJ = m; }); break;
    case 'saveExtra': S.config.extraCasa = $('#exCasa').value; S.config.extraCorto = $('#exCorto').value; S.config.extraPctCasa = Math.max(0, Math.min(100, Math.round(parseNum($('#exPct').value)))); save(); render(); toast('✓ Guardado'); break;
    case 'togPareja': S.config.parejaOn = !S.config.parejaOn; save(); render(); break;
    case 'cfgPareja': sheetPareja(); break;
    case 'savePareja': S.config.pareja = $('#pNom').value.trim() || 'Pareja'; S.config.miParte = Math.max(0, Math.min(100, Math.round(parseNum($('#pPct').value) || 50))); save(); closeSheet(); render(); toast('✓ Guardado'); break;
    case 'tema': S.config.tema = v; save(); applyTheme(); render(); break;
    case 'exportar': exportar(); break;
    case 'csv': exportarCSV(); break;
    case 'importar': $('#fileIn').click(); break;
    case 'ejemplo': confirmSheet('¿Cargar datos de ejemplo?', S.movimientos.length && !S.config.ejemplo ? 'Ojo: reemplaza tus datos actuales. Guardá una copia antes.' : 'Así ves la app llena. Después los borrás desde Ajustes.', [{ label: 'Cargar ejemplo', act: cargarEjemplo }]); break;
    case 'borrarTodo': confirmSheet('¿Borrar todos los datos?', 'Se borran movimientos, metas y ajustes de este iPhone. No se puede deshacer si no tenés una copia.', [{ label: 'Sí, borrar todo', cls: 'danger', act: () => { S = defaults(); save(); applyTheme(); closeSheet(); location.hash = '#inicio'; render(); toast('Datos borrados'); } }]); break;
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'selCat') { ui.fCat = e.target.value; render(); }
  if (e.target.id === 'selMedio') { ui.fMedio = e.target.value; render(); }
  if (e.target.id === 'fileIn' && e.target.files[0]) { importar(e.target.files[0]); e.target.value = ''; }
  if (e.target.dataset && e.target.dataset.pres !== undefined) {
    const c = cat(e.target.dataset.pres); c.presupuesto = parseNum(e.target.value); e.target.value = c.presupuesto ? nf0.format(c.presupuesto) : ''; save();
    const tot = S.categorias.reduce((a, x) => a + (Number(x.presupuesto) || 0), 0); const el = $('#presTot'); if (el) el.textContent = `Total: ${money(tot)} por mes`;
  }
});
$('#scrim').addEventListener('click', closeSheet);
$('#chatIn').addEventListener('input', chatPreview);
$('#examples').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#chatIn').value = b.textContent; chatPreview(); $('#chatIn').focus(); });
$('#preview').addEventListener('click', () => { if (chatF) { const f = chatF; $('#chatIn').value = ''; chatPreview(); openMovForm(f); } });
$('#chatForm').addEventListener('submit', e => { e.preventDefault(); if (!chatF) return; F = chatF; saveMov(true); $('#chatIn').value = ''; chatPreview(); $('#chatIn').blur(); });
addEventListener('hashchange', () => { if (location.hash === '#movimientos' && lastView !== 'movimientos') { ui.mes = null; } closeSheet(); render(); });

/* Teclado del iPhone: subir la barra de chat sobre el teclado */
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => { const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); const open = kb > 80 && document.activeElement === $('#chatIn'); document.body.classList.toggle('kbopen', open); $('#chat').classList.toggle('kbd', open); $('#chat').style.setProperty('--kb', kb + 'px'); };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  $('#chatIn').addEventListener('blur', () => setTimeout(fit, 50));
}

/* Arranque */
load(); applyTheme(); render();
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
if (new URLSearchParams(location.search).get('nuevo') === '1') { if (location.hash && location.hash !== '#inicio') location.hash = '#inicio'; setTimeout(() => openMovForm(blankForm()), 200); try { history.replaceState(null, '', location.pathname + '#inicio'); } catch (e) { } }
if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(() => { }); }
