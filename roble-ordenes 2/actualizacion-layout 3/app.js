/* Módulo de Órdenes – Roble Capital (prototipo) */
const $app = document.getElementById('app');
const S = { me: null, meta: null, orders: [], responses: [], form: null, preview: null, errors: [], blotterF: {}, respTab: 'todas', detail: null };

// ---------- utilidades ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('es-UY');
const dt = iso => iso ? new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const d = iso => iso ? new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const today = () => { const t = new Date(); return new Date(t - t.getTimezoneOffset() * 60e3).toISOString().slice(0, 10); };
const localDay = iso => { const t = new Date(iso); return new Date(t - t.getTimezoneOffset() * 60e3).toISOString().slice(0, 10); };
const initials = n => n.split(' ').map(x => x[0]).slice(0, 2).join('');
function ago(iso) {
  const m = (Date.now() - new Date(iso)) / 60e3;
  if (m < 60) return `hace ${Math.max(1, Math.round(m))} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return `hace ${Math.round(m / 1440)} d`;
}
const badge = (estado) => `<span class="badge s-${estado}">${esc(S.meta?.estados[estado] || estado)}</span>`;
const ROLES = { asesor: 'Asesor', mesa: 'Mesa de operaciones', cumplimiento: 'Cumplimiento' };

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { }
  if (!r.ok) { const e = new Error(data?.error || (data?.errors || []).join(' · ') || 'Error'); e.data = data; e.status = r.status; throw e; }
  return data;
}
function toast(msg, err) {
  const el = document.createElement('div'); el.textContent = msg; if (err) el.className = 'err';
  document.getElementById('toast').appendChild(el); setTimeout(() => el.remove(), 3200);
}
async function act(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, true); throw e; } }

const icons = {
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  desk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
};

const SUBS = {
  inicio: ['Cómo funciona', 'Flujo de la orden y pantallas'],
  desk: ['Trading Desk hoy', 'Órdenes del día por estado'],
  enviar: ['Enviar órdenes', 'Formulario único formato BCU'],
  respuestas: ['Respuestas de clientes', 'Aprobaciones con código'],
  blotter: ['Blotter', 'Historial y Registro BCU'],
};
function navFor(rol) {
  const keys = { asesor: ['inicio', 'enviar', 'blotter'], mesa: ['inicio', 'desk', 'enviar', 'respuestas', 'blotter'], cumplimiento: ['inicio', 'blotter', 'respuestas'] }[rol];
  return keys.map(k => [k, k === 'blotter' && rol === 'asesor' ? 'Mis órdenes' : SUBS[k][0]]);
}
const MODULES = [
  ['Inicio', 'Mis accesos rápidos', '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ['Centro de Control', 'Operaciones, pendientes e indicadores', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
  ['Clientes', 'Clientes, Banco Central y aperturas', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'],
  ['Órdenes', 'Enviar órdenes a Trading Desk y blotter', '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', true],
  ['Inversiones', 'Clientes: carteras y propuestas', '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  ['Mercado', 'Cómo viene el mercado', '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>'],
  ['Research', 'Novedades, visión y monitores', '<path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h5"/>'],
  ['Dirección', 'Dashboard, KPIs y liquidación', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
];
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const LOGO = `<div class="brand"><img src="https://roble-crm-development.up.railway.app/download.png" alt="Roble Capital" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'brand-txt',innerHTML:'ROBLE<b>CAPITAL</b><small>WEALTH MANAGEMENT</small>'}))"></div>`;
const route = () => (location.hash.replace('#/', '') || '').split('?')[0];

// ---------- arranque ----------
async function boot() {
  try { S.me = await api('GET', '/api/me'); } catch { S.me = null; }
  if (!S.me) return renderLogin();
  S.meta = await api('GET', '/api/meta');
  const keys = navFor(S.me.rol).map(x => x[0]);
  if (!keys.includes(route())) { location.hash = '#/' + keys[0]; return; }
  await render();
}
window.addEventListener('hashchange', () => S.me ? render() : boot());

// ---------- login ----------
async function renderLogin() {
  const users = await api('GET', '/api/users');
  $app.innerHTML = `<div class="login">
    <div class="l">
      ${LOGO}
      <div>
        <div class="eyebrow">ROBLE CAPITAL · CRM</div>
        <h1>Módulo de Órdenes</h1>
        <p>Cada orden con su aprobación y su responsable: formulario único con los campos del BCU, confirmación del cliente por mail con código, seguimiento en Trading Desk y Blotter como Registro de Instrucciones.</p>
      </div>
      <p class="small" style="opacity:.55">Prototipo académico · HGTD · Universidad ORT Uruguay · Datos de prueba ficticios</p>
    </div>
    <div class="r"><div class="box">
      <h2 style="margin:0 0 4px">Ingresar</h2>
      <p class="muted" style="margin:0">Solo cuentas de Google @roblecapital.net</p>
      <form id="lg" class="btns" style="margin:16px 0 0;flex-wrap:nowrap">
        <input class="in" name="email" placeholder="nombre@roblecapital.net" autocomplete="off">
        <button class="btn primary">Ingresar</button>
      </form>
      <div class="muted small" style="margin:22px 0 10px;text-transform:uppercase;letter-spacing:.8px">Cuentas de demostración</div>
      ${users.map(u => `<button class="acc" data-email="${esc(u.email)}"><span class="av">${initials(u.nombre)}</span><span><b>${esc(u.nombre)}</b><br><span class="muted small">${esc(u.email)}</span></span><span class="rl r-${u.rol}">${ROLES[u.rol]}</span></button>`).join('')}
    </div></div></div>`;
  const login = async email => { try { await api('POST', '/api/login', { email }); location.hash = ''; boot(); } catch (e) { toast(e.message, true); } };
  $app.querySelector('#lg').onsubmit = e => { e.preventDefault(); login(e.target.email.value); };
  $app.querySelectorAll('.acc').forEach(b => b.onclick = () => login(b.dataset.email));
}

