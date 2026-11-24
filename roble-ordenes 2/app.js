/* Órdenes – Roble Capital CRM (prototipo) */
const $app = document.getElementById('app');
const S = { me: null, meta: null, orders: [], responses: [], form: null, preview: null, errors: [], open: { desk: true, form: false, resp: true }, deskF: { asesor: '', rango: 'hoy' }, bf: {}, detail: null };

// ---------- utilidades ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('es-UY');
const fecha = iso => iso ? new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const hora = iso => iso ? new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : '—';
const dt = iso => iso ? fecha(iso) + ' ' + hora(iso) : '—';
const today = () => { const t = new Date(); return new Date(t - t.getTimezoneOffset() * 60e3).toISOString().slice(0, 10); };
const localDay = iso => { const t = new Date(iso); return new Date(t - t.getTimezoneOffset() * 60e3).toISOString().slice(0, 10); };
function ago(iso) {
  const m = (Date.now() - new Date(iso)) / 60e3;
  if (m < 60) return `hace ${Math.max(1, Math.round(m))} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return `hace ${Math.round(m / 1440)} d`;
}
const badge = e => `<span class="badge s-${e}">${esc(S.meta?.estados[e] || e)}</span>`;
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>',
  down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m6 15 6-6 6 6"/>',
  out: '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
};
const LOGO = `<img class="logo" src="https://roble-crm-development.up.railway.app/download.png" alt="Roble Capital" onerror="this.outerHTML='<span class=logo-txt>ROBLE<b>CAPITAL</b></span>'">`;

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { }
  if (!r.ok) { const e = new Error(data?.error || (data?.errors || []).join(' · ') || 'Error'); e.data = data; throw e; }
  return data;
}
function toast(msg, err) {
  const el = document.createElement('div'); el.textContent = msg; if (err) el.className = 'err';
  document.getElementById('toast').appendChild(el); setTimeout(() => el.remove(), 3000);
}
async function act(fn, ok) { try { const r = await fn(); if (ok) toast(ok); return r; } catch (e) { toast(e.message, true); throw e; } }
const route = () => location.hash.replace('#/', '') === 'blotter' ? 'blotter' : 'enviar';

// ---------- arranque / login ----------
async function boot() {
  try { S.me = await api('GET', '/api/me'); } catch { S.me = null; }
  if (!S.me) return renderLogin();
  S.meta = await api('GET', '/api/meta');
  render();
}
window.addEventListener('hashchange', () => S.me && render());
async function login(email) { try { await api('POST', '/api/login', { email }); boot(); } catch (e) { toast(e.message, true); } }

async function renderLogin() {
  const users = (await api('GET', '/api/users')).filter(u => u.rol !== 'cumplimiento');
  $app.innerHTML = `<div class="login"><div class="lcard">
      ${LOGO}
      <button class="gbtn" id="g"><svg viewBox="0 0 48 48" width="20"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6C12.3 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.4 28.8A14.5 14.5 0 0 1 9.5 24c0-1.7.3-3.3.9-4.8l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-4-13.6-9.7l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>Continuar con Google</button>
      <p class="hint">Solo cuentas <b>@roblecapital.net</b></p>
      <div class="or"><span>o</span></div>
      <form id="lg"><input class="in" name="email" placeholder="nombre@roblecapital.net" autocomplete="off"><button class="btn navy full">Entrar</button></form>
    </div>
    <div class="wm">WEALTH MANAGEMENT</div>
    <div class="copy">Prototipo académico · Datos de prueba</div></div>`;
  $app.querySelector('#lg').onsubmit = e => { e.preventDefault(); login(e.target.email.value); };
  $app.querySelector('#g').onclick = () => {
    const bg = modal(`<h3 style="text-align:center">Elegí una cuenta</h3>${users.map(u => `<button class="acc" data-email="${u.email}"><span class="avg">${u.nombre[0]}</span><span><b>${esc(u.nombre)}</b><small>${u.email}</small></span><em>${u.rol === 'mesa' ? 'Trading Desk' : 'Asesor'}</em></button>`).join('')}`);
    bg.querySelectorAll('.acc').forEach(b => b.onclick = () => { bg.remove(); login(b.dataset.email); });
  };
}

// ---------- shell ----------
async function render() {
  const r = route();
  S.orders = await api('GET', '/api/orders');
  const pend = S.orders.filter(o => o.estado === 'pendiente_revision').length;
  const esAsesor = S.me.rol === 'asesor';
  $app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="sh">${LOGO}<span class="sic">${ico(I.bell)}</span></div>
      <div class="search">${ico(I.search)}<span>Buscar...</span><kbd>Ctrl K</kbd></div>
      <nav>
        <div class="mod on"><span class="mi">${ico(I.send)}</span><div><b>Órdenes ${pend ? `<i class="cnt">${pend}</i>` : ''}</b><small>Enviar órdenes a Trading Desk y blotter</small></div>${ico(I.down)}</div>
        <div class="sub">
          <a href="#/enviar" class="${r === 'enviar' ? 'on' : ''}">Enviar órdenes ${pend ? `<i class="cnt">${pend}</i>` : ''}</a>
          <a href="#/blotter" class="${r === 'blotter' ? 'on' : ''}">Blotter</a>
        </div>
      </nav>
      <div class="sf">
        <label class="modo">${ico(I.clip)}<span>Modo Asesor</span><input type="checkbox" id="modo" ${esAsesor ? 'checked' : ''}><i></i></label>
        <div class="user"><span class="avg">${S.me.nombre[0]}</span><div><b>${esc(S.me.nombre)}</b><small>${esAsesor ? 'Asesor' : 'Trading Desk'}</small></div></div>
        <div class="sfl"><button id="reset">${ico(I.reset)}Reiniciar demo</button><button id="logout" title="Salir">${ico(I.out)}</button></div>
      </div>
    </aside>
    <main class="main">
      <div class="crumbs">${ico(I.home)}Inicio <s>›</s> Órdenes <s>›</s> <b>${r === 'blotter' ? 'Blotter' : 'Enviar órdenes'}</b></div>
      <div class="tabs"><a href="#/enviar" class="${r === 'enviar' ? 'on' : ''}">Enviar órdenes</a><a href="#/blotter" class="${r === 'blotter' ? 'on' : ''}">Blotter</a></div>
      <div id="page"></div>
    </main></div>`;
  document.getElementById('logout').onclick = async () => { await api('POST', '/api/logout'); S.me = null; S.form = null; boot(); };
  document.getElementById('reset').onclick = async () => { await api('POST', '/api/reset'); S.form = null; toast('Demo reiniciada'); render(); };
  // Modo Asesor: cambia entre la vista de la Mesa y la de un asesor
  document.getElementById('modo').onchange = e => { S.form = null; login(e.target.checked ? 'mpereira@roblecapital.net' : 'vrios@roblecapital.net'); };
  r === 'blotter' ? viewBlotter() : viewEnviar();
}
const page = () => document.getElementById('page');
const hero = (title, sub, right = '') => `<div class="hero"><div><small>ÓRDENES</small><h1>${title}</h1><p>${sub}</p></div>${right}</div>`;
const panel = (key, dot, title, sub, body) => `<section class="panel"><header data-toggle="${key}"><i class="dot ${dot}"></i><div><b>${title}</b><small>${sub}</small></div>${ico(S.open[key] ? I.up : I.down)}</header>${S.open[key] ? `<div class="pbody">${body}</div>` : ''}</section>`;

