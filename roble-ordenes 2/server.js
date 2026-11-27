const express = require('express');
const fs = require('fs');
const path = require('path');
const { buildSeed, code } = require('./seed');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
let db;
function seed() {
  const d = buildSeed();
  d.responses.forEach(r => {
    const o = d.orders.find(x => x.id === r.ordenId); if (!o) return;
    const c = d.clients.find(x => x.id === o.clienteId);
    r.asunto = `RE: Confirmación de orden - ${c.numero} - ${o.fechaInstruccion.split('-').reverse().join('/')}`;
  });
  return d;
}
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { db = seed(); save(); }
function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db)); }

const ESTADOS = {
  pendiente_revision: 'Pendiente de revisión', en_revision: 'En revisión', devuelta: 'Devuelta',
  en_trading_desk: 'En Trading Desk', mail_enviado: 'Mail enviado', aprobada: 'Aprobada por cliente',
  rechazada: 'Rechazada por cliente', en_ejecucion: 'En ejecución', ejecutada: 'Ejecutada', cancelada: 'Cancelada',
};

const app = express();
app.use(express.json());
for (const f of ['app.js', 'styles.css']) app.get('/' + f, (req, res) => res.sendFile(path.join(__dirname, f)));

// --- sesión de demo (simula "Ingresar con Google" restringido a @roblecapital.net) ---
function currentUser(req) {
  const m = /(?:^|;\s*)uid=([^;]+)/.exec(req.headers.cookie || '');
  return m ? db.users.find(u => u.id === decodeURIComponent(m[1])) : null;
}
function auth(...roles) {
  return (req, res, next) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: 'Sesión no iniciada' });
    if (roles.length && !roles.includes(u.rol)) return res.status(403).json({ error: 'Su rol no tiene permiso para esta acción' });
    req.user = u; next();
  };
}