// ---------- shell ----------
async function render() {
  const r = route();
  S.orders = await api('GET', '/api/orders');
  const pendRev = S.orders.filter(o => o.estado === 'pendiente_revision').length;
  const sinOrden = S.me.rol !== 'asesor' ? (await api('GET', '/api/responses')).filter(x => !x.ordenId).length : 0;
  const counts = { desk: pendRev, respuestas: sinOrden, enviar: S.me.rol === 'asesor' ? S.orders.filter(o => o.estado === 'devuelta').length : 0 };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const title = r === 'blotter' && S.me.rol === 'asesor' ? 'Mis órdenes' : SUBS[r][0];
  $app.innerHTML = `<div class="shell">
    <aside class="side">
      ${LOGO}
      <div class="search">${ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}<span>Buscar…</span><kbd>Ctrl K</kbd></div>
      <nav class="nav">${MODULES.map(([t, sub, d, active]) => active
        ? `<div class="mod on"><div class="mi">${ico(d)}<div><b>${t}</b>${total ? `<span class="cnt">${total}</span>` : ''}<small>${sub}</small></div>${ico('<path d="m6 9 6 6 6-6"/>')}</div>
            <div class="subnav">${navFor(S.me.rol).map(([k, label]) => `<a href="#/${k}" class="${r === k ? 'on' : ''}">${label}${counts[k] ? `<span class="cnt">${counts[k]}</span>` : ''}</a>`).join('')}</div></div>`
        : `<div class="mod off" title="Fuera del alcance de este prototipo"><div class="mi">${ico(d)}<div><b>${t}</b><small>${sub}</small></div>${ico('<path d="m9 6 6 6-6 6"/>')}</div></div>`).join('')}</nav>
      <div class="foot">
        <div class="usercard"><span class="avg">${esc(S.me.nombre[0])}</span><div><b>${esc(S.me.nombre)}</b><small>${ROLES[S.me.rol]}</small></div></div>
        <div class="footbtns"><button id="logout">${ico('<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>')}Cambiar de usuario</button><button id="reset">${ico('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>')}Reiniciar demo</button></div>
      </div>
    </aside>
    <div class="content">
      <header class="topbar"><span></span><b>${title}</b><div class="tb-r"><span class="bell">${ico('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>')}${total ? '<i></i>' : ''}</span><span class="avg">${esc(S.me.nombre[0])}</span></div></header>
      <div class="crumbs">${ico('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>')}<span>Inicio</span>›<a href="#/inicio">Órdenes</a>›<b>${title}</b></div>
      <div class="ptabs">${navFor(S.me.rol).filter(([k]) => k !== 'inicio').map(([k, label]) => `<a href="#/${k}" class="${r === k ? 'on' : ''}">${label}</a>`).join('')}</div>
      <main class="main" id="main"></main>
    </div></div>`;
  document.getElementById('logout').onclick = async () => { await api('POST', '/api/logout'); S.me = null; S.form = null; boot(); };
  document.getElementById('reset').onclick = () => confirmModal('Reiniciar datos de demostración', 'Se borran los cambios hechos y se vuelven a cargar las órdenes de prueba.', async () => { await api('POST', '/api/reset'); S.form = null; toast('Datos de demostración reiniciados'); render(); });
  const views = { inicio: viewInicio, enviar: viewEnviar, desk: viewDesk, respuestas: viewRespuestas, blotter: viewBlotter };
  await views[r]();
}

// ---------- CÓMO FUNCIONA (hub del módulo) ----------
async function viewInicio() {
  const n = e => S.orders.filter(o => e.includes(o.estado)).length;
  const cards = navFor(S.me.rol).filter(([k]) => k !== 'inicio').map(([k, label]) => {
    const desc = { desk: 'La Mesa revisa, envía el mail al cliente, toma la orden aprobada y la ejecuta.', enviar: 'El asesor carga la orden en un formulario único. Si falta un dato del BCU, no se puede enviar.', respuestas: 'Se lee el código de confirmación del mail del cliente y se asocia a la orden.', blotter: 'Todas las órdenes con su aprobación y ejecución. De acá sale el Registro de Instrucciones.' }[k];
    const ic = { desk: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>', enviar: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', respuestas: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>', blotter: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>' }[k];
    return `<a class="hubcard" href="#/${k}"><span class="hubic">${ico(ic)}</span><b>${label}</b><p>${desc}</p><span class="open">Abrir →</span></a>`;
  }).join('');
  const steps = [
    ['1', 'Asesor', 'Carga la orden', 'Cliente, fecha, quién opera y activos. Campos BCU obligatorios.', 'pendiente_revision'],
    ['2', 'Mesa', 'Revisa', 'Controla la orden. Si hay un error, la devuelve al asesor.', 'en_revision'],
    ['3', 'Mesa', 'Envía el mail', 'El cliente recibe la orden con un código de confirmación.', 'mail_enviado'],
    ['4', 'Cliente', 'Aprueba', 'Responde "Confirmo" con el código. Se asocia a la orden con fecha y hora.', 'aprobada'],
    ['5', 'Mesa', 'Ejecuta', 'Un operador la toma, la ejecuta en el banco o Insigneo y la registra.', 'ejecutada'],
    ['6', 'Cumplimiento', 'Reporta', 'El Blotter genera el Registro de Instrucciones trimestral para el BCU.', null],
  ];
  main().innerHTML = `
  <div class="head"><div><h1>Órdenes</h1><p>Enviar órdenes a Trading Desk, aprobación del cliente y blotter</p></div></div>
  <div class="hubgrid">${cards}</div>
  <div class="panel" style="margin-top:20px"><div class="ph"><div><h3>Cómo viaja una orden</h3><p class="muted small" style="margin:2px 0 0">Cada paso queda registrado con su responsable en el historial de la orden</p></div></div>
    <div class="steps">${steps.map(([num, who, t, d, st]) => `<div class="step"><div class="sn">${num}</div><span class="who">${who}</span><b>${t}</b><p>${d}</p>${st ? badge(st) : '<span class="badge s-ejecutada">Registro BCU</span>'}</div>`).join('')}</div>
  </div>
  <div class="grid3" style="margin-top:20px">
    <div class="tile t-amber"><span>Por revisar</span><b>${n(['pendiente_revision', 'en_revision'])}</b></div>
    <div class="tile t-indigo"><span>Esperando cliente</span><b>${n(['en_trading_desk', 'mail_enviado'])}</b></div>
    <div class="tile t-purple"><span>Para ejecutar</span><b>${n(['aprobada', 'en_ejecucion'])}</b></div>
    <div class="tile t-green"><span>Ejecutadas (total)</span><b>${n(['ejecutada'])}</b></div>
  </div>
  <div class="demo-banner" style="margin-top:20px"><b>Prototipo con datos de prueba.</b> El ingreso con Google y el envío/lectura de Gmail están simulados; el flujo, las validaciones, los estados y el registro funcionan igual que en el diseño.</div>`;
}
const main = () => document.getElementById('main');
const banner = '';

// ---------- ENVIAR ÓRDENES ----------
const emptyAsset = () => ({ operacion: 'Compra', tipo: 'Acción', instrumento: '', ticker: '', moneda: 'USD', cantidad: '', precioTipo: 'Mercado', precioLim: '', vigencia: 'Día', monto: '' });
function newForm() { return { clienteId: '', q: '', fechaInstruccion: today(), opera: 'mesa', copias: [], activos: [emptyAsset()], observaciones: '', editId: null }; }

function myClients() { return S.meta.clients.filter(c => S.me.rol !== 'asesor' || c.asesorId === S.me.id); }
function payload(canal) {
  const f = S.form;
  return {
    clienteId: f.clienteId, fechaInstruccion: f.fechaInstruccion, opera: canal === 'directo' ? 'asesor' : f.opera, canal, copias: f.copias, observaciones: f.observaciones,
    activos: f.activos.map(a => ({ operacion: a.operacion, tipo: a.tipo, instrumento: a.instrumento.trim(), ticker: a.ticker.trim(), moneda: a.moneda, cantidad: a.cantidad, monto: a.monto, vigencia: a.vigencia, precio: a.precioTipo === 'Mercado' ? 'Mercado' : (a.precioLim ? 'Límite ' + a.precioLim : '') })),
  };
}