// ---------- ENVIAR ÓRDENES (Trading Desk hoy + formulario + respuestas) ----------
async function viewEnviar() {
  if (!S.form) S.form = newForm();
  if (S.me.rol !== 'asesor' && S.open.resp) S.responses = await api('GET', '/api/responses');
  page().innerHTML = hero('Enviar órdenes', 'Enviá órdenes a Trading Desk y seguí el estado del día', `<button class="hbtn" id="cierre">${ico(I.chart)}Cierre del día</button>`)
    + panel('desk', 'orange', 'Trading Desk hoy', 'Órdenes del día — estados y acciones', deskHTML())
    + panel('form', 'blue', 'Enviar órdenes', 'Redactar una orden para Trading Desk', formHTML())
    + (S.me.rol !== 'asesor' ? panel('resp', 'blue', 'Respuestas de clientes', 'Lo que respondieron los clientes a los mails de orden', respHTML()) : '');
  page().querySelectorAll('[data-toggle]').forEach(h => h.onclick = () => { S.open[h.dataset.toggle] = !S.open[h.dataset.toggle]; viewEnviar(); });
  document.getElementById('cierre').onclick = cierreModal;
  bindDesk(); if (S.open.form) bindForm(); bindResp();
}

// Trading Desk hoy
function deskList() {
  const f = S.deskF, t = today();
  return S.orders.filter(o => {
    if (f.asesor && o.asesorId !== f.asesor) return false;
    if (f.rango === 'todo') return true;
    if (f.rango === '7d') return Date.now() - new Date(o.creada) < 7 * 864e5;
    const abierta = !['ejecutada', 'cancelada', 'rechazada'].includes(o.estado);
    return abierta || localDay(o.creada) === t || (o.fechaEjecucion && localDay(o.fechaEjecucion) === t);
  });
}
function deskHTML() {
  const l = deskList(), n = e => l.filter(o => e.includes(o.estado)).length;
  return `<div class="tiles">
      <div class="tile amber"><span>Por revisar</span><b>${n(['pendiente_revision', 'en_revision'])}</b></div>
      <div class="tile indigo"><span>Esperando cliente</span><b>${n(['en_trading_desk', 'mail_enviado'])}</b></div>
      <div class="tile purple"><span>Para ejecutar</span><b>${n(['aprobada', 'en_ejecucion'])}</b></div>
      <div class="tile green"><span>Ejecutadas</span><b>${n(['ejecutada'])}</b></div>
    </div>
    <div class="box">
      <div class="boxh"><b>${l.length} SOLICITUDES</b><div class="ctrl">
        ${S.me.rol !== 'asesor' ? `<select class="in sm" id="fAs"><option value="">Todos los asesores</option>${S.meta.users.filter(u => u.rol === 'asesor').map(u => `<option value="${u.id}" ${S.deskF.asesor === u.id ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select>` : ''}
        <div class="seg">${[['hoy', 'Hoy'], ['7d', '7 días'], ['todo', 'Todo']].map(([k, v]) => `<button data-rango="${k}" class="${S.deskF.rango === k ? 'on' : ''}">${v}</button>`).join('')}</div></div></div>
      ${l.length ? l.map(o => `<div class="orow" data-open="${o.id}">
          <div class="oc1"><span class="mono">${o.numero}</span><b>${esc(o.cliente.nombre)}</b></div>
          <div class="oc2">${assetLine(o)}<small>${esc(o.asesor.nombre)} · ${ago(o.creada)}${o.operador ? ' · Op: ' + esc(o.operador.nombre.split(' ')[0]) : ''}</small></div>
          <div class="oc3">${badge(o.estado)}</div>
          <div class="oc4">${actionsFor(o, true)}</div>
        </div>`).join('') : `<div class="empty">${ico(I.check)}<b>No hay solicitudes para hoy</b><span>Cuando un asesor envíe una orden a Trading Desk va a aparecer acá.</span></div>`}
    </div>`;
}
function bindDesk() {
  const p = page();
  p.querySelectorAll('[data-rango]').forEach(b => b.onclick = () => { S.deskF.rango = b.dataset.rango; viewEnviar(); });
  const fa = p.querySelector('#fAs'); if (fa) fa.onchange = () => { S.deskF.asesor = fa.value; viewEnviar(); };
  p.querySelectorAll('[data-open]').forEach(el => el.onclick = e => { e.preventDefault(); openDetail(el.dataset.open); });
}
function assetLine(o) {
  const a = o.activos[0];
  return `<span class="op-${a.operacion}">${a.operacion}</span> ${nf(a.cantidad)} ${esc(a.ticker && a.ticker.length < 8 ? a.ticker : a.instrumento)}${o.activos.length > 1 ? ` <span class="muted">+${o.activos.length - 1}</span>` : ''}`;
}

// acciones según estado y rol
function actionsFor(o, compact) {
  const r = S.me.rol, b = [];
  if (r === 'mesa') {
    if (o.estado === 'pendiente_revision') b.push(['tomar-revision', 'Revisar', 'navy']);
    if (o.estado === 'en_revision') b.push(['aprobar-revision', 'Aprobar', 'navy']);
    if (['pendiente_revision', 'en_revision'].includes(o.estado) && !compact) b.push(['devolver', 'Devolver', '']);
    if (o.estado === 'en_trading_desk') b.push(['enviar-mail', 'Enviar mail', 'navy']);
  }
  const canExec = r === 'mesa' || o.canal === 'directo';
  if (canExec && o.estado === 'aprobada') b.push(['tomar', 'Tomar', 'green']);
  if (canExec && o.estado === 'en_ejecucion' && o.operadorId === S.me.id) b.push(['ejecutar', 'Ejecutada', 'green']);
  if (o.estado === 'mail_enviado') { b.push(['sim-ok', 'Cliente confirma', 'ghost']); if (!compact) b.push(['sim-no', 'Cliente rechaza', 'ghost']); }
  if (r === 'asesor' && o.estado === 'devuelta') b.push(['corregir', 'Corregir', 'navy']);
  if (!compact && !['ejecutada', 'cancelada', 'rechazada'].includes(o.estado)) b.push(['cancelar', 'Cancelar', 'danger']);
  return b.map(([a, l, c]) => `<button class="btn sm ${c}" data-act="${a}" data-id="${o.id}">${l}</button>`).join('');
}
async function doAction(id, a) {
  if (a === 'corregir') return loadForEdit(id);
  if (a === 'sim-ok' || a === 'sim-no') {
    const r = await act(() => api('POST', `/api/orders/${id}/simular-respuesta`, { aprueba: a === 'sim-ok' }));
    toast(r.resultado === 'aprueba' ? 'El cliente aprobó la orden' : 'El cliente rechazó la orden');
    return refresh(id);
  }
  if (a === 'devolver' || a === 'cancelar') return promptModal(a === 'devolver' ? 'Devolver al asesor' : 'Cancelar orden', async motivo => { await act(() => api('POST', `/api/orders/${id}/${a}`, { motivo }), a === 'devolver' ? 'Orden devuelta' : 'Orden cancelada'); refresh(id); });
  if (a === 'ejecutar') return execModal(id);
  const ok = { 'tomar-revision': 'En revisión', 'aprobar-revision': 'Revisión aprobada', 'enviar-mail': 'Mail enviado al cliente', 'tomar': 'Orden asignada a vos' };
  await act(() => api('POST', `/api/orders/${id}/${a}`, {}), ok[a]);
  refresh(id);
}
async function refresh(id) { await render(); if (S.detail && id) openDetail(id); }
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; e.stopPropagation(); doAction(b.dataset.id, b.dataset.act); }, true);

// Formulario
const TIPOS = { Acción: ['Acciones', 'acc.', 'Nombre de la empresa', 'Ej: Apple Inc.', 'Ej: AAPL'], Fondo: ['Fondos', 'cuotas', 'Nombre del fondo', 'Ej: PIMCO Income', 'ISIN'], Bono: ['Bonos', 'VN', 'Nombre del bono', 'Ej: US Treasury 2034', 'ISIN'], Opción: ['Opciones', 'contratos', 'Subyacente', 'Ej: SPY Put 560', 'Ej: SPY270319P560'] };
const newAsset = tipo => ({ tipo, operacion: 'Compra', instrumento: '', ticker: '', cantidad: '', precioTipo: 'A mercado', precioLim: '', moneda: 'USD', vigencia: 'DIA' });
const newForm = () => ({ clienteId: '', q: '', fechaInstruccion: today(), operaAsesor: false, copias: [], activos: [], editId: null });

function formHTML() {
  const f = S.form, cl = S.meta.clients.find(c => c.id === f.clienteId);
  return `<div class="fgrid"><div>
    ${S.errors.length ? `<div class="errors">${S.errors.map(esc).join('<br>')}</div>` : ''}
    <div class="card"><div class="ct">CLIENTE</div>
      <div class="r3">
        <div class="pick"><label>Buscar cliente</label><input class="in" id="cq" placeholder="Nombre o N° de cliente..." value="${esc(f.q)}" autocomplete="off" ${f.editId ? 'disabled' : ''}><div class="dd" id="cdd" hidden></div></div>
        <div><label>Nombre</label><input class="in" value="${esc(cl?.nombre || '')}" placeholder="Nombre y apellido" readonly></div>
        <div><label>N° de cliente</label><input class="in" value="${esc(cl?.numero || '')}" placeholder="Autocompletado" readonly></div>
      </div>
      <div class="r3">
        <div><label>Email</label><input class="in" value="${esc(cl?.email || '')}" placeholder="Email del cliente" readonly></div>
        <div><label>Fecha de instrucción</label><input class="in" type="date" id="ff" value="${f.fechaInstruccion}"></div><div></div>
      </div>
      <label class="chk"><input type="checkbox" id="opa" ${f.operaAsesor ? 'checked' : ''}> <b>Opera asesor</b> <span>— la ingresa Trading Desk</span></label>
      <label>CC (copia interna)</label>
      <div class="chips">${f.copias.map((c, i) => `<span class="chip">${esc(c)}<button data-rmcc="${i}">×</button></span>`).join('')}<input id="ccin" placeholder="Buscar o escribir email..."></div>
    </div>
    ${f.activos.map((a, i) => { const t = TIPOS[a.tipo]; return `<div class="card asset t-${a.tipo}">
      <div class="ah"><span class="num">#${i + 1}</span><b>${t[0]}</b><button class="x" data-rma="${i}">${ico(I.x)}</button></div>
      <div class="r2">
        <div><label>Operación</label><select class="in" data-a="${i}" data-k="operacion">${['Compra', 'Venta'].map(x => `<option ${a.operacion === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div><label>${t[2]}</label><input class="in" data-a="${i}" data-k="instrumento" value="${esc(a.instrumento)}" placeholder="${t[3]}"></div>
        <div><label>${a.tipo === 'Acción' ? 'Ticker' : a.tipo === 'Opción' ? 'Código' : 'ISIN'} *</label><input class="in" data-a="${i}" data-k="ticker" value="${esc(a.ticker)}" placeholder="${t[4]}"></div>
        <div><label>Cantidad *</label><div class="unit"><input class="in" type="number" data-a="${i}" data-k="cantidad" value="${esc(a.cantidad)}" placeholder="Ej: 100"><span>${t[1]}</span></div></div>
        <div><label>Tipo de precio</label><select class="in" data-a="${i}" data-k="precioTipo" data-re="1">${['A mercado', 'Límite'].map(x => `<option ${a.precioTipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div><label>${a.precioTipo === 'Límite' ? 'Precio límite *' : 'Moneda'}</label>${a.precioTipo === 'Límite' ? `<input class="in" type="number" step="0.01" data-a="${i}" data-k="precioLim" value="${esc(a.precioLim)}">` : `<select class="in" data-a="${i}" data-k="moneda">${['USD', 'EUR', 'UYU'].map(x => `<option ${a.moneda === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`}</div>
        <div><label>Vigencia</label><select class="in" data-a="${i}" data-k="vigencia">${['DIA', 'GTC'].map(x => `<option ${a.vigencia === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div></div>`; }).join('')}
    <div class="addbox"><div class="ct">AGREGAR ACTIVO</div><div class="addbtns">${Object.keys(TIPOS).map(k => `<button class="add t-${k}" data-add="${k}">+ ${k}</button>`).join('')}</div></div>
  </div>
  <div class="fside">
    <div class="note">${ico(I.info)}<div><b>Dos formas de enviar</b><br><b>Enviar a mesa:</b> Trading Desk revisa y envía el mail. <b>Enviar a cliente:</b> el mail sale ya.</div></div>
    <div class="card prev"><div class="ph">PREVIEW DEL EMAIL</div>
      ${S.preview ? `<div class="mh"><div><span>Para</span>${esc(S.preview.para)}</div><div><span>CC</span>${esc(S.preview.cc)}</div><div><span>Asunto</span><b>${esc(S.preview.asunto)}</b></div></div><pre>${esc(S.preview.cuerpo)}</pre>`
      : `<div class="empty">${ico(I.doc)}<b>Sin preview</b><span>Completá la orden y presioná <b>Generar preview</b></span></div>`}
    </div>
    <button class="btn full" id="prev">Generar preview del email</button>
    <button class="btn navy full big" id="sendMesa">${ico(I.clip)}${f.editId ? 'Reenviar a mesa' : 'Enviar a mesa'}</button>
    ${f.editId ? '' : `<button class="btn green full big" id="sendCli">${ico(I.send)}Enviar a cliente</button>`}
  </div></div>`;
}
function bindForm() {
  const f = S.form, p = page();
  const cq = p.querySelector('#cq'), dd = p.querySelector('#cdd');
  const show = () => {
    const q = cq.value.toLowerCase();
    const list = S.meta.clients.filter(c => (S.me.rol !== 'asesor' || c.asesorId === S.me.id) && (!q || c.nombre.toLowerCase().includes(q) || c.numero.includes(q))).slice(0, 8);
    dd.innerHTML = list.map(c => `<div data-cid="${c.id}"><span>${esc(c.nombre)}</span><span class="mono muted">${c.numero}</span></div>`).join('') || '<div class="muted">Sin resultados</div>';
    dd.hidden = false;
  };
  cq.onfocus = show; cq.oninput = () => { f.q = cq.value; show(); }; cq.onblur = () => setTimeout(() => dd.hidden = true, 150);
  dd.onmousedown = e => { const t = e.target.closest('[data-cid]'); if (t) { const c = S.meta.clients.find(x => x.id === t.dataset.cid); f.clienteId = c.id; f.q = c.nombre; S.preview = null; viewEnviar(); } };
  p.querySelector('#ff').oninput = e => f.fechaInstruccion = e.target.value;
  p.querySelector('#opa').onchange = e => f.operaAsesor = e.target.checked;
  p.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { f.activos.push(newAsset(b.dataset.add)); viewEnviar(); });
  p.querySelectorAll('[data-rma]').forEach(b => b.onclick = () => { f.activos.splice(+b.dataset.rma, 1); viewEnviar(); });
  p.querySelectorAll('[data-rmcc]').forEach(b => b.onclick = () => { f.copias.splice(+b.dataset.rmcc, 1); viewEnviar(); });
  p.querySelectorAll('[data-a]').forEach(el => {
    const h = () => { f.activos[el.dataset.a][el.dataset.k] = el.value; if (el.dataset.re) viewEnviar(); };
    el.tagName === 'SELECT' ? el.onchange = h : el.oninput = h;
  });
  const cc = p.querySelector('#ccin');
  cc.onkeydown = e => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault(); const v = cc.value.trim().replace(/,$/, '').toLowerCase(); if (!v) return;
    if (!/^[^@\s]+@roblecapital\.net$/.test(v)) return toast('Solo emails @roblecapital.net', true);
    f.copias.push(v); viewEnviar(); page().querySelector('#ccin').focus();
  };
  const payload = canal => ({
    clienteId: f.clienteId, fechaInstruccion: f.fechaInstruccion, opera: f.operaAsesor ? 'asesor' : 'mesa', canal, copias: f.copias,
    activos: f.activos.map(a => ({ operacion: a.operacion, tipo: a.tipo, instrumento: (a.instrumento || a.ticker).trim(), ticker: a.ticker.trim(), moneda: a.moneda, cantidad: a.cantidad, vigencia: a.vigencia === 'DIA' ? 'Día' : 'Hasta cancelar', precio: a.precioTipo === 'A mercado' ? 'Mercado' : (a.precioLim ? 'Límite ' + a.precioLim : '') })),
  });
  const check = () => {
    const e = [];
    if (!f.clienteId) e.push('Elegí un cliente.');
    if (!f.activos.length) e.push('Agregá al menos un activo.');
    f.activos.forEach((a, i) => { if (!a.ticker.trim() || !(Number(a.cantidad) > 0) || (a.precioTipo === 'Límite' && !a.precioLim)) e.push(`Activo #${i + 1}: completá ticker/ISIN, cantidad${a.precioTipo === 'Límite' ? ' y precio límite' : ''}.`); });
    S.errors = e; return !e.length;
  };
  p.querySelector('#prev').onclick = async () => { if (!check()) return viewEnviar(); try { S.preview = await api('POST', '/api/orders/preview', payload('mesa')); } catch (e) { S.errors = [e.message]; } viewEnviar(); };
  const send = async canal => {
    if (!check()) return viewEnviar();
    try {
      let o = f.editId ? await api('PUT', '/api/orders/' + f.editId, payload(canal)) : await api('POST', '/api/orders', payload(canal));
      // Trading Desk enviando directo: revisa, aprueba y manda el mail en el mismo paso
      if (canal === 'directo' && o.estado === 'pendiente_revision') for (const a of ['tomar-revision', 'aprobar-revision', 'enviar-mail']) o = await api('POST', `/api/orders/${o.id}/${a}`, {});
      toast(canal === 'directo' ? `${o.numero} enviada al cliente` : `${o.numero} enviada a Trading Desk`);
      S.form = newForm(); S.preview = null; S.errors = []; S.open.form = false; S.open.desk = true;
      await render(); openDetail(o.id);
    } catch (e) { S.errors = e.data?.errors || [e.message]; viewEnviar(); }
  };
  p.querySelector('#sendMesa').onclick = () => send('mesa');
  const sc = p.querySelector('#sendCli'); if (sc) sc.onclick = () => send('directo');
}
async function loadForEdit(id) {
  const o = await api('GET', '/api/orders/' + id);
  S.form = { clienteId: o.clienteId, q: o.cliente.nombre, fechaInstruccion: o.fechaInstruccion, operaAsesor: o.opera === 'asesor', copias: o.copias.slice(), editId: o.id,
    activos: o.activos.map(a => ({ tipo: a.tipo, operacion: a.operacion, instrumento: a.instrumento, ticker: a.ticker || '', cantidad: a.cantidad, moneda: a.moneda, vigencia: a.vigencia === 'Hasta cancelar' ? 'GTC' : 'DIA', precioTipo: String(a.precio).startsWith('Límite') ? 'Límite' : 'A mercado', precioLim: String(a.precio).replace('Límite ', '').replace('Mercado', '') })) };
  S.errors = []; S.preview = null; S.open.form = true;
  closeDetail(); location.hash = '#/enviar'; render();
}

// Respuestas de clientes
function respHTML() {
  return `<div class="rlist">${S.responses.slice(0, 12).map(r => `<div class="rrow">
      <div class="rtop"><b>${esc(r.de)}</b>${r.orden ? `<a href="#" class="tag ok" data-open="${r.orden.id}">${r.orden.numero} · ${r.resultado === 'rechaza' ? 'Rechazada' : 'Aprobada'}</a>` : '<span class="tag warn">Sin orden asociada</span>'}<span class="muted">${fecha(r.recibida).slice(0, 5)} ${hora(r.recibida)}</span></div>
      <div class="rq">“${esc(r.cuerpo.split('\n')[0])}”</div>
      <div class="rs">${esc(r.asunto)}${!r.orden && S.me.rol === 'mesa' ? ` · <a href="#" data-assoc="${r.id}">Asociar a una orden</a>` : ''}</div>
    </div>`).join('') || '<div class="empty"><b>Sin respuestas</b></div>'}</div>`;
}
function bindResp() {
  page().querySelectorAll('.rlist [data-open]').forEach(a => a.onclick = e => { e.preventDefault(); openDetail(a.dataset.open); });
  page().querySelectorAll('[data-assoc]').forEach(a => a.onclick = e => { e.preventDefault(); assocModal(S.responses.find(r => r.id === a.dataset.assoc)); });
}
function assocModal(r) {
  const w = S.orders.filter(o => o.estado === 'mail_enviado');
  const bg = modal(`<h3>Asociar respuesta</h3><p class="muted">${esc(r.de)}: “${esc(r.cuerpo.split('\n')[0])}”</p>
    <label>Orden</label><select class="in" id="ao">${w.map(o => `<option value="${o.id}" ${o.cliente.email === r.de ? 'selected' : ''}>${o.numero} · ${esc(o.cliente.nombre)}</option>`).join('')}</select>
    <label style="margin-top:10px">El cliente</label><select class="in" id="ar"><option value="aprueba">Aprueba</option><option value="rechaza">Rechaza</option></select>
    <div class="mbtns"><button class="btn" data-close>Cancelar</button><button class="btn navy" id="ok" ${w.length ? '' : 'disabled'}>Asociar</button></div>`);
  bg.querySelector('#ok').onclick = async () => { await act(() => api('POST', `/api/responses/${r.id}/asociar`, { ordenId: bg.querySelector('#ao').value, resultado: bg.querySelector('#ar').value }), 'Respuesta asociada'); bg.remove(); render(); };
}
function cierreModal() {
  const t = today(), hoy = S.orders.filter(o => o.fechaEjecucion && localDay(o.fechaEjecucion) === t);
  const ab = S.orders.filter(o => !['ejecutada', 'cancelada', 'rechazada'].includes(o.estado));
  modal(`<h3>Cierre del día</h3>
    <div class="tiles two"><div class="tile green"><span>Ejecutadas hoy</span><b>${hoy.length}</b></div><div class="tile amber"><span>Quedan abiertas</span><b>${ab.length}</b></div></div>
    ${hoy.map(o => `<div class="mini"><span class="mono">${o.numero}</span> ${esc(o.cliente.nombre)} · ${assetLine(o)}</div>`).join('')}
    <div class="mbtns"><button class="btn navy" data-close>Cerrar</button></div>`);
}

// ---------- BLOTTER ----------
function bRows() {
  const f = S.bf;
  return S.orders.filter(o => {
    const d = localDay(o.creada);
    return (!f.estado || o.estado === f.estado) && (!f.op || o.activos.some(a => a.operacion === f.op)) && (!f.tipo || o.activos.some(a => a.tipo === f.tipo))
      && (!f.asesor || o.asesorId === f.asesor) && (!f.desde || d >= f.desde) && (!f.hasta || d <= f.hasta)
      && (!f.q || `${o.numero} ${o.cliente.nombre} ${o.cliente.numero} ${o.activos.map(a => a.instrumento + ' ' + a.ticker).join(' ')}`.toLowerCase().includes(f.q.toLowerCase()));
  });
}
function viewBlotter() {
  const f = S.bf, rows = bRows(), sel = (k, all, opts) => `<select class="in" data-f="${k}"><option value="">${all}</option>${opts.map(([v, l]) => `<option value="${v}" ${f[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  page().innerHTML = hero('Órdenes', 'Enviá órdenes a Trading Desk, seguí el día y consultá el historial', `<div class="pills"><a href="#/enviar">Enviar órdenes</a><a href="#/enviar">Trading Desk hoy</a><a class="on">Blotter</a></div>`)
    + `<div class="card filters">
      <input class="in grow" data-f="q" value="${esc(f.q || '')}" placeholder="Cliente, instrumento, ID...">
      ${sel('estado', 'Todos los estados', Object.entries(S.meta.estados))}
      ${sel('op', 'Todas las operaciones', [['Compra', 'Compra'], ['Venta', 'Venta']])}
      ${sel('tipo', 'Todos los instrumentos', ['Acción', 'Fondo', 'Bono', 'Opción'].map(x => [x, x]))}
      ${S.me.rol !== 'asesor' ? sel('asesor', 'Todos los asesores', S.meta.users.filter(u => u.rol === 'asesor').map(u => [u.id, u.nombre])) : ''}
      <div class="break"></div>
      <input class="in date" type="date" data-f="desde" value="${f.desde || ''}"><span class="muted">→</span><input class="in date" type="date" data-f="hasta" value="${f.hasta || ''}">
      <button class="btn icon" id="clr" title="Limpiar">${ico(I.reset)}</button>
      <span class="grow"></span>
      ${S.me.rol !== 'asesor' ? `<button class="btn navy sm" id="xml">↓ Registro BCU</button>` : ''}<button class="btn green sm" id="csv">↓ CSV</button>
    </div>
    <div class="yellow">● Historial completo — ${rows.length} órdenes${S.me.rol === 'asesor' ? ' (tus clientes)' : ' de todos los asesores'}</div>
    <div class="card tblw"><table class="tbl"><thead><tr><th>Nº interno</th><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Asesor</th><th>Opera</th><th>Operación</th><th>Tipo</th><th>Instrumento</th><th>Moneda</th><th class="r">Monto ($)</th><th class="r">Cantidad</th><th>Estado</th><th>Operador</th><th>Ejecutada</th></tr></thead><tbody>
    ${rows.flatMap(o => o.activos.map((a, i) => `<tr data-open="${o.id}"><td class="mono">${o.numero}${i ? '-' + (i + 1) : ''}</td><td>${fecha(o.creada)}</td><td>${hora(o.creada)}</td><td>${esc(o.cliente.nombre)}</td><td>${esc(o.asesor.nombre)}</td><td>${o.opera === 'mesa' ? 'Mesa' : 'Asesor'}</td><td class="op-${a.operacion}">${a.operacion}</td><td>${a.tipo}</td><td>${esc(a.ticker && a.ticker.length < 8 ? a.ticker : a.instrumento)}</td><td>${a.moneda}</td><td class="r mono">${nf(a.monto)}</td><td class="r mono">${nf(a.cantidad)}</td><td>${badge(o.estado)}</td><td>${esc(o.operador?.nombre || '—')}</td><td>${o.fechaEjecucion ? dt(o.fechaEjecucion) : '—'}</td></tr>`)).join('') || '<tr><td colspan="15" class="empty">Sin resultados</td></tr>'}
    </tbody></table></div>`;
  const p = page();
  p.querySelectorAll('[data-f]').forEach(el => {
    const h = () => { f[el.dataset.f] = el.value; viewBlotter(); if (el.dataset.f === 'q') { const i = page().querySelector('[data-f=q]'); i.focus(); i.setSelectionRange(99, 99); } };
    el.tagName === 'SELECT' || el.type === 'date' ? el.onchange = h : el.oninput = h;
  });
  p.querySelector('#clr').onclick = () => { S.bf = {}; viewBlotter(); };
  p.querySelector('#csv').onclick = () => csv(rows);
  const x = p.querySelector('#xml'); if (x) x.onclick = () => { location = `/api/registro.xml?desde=${f.desde || ''}&hasta=${f.hasta || ''}`; };
  p.querySelectorAll('tr[data-open]').forEach(tr => tr.onclick = () => openDetail(tr.dataset.open));
}
function csv(rows) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const L = [['Numero', 'Fecha', 'Cliente', 'Asesor', 'Operacion', 'Tipo', 'Instrumento', 'Moneda', 'Cantidad', 'Monto', 'Estado', 'Aprobacion', 'Operador', 'Ejecutada'].join(';')];
  rows.forEach(o => o.activos.forEach(a => L.push([o.numero, o.creada, o.cliente.nombre, o.asesor.nombre, a.operacion, a.tipo, a.instrumento, a.moneda, a.cantidad, a.monto, S.meta.estados[o.estado], o.fechaRespuesta, o.operador?.nombre, o.fechaEjecucion].map(q).join(';'))));
  const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + L.join('\n')], { type: 'text/csv' })); el.download = `blotter_${today()}.csv`; el.click();
}

// ---------- DETALLE ----------
async function openDetail(id) {
  let o; try { o = await api('GET', '/api/orders/' + id); } catch (e) { return toast(e.message, true); }
  S.detail = id; closeDetail(true);
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'ov';
  ov.innerHTML = `<div class="drawer">
    <div class="dh"><button class="x" id="dx">${ico(I.x)}</button><h2><span class="mono">${o.numero}</span>${badge(o.estado)}</h2>
      <p class="muted">${esc(o.cliente.nombre)} · N° ${o.cliente.numero} · Asesor ${esc(o.asesor.nombre)}</p>
      <div class="btns">${actionsFor(o, false)}</div></div>
    <div class="db">
      ${o.motivo ? `<div class="yellow">Motivo: ${esc(o.motivo)}</div>` : ''}
      <div class="card"><div class="ct">ACTIVOS</div>${o.activos.map(a => `<div class="mini"><span class="op-${a.operacion}">${a.operacion}</span> ${nf(a.cantidad)} · ${esc(a.instrumento)} <span class="mono muted">${esc(a.ticker)}</span> · ${esc(a.precio)} · ${a.moneda}</div>`).join('')}</div>
      <div class="card"><div class="ct">MAIL AL CLIENTE ${o.fechaMail ? '· enviado ' + dt(o.fechaMail) : '· no enviado'}</div><div class="mh"><div><span>Para</span>${esc(o.mail.para)}</div><div><span>Asunto</span><b>${esc(o.mail.asunto)}</b></div></div><pre>${esc(o.mail.cuerpo)}</pre></div>
      ${o.respuesta ? `<div class="card"><div class="ct">RESPUESTA DEL CLIENTE · ${dt(o.respuesta.recibida)}</div><div class="rq">“${esc(o.respuesta.cuerpo.split('\n')[0])}”</div><small class="muted">Código ${esc(o.respuesta.codigo || '—')} · asociada ${o.respuesta.asociadaPor === 'manual' ? 'a mano' : 'automáticamente'}</small></div>` : ''}
      <div class="card"><div class="ct">HISTORIAL</div><ul class="tl">${o.actividad.map(a => `<li><b>${esc(a.accion)}</b><small>${dt(a.fecha)} · ${esc(a.usuario)}${a.detalle ? ' · ' + esc(a.detalle) : ''}</small></li>`).join('')}</ul></div>
    </div></div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) closeDetail(); };
  ov.querySelector('#dx').onclick = () => closeDetail();
}
function closeDetail(keep) { document.getElementById('ov')?.remove(); if (!keep) S.detail = null; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelector('.mbg')?.remove() || closeDetail(); });

// ---------- modales ----------
function modal(html) {
  const bg = document.createElement('div'); bg.className = 'mbg'; bg.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(bg);
  bg.onclick = e => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); };
  return bg;
}
function promptModal(title, onOk) {
  const bg = modal(`<h3>${title}</h3><label>Motivo</label><textarea class="in" id="pm" rows="3"></textarea><div class="mbtns"><button class="btn" data-close>Volver</button><button class="btn navy" id="ok">Confirmar</button></div>`);
  bg.querySelector('#pm').focus();
  bg.querySelector('#ok').onclick = async () => { const v = bg.querySelector('#pm').value.trim(); if (!v) return toast('Indicá el motivo', true); bg.remove(); await onOk(v); };
}
function execModal(id) {
  const bg = modal(`<h3>Marcar ejecutada</h3><label>Ejecutada en</label><select class="in" id="ee"><option>Insigneo</option><option>BNY Pershing</option><option>Banco Itaú</option><option>Banco Santander</option></select>
    <label style="margin-top:10px">Precio (opcional)</label><input class="in" id="ep" type="number" step="0.0001">
    <div class="mbtns"><button class="btn" data-close>Cancelar</button><button class="btn green" id="ok">Confirmar</button></div>`);
  bg.querySelector('#ok').onclick = async () => { await act(() => api('POST', `/api/orders/${id}/ejecutar`, { ejecutadaEn: bg.querySelector('#ee').value, precioEjecucion: bg.querySelector('#ep').value }), 'Orden ejecutada'); bg.remove(); refresh(id); };
}

boot();