app.post('/api/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email.endsWith('@roblecapital.net')) return res.status(403).json({ error: 'Solo se permiten cuentas @roblecapital.net' });
  const u = db.users.find(x => x.email === email);
  if (!u) return res.status(403).json({ error: 'La cuenta no está habilitada en el módulo de Órdenes' });
  res.setHeader('Set-Cookie', `uid=${u.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json(u);
});
app.post('/api/logout', (req, res) => { res.setHeader('Set-Cookie', 'uid=; Path=/; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/me', (req, res) => { const u = currentUser(req); u ? res.json(u) : res.status(401).json({}); });
app.get('/api/users', (req, res) => res.json(db.users));

app.get('/api/meta', auth(), (req, res) => res.json({ estados: ESTADOS, users: db.users, clients: db.clients, instruments: db.instruments }));

// --- helpers ---
function log(ordenId, usuarioId, accion, detalle = '') {
  db.activity.push({ id: 'a' + db.actSeq++, ordenId, fecha: new Date().toISOString(), usuarioId, accion, detalle });
}
function visibleOrders(u) { return u.rol === 'asesor' ? db.orders.filter(o => o.asesorId === u.id) : db.orders; }
function getOrder(req, res) {
  const o = db.orders.find(x => x.id === req.params.id);
  if (!o) { res.status(404).json({ error: 'Orden no encontrada' }); return null; }
  if (req.user.rol === 'asesor' && o.asesorId !== req.user.id) { res.status(403).json({ error: 'La orden pertenece a otro asesor' }); return null; }
  return o;
}
function requireState(o, res, ...states) {
  if (!states.includes(o.estado)) { res.status(409).json({ error: `Acción no válida: la orden está en "${ESTADOS[o.estado]}"` }); return false; }
  return true;
}

const OBLIG_ACTIVO = ['operacion', 'tipo', 'instrumento', 'moneda', 'cantidad', 'precio'];
function validate(body) {
  const errors = [];
  if (!db.clients.find(c => c.id === body.clienteId)) errors.push('Cliente: seleccione un cliente de la base');
  if (!body.fechaInstruccion) errors.push('Fecha de instrucción: obligatoria');
  if (!['mesa', 'asesor'].includes(body.opera)) errors.push('Quién opera: obligatorio');
  if (!Array.isArray(body.activos) || !body.activos.length) errors.push('Agregue al menos un activo');
  (body.activos || []).forEach((a, i) => {
    OBLIG_ACTIVO.forEach(k => { if (a[k] === undefined || a[k] === null || String(a[k]).trim() === '') errors.push(`Activo ${i + 1}: falta ${k}`); });
    if (a.cantidad !== undefined && !(Number(a.cantidad) > 0)) errors.push(`Activo ${i + 1}: la cantidad debe ser mayor a 0`);
  });
  return errors;
}

function mailFor(o) {
  const c = db.clients.find(x => x.id === o.clienteId);
  const as = db.users.find(x => x.id === o.asesorId);
  const fmt = n => Number(n).toLocaleString('es-UY');
  const fecha = String(o.fechaInstruccion).split('-').reverse().join('/');
  const unidad = { Acción: 'acciones', Fondo: 'cuotas', Bono: 'VN', Opción: 'contratos' };
  const activos = o.activos.map((a, i) => [
    `Orden ${i + 1}`,
    `  • Operación: ${a.operacion}`,
    `  • Instrumento: ${a.instrumento}${a.ticker && a.ticker !== a.instrumento ? ` (${a.ticker})` : ''}`,
    `  • Tipo: ${a.tipo}`,
    `  • Cantidad: ${fmt(a.cantidad)} ${unidad[a.tipo] || ''}`.trimEnd(),
    `  • Precio: ${a.precio === 'Mercado' ? 'A mercado' : a.precio}`,
    `  • Moneda: ${a.moneda}`,
    `  • Vigencia: ${a.vigencia || 'Día'}`,
  ].join('\n'));
  return {
    de: o.canal === 'directo' ? as.email : 'tradingdesk@roblecapital.net',
    para: c.email, cc: [as.email, ...(o.copias || [])].join(', '),
    asunto: `Confirmación de orden - ${c.numero} - ${fecha}`,
    cuerpo: `Estimado/a ${c.nombre}:\n\nLe solicitamos confirmar la siguiente orden:\n\nCliente: ${c.nombre}\nN° de cliente: ${c.numero}\nFecha: ${fecha}\n\n${activos.join('\n\n')}\n\nPara confirmar, responda este correo con "Confirmo" y el código: ${o.codigo}\n\nSaludos cordiales,\n${as.nombre}\nRoble Capital Wealth Management`,
  };
}

function enrich(o) {
  const c = db.clients.find(x => x.id === o.clienteId);
  return { ...o, cliente: c, asesor: db.users.find(u => u.id === o.asesorId), operador: db.users.find(u => u.id === o.operadorId) || null, estadoLabel: ESTADOS[o.estado] };
}

// --- órdenes ---
app.get('/api/orders', auth(), (req, res) => res.json(visibleOrders(req.user).map(enrich).sort((a, b) => b.creada.localeCompare(a.creada))));

app.get('/api/orders/:id', auth(), (req, res) => {
  const o = getOrder(req, res); if (!o) return;
  res.json({
    ...enrich(o), mail: mailFor(o),
    respuesta: db.responses.find(r => r.id === o.respuestaId) || null,
    actividad: db.activity.filter(a => a.ordenId === o.id).sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(a => ({ ...a, usuario: db.users.find(u => u.id === a.usuarioId)?.nombre || (a.usuarioId === null ? 'Sistema' : '—') })),
  });
});

app.post('/api/orders/preview', auth('asesor', 'mesa'), (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(422).json({ errors });
  const fake = { ...req.body, numero: `ORD-${new Date().getFullYear()}-${String(db.seq).padStart(4, '0')}`, codigo: '••••••', asesorId: req.user.rol === 'asesor' ? req.user.id : db.clients.find(c => c.id === req.body.clienteId).asesorId };
  res.json(mailFor(fake));
});

app.post('/api/orders', auth('asesor', 'mesa'), (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(422).json({ errors });
  const b = req.body;
  const client = db.clients.find(c => c.id === b.clienteId);
  if (req.user.rol === 'asesor' && client.asesorId !== req.user.id) return res.status(403).json({ errors: ['El cliente pertenece a la cartera de otro asesor'] });
  const directo = b.canal === 'directo' && req.user.rol === 'asesor';
  const o = {
    id: 'o' + db.seq, numero: `ORD-${new Date().getFullYear()}-${String(db.seq).padStart(4, '0')}`, creada: new Date().toISOString(),
    fechaInstruccion: b.fechaInstruccion, clienteId: b.clienteId, asesorId: client.asesorId, opera: directo ? 'asesor' : b.opera,
    canal: directo ? 'directo' : 'mesa', copias: (b.copias || []).filter(Boolean),
    activos: b.activos.map(a => ({ ...a, cantidad: Number(a.cantidad), monto: a.monto ? Number(a.monto) : null })),
    observaciones: b.observaciones || '', estado: directo ? 'mail_enviado' : 'pendiente_revision', operadorId: null, codigo: code(),
    fechaMail: directo ? new Date().toISOString() : null, fechaRespuesta: null, fechaEjecucion: null, motivo: null, respuestaId: null,
  };
  db.seq++;
  db.orders.push(o);
  log(o.id, req.user.id, 'Orden creada', directo ? 'Enviada directamente al cliente desde el Gmail del asesor' : 'Enviada a la Mesa para revisión');
  if (directo) log(o.id, req.user.id, 'Mail enviado al cliente', client.email);
  save();
  res.json(enrich(o));
});

// edición de una orden devuelta (el asesor la corrige y la reenvía)
app.put('/api/orders/:id', auth('asesor', 'mesa'), (req, res) => {
  const o = getOrder(req, res); if (!o) return;
  if (!requireState(o, res, 'devuelta')) return;
  const errors = validate({ ...req.body, clienteId: o.clienteId });
  if (errors.length) return res.status(422).json({ errors });
  o.activos = req.body.activos.map(a => ({ ...a, cantidad: Number(a.cantidad), monto: a.monto ? Number(a.monto) : null }));
  o.fechaInstruccion = req.body.fechaInstruccion; o.opera = req.body.opera; o.copias = (req.body.copias || []).filter(Boolean);
  o.observaciones = req.body.observaciones || ''; o.estado = 'pendiente_revision'; o.motivo = null;
  log(o.id, req.user.id, 'Orden corregida y reenviada a la Mesa');
  save(); res.json(enrich(o));
});

const transitions = {
  'tomar-revision': { roles: ['mesa'], from: ['pendiente_revision'], to: 'en_revision', accion: 'Revisión tomada por la Mesa' },
  'aprobar-revision': { roles: ['mesa'], from: ['en_revision'], to: 'en_trading_desk', accion: 'Revisión aprobada', detalle: 'Lista para enviar al cliente' },
  'devolver': { roles: ['mesa'], from: ['pendiente_revision', 'en_revision'], to: 'devuelta', accion: 'Orden devuelta al asesor', needsMotivo: true },
  'enviar-mail': { roles: ['mesa'], from: ['en_trading_desk'], to: 'mail_enviado', accion: 'Mail enviado al cliente' },
  'tomar': { roles: ['mesa', 'asesor'], from: ['aprobada'], to: 'en_ejecucion', accion: 'Orden tomada para ejecutar' },
  'ejecutar': { roles: ['mesa', 'asesor'], from: ['en_ejecucion'], to: 'ejecutada', accion: 'Orden ejecutada' },
  'cancelar': { roles: ['mesa', 'asesor'], from: ['pendiente_revision', 'en_revision', 'devuelta', 'en_trading_desk', 'mail_enviado', 'aprobada', 'en_ejecucion'], to: 'cancelada', accion: 'Orden cancelada', needsMotivo: true },
};

app.post('/api/orders/:id/:action', auth(), (req, res, next) => {
  const t = transitions[req.params.action];
  if (!t) return next();
  if (!t.roles.includes(req.user.rol)) return res.status(403).json({ error: 'Su rol no tiene permiso para esta acción' });
  const o = getOrder(req, res); if (!o) return;
  if (!requireState(o, res, ...t.from)) return;
  // el asesor solo ejecuta las órdenes que envió directo al cliente
  if (req.user.rol === 'asesor' && ['tomar', 'ejecutar'].includes(req.params.action) && o.canal !== 'directo')
    return res.status(403).json({ error: 'Esta orden la ejecuta la Mesa de operaciones' });
  if (req.params.action === 'ejecutar' && o.operadorId !== req.user.id)
    return res.status(403).json({ error: 'Solo el operador asignado puede marcarla como ejecutada' });
  const motivo = String(req.body.motivo || '').trim();
  if (t.needsMotivo && !motivo) return res.status(422).json({ error: 'Indique el motivo' });

  let detalle = t.detalle || '';
  o.estado = t.to;
  if (t.needsMotivo) { o.motivo = motivo; detalle = motivo; }
  if (req.params.action === 'enviar-mail') { o.fechaMail = new Date().toISOString(); detalle = db.clients.find(c => c.id === o.clienteId).email; }
  if (req.params.action === 'tomar') { o.operadorId = req.user.id; detalle = 'Operador asignado: ' + req.user.nombre; }
  if (req.params.action === 'ejecutar') {
    o.fechaEjecucion = new Date().toISOString();
    o.ejecutadaEn = req.body.ejecutadaEn || 'Insigneo';
    o.precioEjecucion = req.body.precioEjecucion || null;
    detalle = o.ejecutadaEn + (o.precioEjecucion ? ` · precio ${o.precioEjecucion}` : '');
  }
  log(o.id, req.user.id, t.accion, detalle);
  save(); res.json(enrich(o));
});

// --- respuestas de clientes ---
// En producción se leen de la casilla de Gmail (API de Gmail). En el prototipo publicado
// la bandeja se alimenta con mails simulados, y se aplica la misma lógica de asociación.
function parseReply(texto) {
  const t = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const rechaza = /\b(no confirmo|no autorizo|rechazo|no apruebo|cancel)/.test(t);
  const aprueba = !rechaza && /\b(confirmo|autorizo|apruebo|adelante|de acuerdo|ok)\b/.test(t);
  return rechaza ? 'rechaza' : aprueba ? 'aprueba' : 'indeterminado';
}
function ingest({ de, asunto, cuerpo }) {
  const full = `${asunto}\n${cuerpo}`;
  const codes = (full.toUpperCase().match(/\b[A-Z0-9]{6}\b/g) || []);
  const numMatch = /ORD-\d{4}-\d{4}/i.exec(full);
  let o = null, codigo = null;
  for (const c of codes) { const f = db.orders.find(x => x.codigo === c); if (f) { o = f; codigo = c; break; } }
  if (!codigo && codes.length) codigo = codes.find(c => /\d/.test(c) && /[A-Z]/.test(c)) || null;
  const resultado = parseReply(cuerpo);
  const r = { id: 'r' + (db.responses.length + 1), recibida: new Date().toISOString(), de, asunto, cuerpo, codigo, ordenId: null, resultado, asociadaPor: null, nota: null };
  db.responses.push(r);
  if (!o) { r.nota = numMatch ? `Menciona ${numMatch[0].toUpperCase()} pero sin código válido` : 'No se encontró un código de confirmación válido'; return r; }
  const c = db.clients.find(x => x.id === o.clienteId);
  if (c.email.toLowerCase() !== String(de).toLowerCase()) { r.nota = `El código corresponde a ${o.numero}, pero el remitente no es el email registrado del cliente`; return r; }
  if (o.estado !== 'mail_enviado') { r.nota = `${o.numero} no está esperando respuesta (estado: ${ESTADOS[o.estado]})`; return r; }
  if (resultado === 'indeterminado') { r.nota = 'No se pudo determinar si el cliente aprueba o rechaza'; return r; }
  applyResponse(o, r, 'automático', null);
  return r;
}
function applyResponse(o, r, por, userId) {
  r.ordenId = o.id; r.asociadaPor = por;
  o.respuestaId = r.id; o.fechaRespuesta = r.recibida;
  o.estado = r.resultado === 'rechaza' ? 'rechazada' : 'aprobada';
  log(o.id, userId, r.resultado === 'rechaza' ? 'Rechazada por el cliente' : 'Aprobada por el cliente',
    por === 'automático' ? `Respuesta asociada automáticamente (código ${r.codigo})` : `Respuesta de ${r.de} asociada manualmente`);
}

app.get('/api/responses', auth('mesa', 'cumplimiento'), (req, res) => {
  res.json(db.responses.slice().sort((a, b) => b.recibida.localeCompare(a.recibida)).map(r => {
    const o = db.orders.find(x => x.id === r.ordenId);
    const c = db.clients.find(x => x.email.toLowerCase() === String(r.de).toLowerCase());
    return { ...r, orden: o ? { id: o.id, numero: o.numero, estado: o.estado } : null, cliente: c ? c.nombre : null };
  }));
});

app.post('/api/responses/simulate', auth('mesa', 'asesor'), (req, res) => {
  const { de, asunto, cuerpo } = req.body;
  if (!de || !cuerpo) return res.status(422).json({ error: 'Complete remitente y cuerpo' });
  const r = ingest({ de: String(de).trim(), asunto: asunto || '(sin asunto)', cuerpo });
  save(); res.json(r);
});

// atajo de demo: generar la respuesta del cliente a una orden con mail enviado
app.post('/api/orders/:id/simular-respuesta', auth(), (req, res) => {
  const o = getOrder(req, res); if (!o) return;
  if (!requireState(o, res, 'mail_enviado')) return;
  const c = db.clients.find(x => x.id === o.clienteId);
  const aprueba = req.body.aprueba !== false;
  const r = ingest({ de: c.email, asunto: `RE: ${mailFor(o).asunto}`, cuerpo: aprueba ? `Confirmo. Código ${o.codigo}\n\n${c.nombre}` : `No confirmo, prefiero esperar. Código ${o.codigo}\n\n${c.nombre}` });
  save(); res.json(r);
});

app.post('/api/responses/:id/asociar', auth('mesa'), (req, res) => {
  const r = db.responses.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Respuesta no encontrada' });
  if (r.ordenId) return res.status(409).json({ error: 'La respuesta ya está asociada' });
  const o = db.orders.find(x => x.id === req.body.ordenId);
  if (!o) return res.status(404).json({ error: 'Orden no encontrada' });
  if (o.estado !== 'mail_enviado') return res.status(409).json({ error: 'La orden no está esperando respuesta' });
  if (req.body.resultado) r.resultado = req.body.resultado;
  if (r.resultado === 'indeterminado') return res.status(422).json({ error: 'Indique si el cliente aprueba o rechaza' });
  r.nota = null;
  applyResponse(o, r, 'manual', req.user.id);
  save(); res.json(r);
});

// --- Registro de Instrucciones (BCU) ---
function inRange(o, desde, hasta) { const d = o.creada.slice(0, 10); return (!desde || d >= desde) && (!hasta || d <= hasta); }
const esc = s => String(s ?? '').replace(/[<>&'"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]));

app.get('/api/registro.xml', auth('cumplimiento', 'mesa'), (req, res) => {
  const { desde, hasta } = req.query;
  const list = db.orders.filter(o => ['ejecutada', 'en_ejecucion', 'aprobada'].includes(o.estado) && inRange(o, desde, hasta));
  const rows = [];
  for (const o of list) {
    const c = db.clients.find(x => x.id === o.clienteId);
    const resp = db.responses.find(r => r.id === o.respuestaId);
    o.activos.forEach((a, i) => rows.push(`  <Instruccion>
    <NumeroInterno>${esc(o.numero)}-${i + 1}</NumeroInterno>
    <FechaHoraInstruccion>${esc(o.creada)}</FechaHoraInstruccion>
    <Cliente><Numero>${esc(c.numero)}</Numero><Nombre>${esc(c.nombre)}</Nombre></Cliente>
    <Asesor>${esc(db.users.find(u => u.id === o.asesorId).nombre)}</Asesor>
    <Operacion>${esc(a.operacion)}</Operacion>
    <TipoInstrumento>${esc(a.tipo)}</TipoInstrumento>
    <Instrumento codigo="${esc(a.ticker)}">${esc(a.instrumento)}</Instrumento>
    <Moneda>${esc(a.moneda)}</Moneda>
    <Cantidad>${esc(a.cantidad)}</Cantidad>
    <Monto>${esc(a.monto ?? '')}</Monto>
    <Precio>${esc(a.precio)}</Precio>
    <Intermediario>${esc(o.ejecutadaEn || '')}</Intermediario>
    <AprobacionCliente fecha="${esc(o.fechaRespuesta || '')}" medio="correo electrónico" codigo="${esc(resp?.codigo || '')}"/>
    <Estado>${esc(ESTADOS[o.estado])}</Estado>
    <FechaEjecucion>${esc(o.fechaEjecucion || '')}</FechaEjecucion>
  </Instruccion>`));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Formato ilustrativo del prototipo. Antes de usarlo en producción debe validarse contra el esquema vigente del BCU (Portal IDI). -->
<RegistroInstrucciones agente="Roble Capital Wealth Management" desde="${esc(desde || '')}" hasta="${esc(hasta || '')}" generado="${new Date().toISOString()}" cantidad="${rows.length}">
${rows.join('\n')}
</RegistroInstrucciones>
`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registro-instrucciones_${desde || 'inicio'}_${hasta || 'hoy'}.xml"`);
  res.send(xml);
});

app.post('/api/reset', auth(), (req, res) => { db = seed(); save(); res.json({ ok: true }); });

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Órdenes – Roble Capital escuchando en puerto ${PORT}`));