async function viewEnviar() {
  if (!S.form) S.form = newForm();
  const f = S.form;
  const cl = S.meta.clients.find(c => c.id === f.clienteId);
  const errFields = new Set(S.errors.join(' ').match(/Activo \d+: falta \w+|Cliente|Fecha/g) || []);
  const fe = (i, k) => errFields.has(`Activo ${i + 1}: falta ${k}`) ? 'err' : '';
  const misDevueltas = S.orders.filter(o => o.estado === 'devuelta');

  main().innerHTML = `${banner}
  <div class="head"><div><h1>${f.editId ? 'Corregir orden devuelta' : 'Enviar órdenes'}</h1><p>Formulario único con los campos obligatorios del formato BCU. Una orden incompleta no se puede enviar.</p></div>
    ${f.editId ? '<button class="btn" id="cancelEdit">Descartar corrección</button>' : ''}</div>
  ${misDevueltas.length && !f.editId ? `<div class="warnbox" style="margin-bottom:16px"><b>${misDevueltas.length} orden(es) devuelta(s) por la Mesa.</b> ${misDevueltas.map(o => `<a href="#" data-fix="${o.id}">${o.numero}</a> (${esc(o.motivo)})`).join(' · ')}</div>` : ''}
  <div class="grid2">
    <div class="panel"><div class="pb">
      ${S.errors.length ? `<div class="errors"><b>No se puede enviar: faltan datos obligatorios</b><ul>${S.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
      <div class="row"><div class="client-pick">
        <label class="f">Cliente <span class="req">*</span></label>
        <input class="in ${errFields.has('Cliente') ? 'err' : ''}" id="cq" placeholder="Buscar por nombre o número de cliente…" value="${esc(cl ? `${cl.nombre} · ${cl.numero}` : f.q)}" ${f.editId ? 'disabled' : ''} autocomplete="off">
        <div class="dropdown" id="cdd" hidden></div>
        ${cl ? `<div class="client-card"><span><span class="muted">N.º cliente</span> <b class="mono">${cl.numero}</b></span><span><span class="muted">Email</span> <b>${esc(cl.email)}</b></span><span><span class="muted">Asesor</span> <b>${esc(S.meta.users.find(u => u.id === cl.asesorId).nombre)}</b></span></div>` : ''}
      </div></div>
      <div class="row c2">
        <div><label class="f">Fecha de instrucción <span class="req">*</span></label><input type="date" class="in ${errFields.has('Fecha') ? 'err' : ''}" data-k="fechaInstruccion" value="${f.fechaInstruccion}"></div>
        <div><label class="f">Quién opera <span class="req">*</span></label>
          <div class="seg"><button data-opera="mesa" class="${f.opera === 'mesa' ? 'on' : ''}">La ingresa la Mesa</button><button data-opera="asesor" class="${f.opera === 'asesor' ? 'on' : ''}">Opera el asesor</button></div></div>
      </div>
      <div class="row"><div><label class="f">Copias internas</label>
        <div class="chips" id="chips">${f.copias.map((c, i) => `<span class="chip">${esc(c)}<button data-rmcc="${i}">×</button></span>`).join('')}<input id="ccin" placeholder="email@roblecapital.net y Enter"></div></div></div>

      <label class="f" style="margin-top:4px">Activos <span class="req">*</span></label>
      <datalist id="insts">${S.meta.instruments.map(x => `<option value="${esc(x.instrumento)}">${x.tipo} · ${x.ticker}</option>`).join('')}</datalist>
      ${f.activos.map((a, i) => `<div class="asset">
        <div class="ah"><span>Activo ${i + 1}</span>${f.activos.length > 1 ? `<button class="btn sm danger" data-rma="${i}">Quitar</button>` : ''}</div>
        <div class="ag">
          <div><label class="f">Operación</label><select class="in" data-a="${i}" data-ak="operacion">${['Compra', 'Venta'].map(x => `<option ${a.operacion === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div><label class="f">Tipo</label><select class="in" data-a="${i}" data-ak="tipo">${['Acción', 'Fondo', 'Bono', 'Opción'].map(x => `<option ${a.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div><label class="f">Instrumento <span class="req">*</span></label><input class="in ${fe(i, 'instrumento')}" list="insts" data-a="${i}" data-ak="instrumento" value="${esc(a.instrumento)}" placeholder="Ej.: Apple Inc."></div>
          <div><label class="f">Ticker / ISIN</label><input class="in mono" data-a="${i}" data-ak="ticker" value="${esc(a.ticker)}"></div>
        </div>
        <div class="ag2">
          <div><label class="f">Moneda</label><select class="in" data-a="${i}" data-ak="moneda">${['USD', 'EUR', 'UYU'].map(x => `<option ${a.moneda === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div><label class="f">${a.tipo === 'Bono' ? 'Valor nominal' : 'Cantidad'} <span class="req">*</span></label><input class="in ${fe(i, 'cantidad')}" type="number" min="0" data-a="${i}" data-ak="cantidad" value="${esc(a.cantidad)}"></div>
          <div><label class="f">Precio <span class="req">*</span></label><select class="in" data-a="${i}" data-ak="precioTipo" data-rerender="1">${['Mercado', 'Límite'].map(x => `<option ${a.precioTipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div><label class="f">${a.precioTipo === 'Límite' ? 'Precio límite <span class="req">*</span>' : 'Vigencia'}</label>${a.precioTipo === 'Límite'
            ? `<input class="in ${fe(i, 'precio')}" type="number" step="0.01" data-a="${i}" data-ak="precioLim" value="${esc(a.precioLim)}">`
            : `<select class="in" data-a="${i}" data-ak="vigencia">${['Día', 'Hasta cancelar'].map(x => `<option ${a.vigencia === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`}</div>
          <div><label class="f">Monto estimado</label><input class="in" type="number" data-a="${i}" data-ak="monto" value="${esc(a.monto)}"></div>
        </div></div>`).join('')}
      <button class="btn" id="addA">+ Agregar activo</button>
      <div class="row" style="margin-top:16px"><div><label class="f">Observaciones para la Mesa</label><textarea class="in" rows="2" data-k="observaciones">${esc(f.observaciones)}</textarea></div></div>
      <div class="btns" style="justify-content:flex-end;border-top:1px solid var(--line-2);padding-top:16px">
        <button class="btn" id="prev">Vista previa del mail</button>
        ${S.me.rol === 'asesor' && !f.editId ? '<button class="btn gold" id="sendDirect">Enviar directo al cliente</button>' : ''}
        <button class="btn primary" id="sendMesa">${f.editId ? 'Reenviar a la Mesa' : S.me.rol === 'mesa' ? 'Ingresar orden' : 'Enviar a la Mesa'}</button>
      </div>
    </div></div>

    <div class="panel" style="position:sticky;top:20px"><div class="ph"><h3>Vista previa del mail al cliente</h3></div><div class="pb">
      ${S.preview ? `<div class="mail"><div class="mh"><div><b>De</b>${esc(S.preview.de)}</div><div><b>Para</b>${esc(S.preview.para)}</div><div><b>CC</b>${esc(S.preview.cc)}</div><div><b>Asunto</b><span style="font-weight:600">${esc(S.preview.asunto)}</span></div></div><pre>${esc(S.preview.cuerpo)}</pre></div>
      <p class="muted small" style="margin:10px 0 0">El código de confirmación se genera al enviar. El cliente responde el mail con ese código, sin usuario ni contraseña.</p>`
      : `<div class="empty">Complete la orden y presione <b>Vista previa del mail</b>.<br><br><span class="small">Envío a la Mesa: la Mesa revisa y envía el mail desde Trading Desk.<br>Envío directo: sale del Gmail del asesor, que lleva la orden hasta su ejecución.</span></div>`}
    </div></div>
  </div>`;
  bindEnviar();
}

function bindEnviar() {
  const f = S.form, m = main();
  const cq = m.querySelector('#cq'), dd = m.querySelector('#cdd');
  const showDD = () => {
    const q = cq.value.toLowerCase();
    const list = myClients().filter(c => !q || c.nombre.toLowerCase().includes(q) || c.numero.includes(q)).slice(0, 8);
    dd.innerHTML = list.map(c => `<div data-cid="${c.id}"><span>${esc(c.nombre)}</span><span class="mono muted">${c.numero}</span></div>`).join('') || '<div class="muted">Sin resultados</div>';
    dd.hidden = false;
  };
  cq.onfocus = () => { if (f.clienteId) { f.clienteId = ''; cq.value = ''; } showDD(); };
  cq.oninput = () => { f.q = cq.value; showDD(); };
  cq.onblur = () => setTimeout(() => dd.hidden = true, 150);
  dd.onmousedown = e => { const t = e.target.closest('[data-cid]'); if (t) { f.clienteId = t.dataset.cid; f.q = ''; S.preview = null; viewEnviar(); } };

  m.querySelectorAll('[data-k]').forEach(el => el.oninput = () => { f[el.dataset.k] = el.value; });
  m.querySelectorAll('[data-opera]').forEach(b => b.onclick = () => { f.opera = b.dataset.opera; viewEnviar(); });
  m.querySelectorAll('[data-a]').forEach(el => {
    const handler = () => {
      const a = f.activos[el.dataset.a]; a[el.dataset.ak] = el.value;
      if (el.dataset.ak === 'instrumento') {
        const ins = S.meta.instruments.find(x => x.instrumento === el.value);
        if (ins) { a.tipo = ins.tipo; a.ticker = ins.ticker; a.moneda = ins.moneda; viewEnviar(); }
      }
      if (el.dataset.rerender || el.dataset.ak === 'tipo') viewEnviar();
    };
    el.tagName === 'SELECT' ? el.onchange = handler : el.oninput = handler;
  });
  m.querySelectorAll('[data-rma]').forEach(b => b.onclick = () => { f.activos.splice(+b.dataset.rma, 1); viewEnviar(); });
  m.querySelectorAll('[data-rmcc]').forEach(b => b.onclick = () => { f.copias.splice(+b.dataset.rmcc, 1); viewEnviar(); });
  m.querySelectorAll('[data-fix]').forEach(a => a.onclick = async e => { e.preventDefault(); await loadForEdit(a.dataset.fix); });
  const ccin = m.querySelector('#ccin');
  ccin.onkeydown = e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); const v = ccin.value.trim().replace(/,$/, '');
      if (!v) return;
      if (!/^[^@\s]+@roblecapital\.net$/i.test(v)) return toast('Las copias internas deben ser cuentas @roblecapital.net', true);
      f.copias.push(v.toLowerCase()); viewEnviar(); main().querySelector('#ccin').focus();
    }
  };
  m.querySelector('#addA').onclick = () => { f.activos.push(emptyAsset()); viewEnviar(); };
  const cancelEdit = m.querySelector('#cancelEdit'); if (cancelEdit) cancelEdit.onclick = () => { S.form = newForm(); S.errors = []; S.preview = null; viewEnviar(); };

  const validateLocal = () => {
    const p = payload('mesa'); const errs = [];
    if (!p.clienteId) errs.push('Cliente: seleccione un cliente de la base');
    if (!p.fechaInstruccion) errs.push('Fecha de instrucción: obligatoria');
    p.activos.forEach((a, i) => {
      if (!a.instrumento) errs.push(`Activo ${i + 1}: falta instrumento`);
      if (!(Number(a.cantidad) > 0)) errs.push(`Activo ${i + 1}: falta cantidad`);
      if (!a.precio) errs.push(`Activo ${i + 1}: falta precio`);
    });
    return errs;
  };
  m.querySelector('#prev').onclick = async () => {
    S.errors = validateLocal(); if (S.errors.length) { S.preview = null; return viewEnviar(); }
    try { S.preview = await api('POST', '/api/orders/preview', payload(f.opera === 'asesor' && S.me.rol === 'asesor' ? 'directo' : 'mesa')); } catch (e) { S.errors = e.data?.errors || [e.message]; }
    viewEnviar();
  };
  const send = async canal => {
    S.errors = validateLocal(); if (S.errors.length) { S.preview = null; return viewEnviar(); }
    try {
      const o = f.editId ? await api('PUT', '/api/orders/' + f.editId, payload(canal)) : await api('POST', '/api/orders', payload(canal));
      toast(canal === 'directo' ? `${o.numero} enviada al cliente` : `${o.numero} enviada a la Mesa`);
      S.form = newForm(); S.preview = null; S.errors = [];
      location.hash = S.me.rol === 'mesa' ? '#/desk' : '#/blotter';
      setTimeout(() => openDetail(o.id), 200);
    } catch (e) { S.errors = e.data?.errors || [e.message]; viewEnviar(); }
  };
  m.querySelector('#sendMesa').onclick = () => send('mesa');
  const sd = m.querySelector('#sendDirect'); if (sd) sd.onclick = () => send('directo');
}

async function loadForEdit(id) {
  const o = await api('GET', '/api/orders/' + id);
  S.form = {
    clienteId: o.clienteId, q: '', fechaInstruccion: o.fechaInstruccion, opera: o.opera, copias: o.copias.slice(), observaciones: o.observaciones || '', editId: o.id,
    activos: o.activos.map(a => ({ ...a, cantidad: a.cantidad ?? '', monto: a.monto ?? '', precioTipo: String(a.precio).startsWith('Límite') ? 'Límite' : 'Mercado', precioLim: String(a.precio).replace('Límite ', '').replace('Mercado', ''), vigencia: a.vigencia || 'Día' })),
  };
  S.errors = []; S.preview = null;
  closeDetail();
  if (route() !== 'enviar') location.hash = '#/enviar'; else viewEnviar();
}

// ---------- TRADING DESK HOY ----------
function assetLine(o) {
  const a = o.activos[0];
  return `<span class="op-${a.operacion}">${a.operacion}</span> ${nf(a.cantidad)} ${esc(a.ticker && a.ticker.length < 8 ? a.ticker : a.instrumento)}${o.activos.length > 1 ? ` <span class="muted">+${o.activos.length - 1} activo(s)</span>` : ''}`;
}
function actionsFor(o, compact) {
  const r = S.me.rol, b = [];
  const isOp = o.operadorId === S.me.id;
  if (r === 'mesa') {
    if (o.estado === 'pendiente_revision') b.push(['tomar-revision', 'Revisar', 'primary']);
    if (o.estado === 'en_revision') { b.push(['aprobar-revision', 'Aprobar revisión', 'primary']); b.push(['devolver', 'Devolver', '']); }
    if (o.estado === 'pendiente_revision') b.push(['devolver', 'Devolver', '']);
    if (o.estado === 'en_trading_desk') b.push(['enviar-mail', 'Enviar mail al cliente', 'primary']);
  }
  const canExec = r === 'mesa' || (r === 'asesor' && o.canal === 'directo');
  if (canExec && o.estado === 'aprobada') b.push(['tomar', 'Tomar para ejecutar', 'primary']);
  if (canExec && o.estado === 'en_ejecucion' && isOp) b.push(['ejecutar', 'Marcar ejecutada', 'primary']);
  if (o.estado === 'mail_enviado' && r !== 'cumplimiento') { b.push(['sim-ok', 'Simular: cliente confirma', 'gold']); if (!compact) b.push(['sim-no', 'Simular: cliente rechaza', '']); }
  if (r === 'asesor' && o.estado === 'devuelta') b.push(['corregir', 'Corregir y reenviar', 'primary']);
  if (!compact && r !== 'cumplimiento' && !['ejecutada', 'cancelada', 'rechazada'].includes(o.estado)) b.push(['cancelar', 'Cancelar orden', 'danger']);
  return b.map(([a, l, c]) => `<button class="btn sm ${c}" data-act="${a}" data-id="${o.id}">${l}</button>`).join('');
}

async function doAction(id, a) {
  if (a === 'corregir') return loadForEdit(id);
  if (a === 'sim-ok' || a === 'sim-no') {
    const r = await act(() => api('POST', `/api/orders/${id}/simular-respuesta`, { aprueba: a === 'sim-ok' }));
    toast(r.ordenId ? (r.resultado === 'aprueba' ? 'Respuesta recibida: aprobada por el cliente' : 'Respuesta recibida: rechazada por el cliente') : 'Respuesta recibida sin asociar');
    return refresh(id);
  }
  if (a === 'devolver' || a === 'cancelar') {
    return promptModal(a === 'devolver' ? 'Devolver la orden al asesor' : 'Cancelar la orden', 'Motivo (queda en el historial)', async motivo => {
      await act(() => api('POST', `/api/orders/${id}/${a}`, { motivo }), a === 'devolver' ? 'Orden devuelta al asesor' : 'Orden cancelada'); refresh(id);
    });
  }
  if (a === 'ejecutar') return execModal(id);
  const labels = { 'tomar-revision': 'Revisión tomada', 'aprobar-revision': 'Revisión aprobada', 'enviar-mail': 'Mail enviado al cliente', 'tomar': 'Orden asignada a usted' };
  await act(() => api('POST', `/api/orders/${id}/${a}`, {}), labels[a]);
  refresh(id);
}
async function refresh(id) { await render(); if (S.detail && id) openDetail(id); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  e.stopPropagation(); doAction(b.dataset.id, b.dataset.act);
}, true);

async function viewDesk() {
  const os = S.orders, t = today();
  const cols = [
    ['Por revisar', os.filter(o => ['pendiente_revision', 'en_revision'].includes(o.estado))],
    ['Esperando cliente', os.filter(o => ['en_trading_desk', 'mail_enviado'].includes(o.estado))],
    ['Para ejecutar', os.filter(o => ['aprobada', 'en_ejecucion'].includes(o.estado))],
    ['Ejecutadas hoy', os.filter(o => o.estado === 'ejecutada' && localDay(o.fechaEjecucion) === t)],
  ];
  const late = os.filter(o => o.estado === 'mail_enviado' && Date.now() - new Date(o.fechaMail) > 24 * 3600e3).length;
  const devueltas = os.filter(o => ['devuelta', 'rechazada'].includes(o.estado) && Date.now() - new Date(o.creada) < 7 * 864e5);
  main().innerHTML = `${banner}
  <div class="head"><div><h1>Trading Desk hoy</h1><p>${new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · órdenes abiertas por estado, con su operador asignado</p></div>
    <button class="btn primary" onclick="location.hash='#/enviar'">+ Nueva orden</button></div>
  <div class="kpis">
    <div class="kpi"><div class="v">${cols[0][1].length}</div><div class="l">Por revisar</div></div>
    <div class="kpi"><div class="v">${cols[1][1].length}</div><div class="l">Esperando al cliente</div></div>
    <div class="kpi ${late ? 'warn' : ''}"><div class="v">${late}</div><div class="l">Sin respuesta hace +24 h</div></div>
    <div class="kpi"><div class="v">${cols[2][1].length}</div><div class="l">Aprobadas para ejecutar</div></div>
    <div class="kpi"><div class="v">${cols[3][1].length}</div><div class="l">Ejecutadas hoy</div></div>
  </div>
  <div class="board">${cols.map(([title, list]) => `<div class="col"><h4>${title}<span>${list.length}</span></h4>
    ${list.map(o => {
      const since = o.estado === 'mail_enviado' ? o.fechaMail : o.estado === 'aprobada' ? o.fechaRespuesta : o.creada;
      const hrs = (Date.now() - new Date(since)) / 3600e3;
      return `<div class="card" data-open="${o.id}">
      <div class="top"><span class="mono">${o.numero}</span>${badge(o.estado)}</div>
      <div class="cl">${esc(o.cliente.nombre)}</div>
      <div class="as">${assetLine(o)}</div>
      <div class="meta"><span>Asesor: ${esc(o.asesor.nombre.split(' ')[0])}${o.canal === 'directo' ? ' · directo' : ''}</span>
        ${o.estado === 'ejecutada' ? `<span>${new Date(o.fechaEjecucion).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</span>` : `<span class="age ${o.estado === 'mail_enviado' && hrs > 48 ? 'very' : o.estado === 'mail_enviado' && hrs > 24 ? 'late' : ''}">${ago(since)}</span>`}</div>
      ${o.operador ? `<div class="meta" style="margin-top:4px"><span>Operador: <b style="color:var(--ink)">${esc(o.operador.nombre)}</b></span></div>` : ''}
      <div class="acts">${actionsFor(o, true)}</div></div>`;
    }).join('') || '<div class="empty small">Sin órdenes</div>'}</div>`).join('')}
  </div>
  ${devueltas.length ? `<div class="panel" style="margin-top:20px"><div class="ph"><h3>Devueltas y rechazadas (últimos 7 días)</h3></div>
    <table class="tbl"><tbody>${devueltas.map(o => `<tr class="click" data-open="${o.id}"><td class="mono">${o.numero}</td><td>${esc(o.cliente.nombre)}</td><td>${assetLine(o)}</td><td>${badge(o.estado)}</td><td class="muted">${esc(o.motivo || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  bindOpen();
}
function bindOpen() { main().querySelectorAll('[data-open]').forEach(el => el.onclick = () => openDetail(el.dataset.open)); }

// ---------- RESPUESTAS DE CLIENTES ----------
async function viewRespuestas() {
  S.responses = await api('GET', '/api/responses');
  const list = S.respTab === 'sin' ? S.responses.filter(r => !r.ordenId) : S.responses;
  const sin = S.responses.filter(r => !r.ordenId).length;
  const waiting = S.orders.filter(o => o.estado === 'mail_enviado');
  main().innerHTML = `${banner}
  <div class="head"><div><h1>Respuestas de clientes</h1><p>Se leen las respuestas a los mails de orden, se toma el código de confirmación y se asocian a cada orden con fecha y hora.</p></div></div>
  <div class="grid2" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)">
    <div class="panel">
      <div class="ph"><div class="tabs"><button data-tab="todas" class="${S.respTab === 'todas' ? 'on' : ''}">Todas (${S.responses.length})</button><button data-tab="sin" class="${S.respTab === 'sin' ? 'on' : ''}">Sin orden asociada (${sin})</button></div></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Recibida</th><th>De</th><th>Mensaje</th><th>Código</th><th>Lectura</th><th>Orden</th></tr></thead><tbody>
      ${list.map(r => `<tr>
        <td class="small" style="white-space:nowrap">${dt(r.recibida)}</td>
        <td><b>${esc(r.cliente || '—')}</b><br><span class="muted small">${esc(r.de)}</span></td>
        <td style="max-width:280px"><div class="small" style="font-weight:600">${esc(r.asunto)}</div><div class="small muted" style="white-space:pre-line;max-height:3.2em;overflow:hidden">${esc(r.cuerpo)}</div>${r.nota ? `<div class="small" style="color:var(--red);margin-top:3px">${esc(r.nota)}</div>` : ''}</td>
        <td class="mono">${esc(r.codigo || '—')}</td>
        <td><span class="badge b-${r.resultado}">${{ aprueba: 'Aprueba', rechaza: 'Rechaza', indeterminado: 'Sin determinar' }[r.resultado]}</span></td>
        <td>${r.orden ? `<a href="#" data-open="${r.orden.id}" class="mono">${r.orden.numero}</a><br><span class="muted small">${r.asociadaPor === 'manual' ? 'asociada a mano' : 'automática'}</span>`
          : `<span class="badge b-none">Sin orden asociada</span>${S.me.rol === 'mesa' ? `<br><button class="btn sm" style="margin-top:6px" data-assoc="${r.id}">Asociar…</button>` : ''}`}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">No hay respuestas</td></tr>'}
      </tbody></table></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel"><div class="ph"><h3>Esperando respuesta (${waiting.length})</h3></div><div class="pb" style="padding:10px 18px">
        ${waiting.map(o => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line-2)"><div><a href="#" data-open="${o.id}" class="mono">${o.numero}</a> <span class="small">${esc(o.cliente.nombre)}</span><br><span class="small muted">mail ${ago(o.fechaMail)} · código <span class="mono">${o.codigo}</span></span></div>${S.me.rol !== 'cumplimiento' ? `<button class="btn sm gold" data-act="sim-ok" data-id="${o.id}">Simular respuesta</button>` : ''}</div>`).join('') || '<div class="empty small">Ninguna orden esperando</div>'}
      </div></div>
      ${S.me.rol !== 'cumplimiento' ? `<div class="panel"><div class="ph"><h3>Simular mail entrante</h3></div><div class="pb">
        <p class="small muted" style="margin-top:0">En producción las respuestas se leen de Gmail. Aquí puede escribir un mail como si fuera el cliente para probar la lectura del código.</p>
        <div class="row"><div><label class="f">De</label><input class="in" id="smDe" list="cmails" placeholder="email del cliente"><datalist id="cmails">${S.meta.clients.map(c => `<option value="${esc(c.email)}">${esc(c.nombre)}</option>`).join('')}</datalist></div></div>
        <div class="row"><div><label class="f">Asunto</label><input class="in" id="smAs" value="RE: Orden – confirmación requerida"></div></div>
        <div class="row"><div><label class="f">Cuerpo</label><textarea class="in" id="smCu" rows="3" placeholder="Confirmo. Código ABC123"></textarea></div></div>
        <button class="btn primary" id="smGo">Recibir mail</button>
      </div></div>` : ''}
    </div>
  </div>`;
  bindOpen();
  main().querySelectorAll('[data-open]').forEach(el => el.onclick = e => { e.preventDefault(); openDetail(el.dataset.open); });
  main().querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.respTab = b.dataset.tab; viewRespuestas(); });
  main().querySelectorAll('[data-assoc]').forEach(b => b.onclick = () => assocModal(S.responses.find(r => r.id === b.dataset.assoc)));
  const go = main().querySelector('#smGo');
  if (go) go.onclick = async () => {
    const r = await act(() => api('POST', '/api/responses/simulate', { de: main().querySelector('#smDe').value, asunto: main().querySelector('#smAs').value, cuerpo: main().querySelector('#smCu').value }));
    toast(r.ordenId ? 'Respuesta asociada automáticamente a la orden' : 'Respuesta recibida: quedó sin orden asociada', !r.ordenId);
    render();
  };
}

function assocModal(r) {
  const waiting = S.orders.filter(o => o.estado === 'mail_enviado');
  const sugg = waiting.filter(o => o.cliente.email.toLowerCase() === r.de.toLowerCase());
  const bg = modal(`<h3>Asociar respuesta a una orden</h3>
    <div class="mail" style="margin-bottom:14px"><div class="mh"><div><b>De</b>${esc(r.de)}</div><div><b>Asunto</b>${esc(r.asunto)}</div></div><pre style="padding:10px 14px">${esc(r.cuerpo)}</pre></div>
    <div class="row"><div><label class="f">Orden esperando respuesta</label><select class="in" id="ao">${waiting.map(o => `<option value="${o.id}" ${sugg[0]?.id === o.id ? 'selected' : ''}>${o.numero} · ${esc(o.cliente.nombre)}${sugg.includes(o) ? ' (mismo remitente)' : ''}</option>`).join('')}</select></div></div>
    <div class="row"><div><label class="f">El cliente…</label><select class="in" id="ar"><option value="aprueba" ${r.resultado === 'aprueba' ? 'selected' : ''}>Aprueba</option><option value="rechaza" ${r.resultado === 'rechaza' ? 'selected' : ''}>Rechaza</option></select></div></div>
    <p class="small muted">La asociación manual queda registrada en el historial con su responsable.</p>
    <div class="btns" style="justify-content:flex-end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="aok" ${waiting.length ? '' : 'disabled'}>Asociar</button></div>`);
  bg.querySelector('#aok').onclick = async () => {
    await act(() => api('POST', `/api/responses/${r.id}/asociar`, { ordenId: bg.querySelector('#ao').value, resultado: bg.querySelector('#ar').value }), 'Respuesta asociada');
    bg.remove(); render();
  };
}

// ---------- BLOTTER ----------
function quarter(q) {
  const y = new Date().getFullYear();
  const [yy, n] = q ? q.split('-Q').map(Number) : [y, Math.floor(new Date().getMonth() / 3) + 1];
  const pad = x => String(x).padStart(2, '0');
  const end = new Date(yy, n * 3, 0).getDate();
  return [`${yy}-${pad((n - 1) * 3 + 1)}-01`, `${yy}-${pad(n * 3)}-${end}`];
}
function filtered() {
  const f = S.blotterF;
  return S.orders.filter(o => {
    const day = localDay(o.creada);
    return (!f.estado || o.estado === f.estado)
      && (!f.op || o.activos.some(a => a.operacion === f.op))
      && (!f.tipo || o.activos.some(a => a.tipo === f.tipo))
      && (!f.asesor || o.asesorId === f.asesor)
      && (!f.desde || day >= f.desde) && (!f.hasta || day <= f.hasta)
      && (!f.q || (o.numero + ' ' + o.cliente.nombre + ' ' + o.cliente.numero + ' ' + o.activos.map(a => a.instrumento + ' ' + a.ticker).join(' ')).toLowerCase().includes(f.q.toLowerCase()));
  });
}
async function viewBlotter() {
  const f = S.blotterF, rows = filtered();
  const isAs = S.me.rol === 'asesor';
  const y = new Date().getFullYear(), qs = [];
  for (let i = 1; i <= 4; i++) qs.push(`${y}-Q${i}`);
  main().innerHTML = `${banner}
  <div class="head"><div><h1>${isAs ? 'Mis órdenes' : 'Blotter'}</h1><p>${isAs ? 'Todas sus órdenes con su estado actual.' : 'Historial completo de órdenes. Funciona como Registro de Instrucciones (Art. 310 lit. d, RNMV).'}</p></div>
    <div class="btns"><button class="btn" id="csv">Exportar CSV</button>${!isAs ? `<button class="btn primary" id="xml">Registro de Instrucciones BCU (XML)</button>` : ''}</div></div>
  <div class="panel">
    <div class="filters">
      <div><label class="f">Buscar</label><input class="in" data-f="q" value="${esc(f.q || '')}" placeholder="N.º, cliente, instrumento"></div>
      <div><label class="f">Estado</label><select class="in" data-f="estado"><option value="">Todos</option>${Object.entries(S.meta.estados).map(([k, v]) => `<option value="${k}" ${f.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div><label class="f">Operación</label><select class="in" data-f="op"><option value="">Todas</option>${['Compra', 'Venta'].map(x => `<option ${f.op === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div><label class="f">Instrumento</label><select class="in" data-f="tipo"><option value="">Todos</option>${['Acción', 'Fondo', 'Bono', 'Opción'].map(x => `<option ${f.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      ${!isAs ? `<div><label class="f">Asesor</label><select class="in" data-f="asesor"><option value="">Todos</option>${S.meta.users.filter(u => u.rol === 'asesor').map(u => `<option value="${u.id}" ${f.asesor === u.id ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select></div>` : ''}
      <div><label class="f">Desde</label><input type="date" class="in" data-f="desde" value="${f.desde || ''}"></div>
      <div><label class="f">Hasta</label><input type="date" class="in" data-f="hasta" value="${f.hasta || ''}"></div>
      <div><label class="f">Trimestre</label><select class="in" id="qsel"><option value="">—</option>${qs.map(q => `<option ${f.q_ === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div>
      <div><button class="btn sm" id="clr" style="margin-top:18px">Limpiar</button></div>
    </div>
    <div class="tblwrap"><table class="tbl"><thead><tr>
      <th>N.º interno</th><th>Fecha y hora</th><th>Cliente</th>${!isAs ? '<th>Asesor</th>' : ''}<th>Operación</th><th>Tipo</th><th>Instrumento</th><th>Mon.</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Monto</th><th>Estado</th><th>Aprobación</th><th>Operador</th><th>Ejecución</th>
    </tr></thead><tbody>
    ${rows.flatMap(o => o.activos.map((a, i) => `<tr class="click" data-open="${o.id}">
      <td class="mono">${i === 0 ? o.numero : `<span class="muted">${o.numero}-${i + 1}</span>`}</td>
      <td class="small" style="white-space:nowrap">${dt(o.creada)}</td>
      <td>${esc(o.cliente.nombre)}<br><span class="mono muted">${o.cliente.numero}</span></td>
      ${!isAs ? `<td class="small">${esc(o.asesor.nombre)}</td>` : ''}
      <td class="op-${a.operacion}">${a.operacion}</td><td>${a.tipo}</td>
      <td>${esc(a.instrumento)}<br><span class="mono muted">${esc(a.ticker)}</span></td>
      <td>${a.moneda}</td><td class="num">${nf(a.cantidad)}</td><td class="num">${nf(a.monto)}</td>
      <td>${badge(o.estado)}</td>
      <td class="small">${o.fechaRespuesta ? dt(o.fechaRespuesta) : '<span class="muted">—</span>'}</td>
      <td class="small">${esc(o.operador?.nombre || '—')}</td>
      <td class="small">${o.fechaEjecucion ? dt(o.fechaEjecucion) : '—'}</td>
    </tr>`)).join('') || `<tr><td colspan="14" class="empty">No hay órdenes con estos filtros</td></tr>`}
    </tbody></table></div>
    <div class="small muted" style="padding:10px 18px">${rows.length} órdenes · ${rows.reduce((s, o) => s + o.activos.length, 0)} instrucciones</div>
  </div>`;
  bindOpen();
  const m = main();
  m.querySelectorAll('[data-f]').forEach(el => {
    const h = () => { f[el.dataset.f] = el.value; delete f.q_; viewBlotter(); if (el.dataset.f === 'q') { const i = main().querySelector('[data-f=q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
    el.tagName === 'SELECT' || el.type === 'date' ? el.onchange = h : el.oninput = h;
  });
  m.querySelector('#qsel').onchange = e => { const v = e.target.value; if (v) { [f.desde, f.hasta] = quarter(v); f.q_ = v; } else { delete f.desde; delete f.hasta; delete f.q_; } viewBlotter(); };
  m.querySelector('#clr').onclick = () => { S.blotterF = {}; viewBlotter(); };
  m.querySelector('#csv').onclick = () => exportCSV(rows);
  const x = m.querySelector('#xml');
  if (x) x.onclick = () => {
    const [dd, hh] = f.desde || f.hasta ? [f.desde || '', f.hasta || ''] : quarter();
    window.location = `/api/registro.xml?desde=${dd}&hasta=${hh}`;
    toast(`Registro de Instrucciones ${dd} a ${hh} generado`);
  };
}
function exportCSV(rows) {
  const head = ['Numero', 'FechaHora', 'NroCliente', 'Cliente', 'Asesor', 'Operacion', 'Tipo', 'Instrumento', 'Ticker/ISIN', 'Moneda', 'Cantidad', 'Monto', 'Precio', 'Estado', 'AprobacionCliente', 'Operador', 'FechaEjecucion', 'Intermediario'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(';')];
  rows.forEach(o => o.activos.forEach((a, i) => lines.push([o.numero + (i ? '-' + (i + 1) : ''), o.creada, o.cliente.numero, o.cliente.nombre, o.asesor.nombre, a.operacion, a.tipo, a.instrumento, a.ticker, a.moneda, a.cantidad, a.monto, a.precio, S.meta.estados[o.estado], o.fechaRespuesta, o.operador?.nombre, o.fechaEjecucion, o.ejecutadaEn].map(q).join(';'))));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `blotter_${today()}.csv`; a.click();
}

// ---------- DETALLE DE ORDEN ----------
const FLOW = ['pendiente_revision', 'en_revision', 'en_trading_desk', 'mail_enviado', 'aprobada', 'en_ejecucion', 'ejecutada'];
async function openDetail(id) {
  let o; try { o = await api('GET', '/api/orders/' + id); } catch (e) { return toast(e.message, true); }
  S.detail = id;
  closeDetail(true);
  const flow = o.canal === 'directo' ? ['mail_enviado', 'aprobada', 'en_ejecucion', 'ejecutada'] : FLOW;
  const ci = flow.indexOf(o.estado);
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'ov';
  ov.innerHTML = `<div class="drawer">
    <div class="dh"><button class="x" id="dx">×</button>
      <h2><span class="mono" style="font-size:17px">${o.numero}</span>${badge(o.estado)}</h2>
      <div class="muted small" style="margin:6px 0 12px">Creada ${dt(o.creada)} · ${o.canal === 'directo' ? 'Enviada directo por el asesor' : 'Canalizada por la Mesa'}</div>
      <div class="flow">${ci >= 0 ? flow.map((s, i) => `<span class="${i < ci ? 'done' : i === ci ? 'cur' : ''}">${S.meta.estados[s]}</span>`).join('') : `<span class="cur">${S.meta.estados[o.estado]}</span>`}</div>
      <div class="btns" style="margin-top:12px">${actionsFor(o, false)}</div>
    </div>
    <div class="db">
      ${o.motivo ? `<div class="warnbox"><b>Motivo:</b> ${esc(o.motivo)}</div>` : ''}
      ${['ejecutada', 'en_ejecucion'].includes(o.estado) && !o.respuesta ? `<div class="errors" style="margin:0">Atención: orden en ejecución sin aprobación registrada.</div>` : ''}
      <div class="panel"><div class="pb"><div class="kv">
        <div><span>Cliente</span><b>${esc(o.cliente.nombre)}</b></div>
        <div><span>N.º cliente</span><b class="mono">${o.cliente.numero}</b></div>
        <div><span>Email</span><b>${esc(o.cliente.email)}</b></div>
        <div><span>Asesor</span><b>${esc(o.asesor.nombre)}</b></div>
        <div><span>Fecha de instrucción</span><b>${d(o.fechaInstruccion + 'T12:00:00')}</b></div>
        <div><span>Quién opera</span><b>${o.opera === 'mesa' ? 'La ingresa la Mesa' : 'Opera el asesor'}</b></div>
        <div><span>Operador asignado</span><b>${esc(o.operador?.nombre || '—')}</b></div>
        <div><span>Aprobación del cliente</span><b>${o.fechaRespuesta ? dt(o.fechaRespuesta) : '—'}</b></div>
        <div><span>Ejecución</span><b>${o.fechaEjecucion ? dt(o.fechaEjecucion) + (o.ejecutadaEn ? ' · ' + esc(o.ejecutadaEn) : '') : '—'}</b></div>
        ${o.copias.length ? `<div style="grid-column:span 3"><span>Copias internas</span><b>${o.copias.map(esc).join(', ')}</b></div>` : ''}
        ${o.observaciones ? `<div style="grid-column:span 3"><span>Observaciones</span><b>${esc(o.observaciones)}</b></div>` : ''}
      </div></div></div>
      <div class="panel"><div class="ph"><h3>Activos</h3></div><table class="tbl"><thead><tr><th>Operación</th><th>Tipo</th><th>Instrumento</th><th>Mon.</th><th style="text-align:right">Cantidad</th><th>Precio</th><th style="text-align:right">Monto est.</th></tr></thead><tbody>
        ${o.activos.map(a => `<tr><td class="op-${a.operacion}">${a.operacion}</td><td>${a.tipo}</td><td>${esc(a.instrumento)} <span class="mono muted">${esc(a.ticker)}</span></td><td>${a.moneda}</td><td class="num">${nf(a.cantidad)}</td><td class="small">${esc(a.precio)}${a.vigencia ? ' · ' + esc(a.vigencia) : ''}</td><td class="num">${nf(a.monto)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="panel"><div class="ph"><h3>Mail al cliente</h3>${o.fechaMail ? `<span class="small muted">Enviado ${dt(o.fechaMail)}</span>` : '<span class="small muted">Aún no enviado</span>'}</div><div class="pb">
        <div class="mail"><div class="mh"><div><b>De</b>${esc(o.mail.de)}</div><div><b>Para</b>${esc(o.mail.para)}</div><div><b>CC</b>${esc(o.mail.cc)}</div><div><b>Asunto</b><span style="font-weight:600">${esc(o.mail.asunto)}</span></div></div><pre>${esc(o.mail.cuerpo)}</pre></div>
      </div></div>
      ${o.respuesta ? `<div class="panel"><div class="ph"><h3>Respuesta del cliente</h3><span class="badge b-${o.respuesta.resultado}">${o.respuesta.resultado === 'aprueba' ? 'Aprueba' : 'Rechaza'}</span></div><div class="pb">
        <div class="mail"><div class="mh"><div><b>De</b>${esc(o.respuesta.de)}</div><div><b>Fecha</b>${dt(o.respuesta.recibida)}</div><div><b>Asunto</b>${esc(o.respuesta.asunto)}</div></div><pre>${esc(o.respuesta.cuerpo)}</pre></div>
        <p class="small muted" style="margin:10px 0 0">Código <span class="mono">${esc(o.respuesta.codigo || '—')}</span> · asociada ${o.respuesta.asociadaPor === 'manual' ? 'manualmente' : 'automáticamente'}</p>
      </div></div>` : ''}
      <div class="panel"><div class="ph"><h3>Historial de actividad</h3></div><div class="pb"><ul class="timeline">
        ${o.actividad.map(a => `<li><div><b>${esc(a.accion)}</b>${a.detalle ? ` <span class="muted">· ${esc(a.detalle)}</span>` : ''}</div><div class="t">${dt(a.fecha)} · ${esc(a.usuario)}</div></li>`).join('')}
      </ul></div></div>
    </div></div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) closeDetail(); };
  ov.querySelector('#dx').onclick = () => closeDetail();
}
function closeDetail(keep) { document.getElementById('ov')?.remove(); if (!keep) S.detail = null; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.querySelector('.modal-bg')?.remove() || closeDetail(); } });

// ---------- modales ----------
function modal(html) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(bg);
  bg.onclick = e => { if (e.target === bg || e.target.hasAttribute('data-close')) bg.remove(); };
  return bg;
}
function confirmModal(title, text, onOk) {
  const bg = modal(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="btns" style="justify-content:flex-end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Confirmar</button></div>`);
  bg.querySelector('#ok').onclick = async () => { bg.remove(); await onOk(); };
}
function promptModal(title, label, onOk) {
  const bg = modal(`<h3>${esc(title)}</h3><label class="f">${esc(label)} <span class="req">*</span></label><textarea class="in" id="pm" rows="3"></textarea><div class="btns" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-close>Volver</button><button class="btn primary" id="ok">Confirmar</button></div>`);
  bg.querySelector('#pm').focus();
  bg.querySelector('#ok').onclick = async () => { const v = bg.querySelector('#pm').value.trim(); if (!v) return toast('Indique el motivo', true); bg.remove(); await onOk(v); };
}
function execModal(id) {
  const bg = modal(`<h3>Registrar ejecución</h3><p class="small muted" style="margin-top:0">La orden se ejecuta en la plataforma del intermediario y se registra aquí.</p>
    <div class="row"><div><label class="f">Ejecutada en</label><select class="in" id="ee"><option>Insigneo</option><option>BNY Pershing (vía Insigneo)</option><option>Banco Itaú</option><option>Banco Santander</option></select></div></div>
    <div class="row"><div><label class="f">Precio de ejecución (opcional)</label><input class="in" id="ep" type="number" step="0.0001"></div></div>
    <div class="btns" style="justify-content:flex-end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Marcar ejecutada</button></div>`);
  bg.querySelector('#ok').onclick = async () => {
    await act(() => api('POST', `/api/orders/${id}/ejecutar`, { ejecutadaEn: bg.querySelector('#ee').value, precioEjecucion: bg.querySelector('#ep').value }), 'Orden ejecutada y registrada');
    bg.remove(); refresh(id);
  };
}

boot();
