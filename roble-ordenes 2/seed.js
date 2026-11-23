// Datos de prueba para el prototipo. Todos los nombres de clientes son ficticios.
const USERS = [
  { id: 'u1', nombre: 'Martina Pereira', email: 'mpereira@roblecapital.net', rol: 'asesor' },
  { id: 'u2', nombre: 'Diego Fernández', email: 'dfernandez@roblecapital.net', rol: 'asesor' },
  { id: 'u3', nombre: 'Lucía Benítez', email: 'lbenitez@roblecapital.net', rol: 'asesor' },
  { id: 'u4', nombre: 'Santiago Olivera', email: 'solivera@roblecapital.net', rol: 'asesor' },
  { id: 'u5', nombre: 'Valentina Ríos', email: 'vrios@roblecapital.net', rol: 'mesa' },
  { id: 'u6', nombre: 'Joaquín Méndez', email: 'jmendez@roblecapital.net', rol: 'mesa' },
  { id: 'u7', nombre: 'Carolina Suárez', email: 'csuarez@roblecapital.net', rol: 'cumplimiento' },
];

const CLIENTS = [
  ['10231', 'Alejandro Castro', 'acastro.uy@gmail.com', 'u1', 'Uruguay'],
  ['10244', 'Inés Rodríguez de León', 'ines.rdl@outlook.com', 'u1', 'Uruguay'],
  ['10258', 'Familia Gutiérrez Sosa', 'gutierrez.sosa@gmail.com', 'u1', 'Argentina'],
  ['10302', 'Federico Lamas', 'flamas@lamasyasoc.com.ar', 'u2', 'Argentina'],
  ['10317', 'María José Acosta', 'mjacosta@gmail.com', 'u2', 'Argentina'],
  ['10325', 'Inversiones del Este S.A.', 'tesoreria@investe.com.uy', 'u2', 'Uruguay'],
  ['10340', 'Pablo Etchegaray', 'petchegaray@gmail.com', 'u3', 'Uruguay'],
  ['10356', 'Sofía Bertolotti', 'sbertolotti@yahoo.com', 'u3', 'Argentina'],
  ['10371', 'Ramón Batista', 'rbatista@claro.net.do', 'u3', 'Rep. Dominicana'],
  ['10388', 'Agropecuaria Los Ceibos', 'admin@losceibos.com.uy', 'u4', 'Uruguay'],
  ['10392', 'Gabriela Núñez', 'gnunez@gmail.com', 'u4', 'Argentina'],
  ['10405', 'Hernán Viera', 'hviera@vieralegal.com.uy', 'u4', 'Uruguay'],
].map(([numero, nombre, email, asesorId, pais], i) => ({ id: 'c' + (i + 1), numero, nombre, email, asesorId, pais }));

const INSTRUMENTS = [
  { tipo: 'Acción', instrumento: 'Apple Inc.', ticker: 'AAPL', moneda: 'USD', precio: 228 },
  { tipo: 'Acción', instrumento: 'Microsoft Corp.', ticker: 'MSFT', moneda: 'USD', precio: 415 },
  { tipo: 'Acción', instrumento: 'MercadoLibre Inc.', ticker: 'MELI', moneda: 'USD', precio: 2050 },
  { tipo: 'Acción', instrumento: 'SPDR S&P 500 ETF', ticker: 'SPY', moneda: 'USD', precio: 590 },
  { tipo: 'Bono', instrumento: 'US Treasury 4.25% 2034', ticker: 'US91282CKQ32', moneda: 'USD', precio: 99.1 },
  { tipo: 'Bono', instrumento: 'Uruguay 5.75% 2034', ticker: 'US760942BD38', moneda: 'USD', precio: 104.3 },
  { tipo: 'Bono', instrumento: 'Apple 3.35% 2032', ticker: 'US037833DK45', moneda: 'USD', precio: 95.6 },
  { tipo: 'Fondo', instrumento: 'PIMCO GIS Income Fund', ticker: 'IE00B8N0MW85', moneda: 'USD', precio: 11.2 },
  { tipo: 'Fondo', instrumento: 'BlackRock Global Allocation', ticker: 'LU0072462426', moneda: 'USD', precio: 78.4 },
  { tipo: 'Fondo', instrumento: 'Franklin US Gov Money Market', ticker: 'LU0128526570', moneda: 'USD', precio: 10 },
  { tipo: 'Opción', instrumento: 'SPY Put 560 Mar-27', ticker: 'SPY270319P560', moneda: 'USD', precio: 14.5 },
];

function code() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function rnd(arr, r) { return arr[Math.floor(r() * arr.length)]; }

// generador pseudoaleatorio determinístico para que la demo sea estable
function rng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

function buildSeed() {
  const r = rng(42);
  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  const orders = [], activity = [], responses = [];
  let n = 1;
  let actId = 1;
  const year = new Date().getFullYear();

  const act = (ordenId, fecha, usuarioId, accion, detalle = '') =>
    activity.push({ id: 'a' + actId++, ordenId, fecha: new Date(fecha).toISOString(), usuarioId, accion, detalle });

  // [días atrás, estado final]
  const plan = [];
  for (let i = 0; i < 34; i++) plan.push([3 + Math.floor(r() * 85), 'ejecutada']);
  plan.push([6, 'rechazada'], [12, 'cancelada'], [20, 'rechazada'], [40, 'cancelada']);
  // abiertas, recientes
  plan.push([0.05, 'pendiente_revision'], [0.1, 'pendiente_revision'], [0.15, 'en_revision'],
    [0.3, 'en_trading_desk'], [0.4, 'mail_enviado'], [1.2, 'mail_enviado'], [2.5, 'mail_enviado'],
    [0.6, 'aprobada'], [0.5, 'aprobada'], [0.7, 'en_ejecucion'], [0.9, 'ejecutada'], [0.8, 'ejecutada'],
    [1.5, 'devuelta']);
  plan.sort((a, b) => b[0] - a[0]);

  for (const [daysAgo, final] of plan) {
    const client = rnd(CLIENTS, r);
    const asesorId = client.asesorId;
    const ins = rnd(INSTRUMENTS, r);
    const operacion = r() < 0.65 ? 'Compra' : 'Venta';
    let cantidad, monto;
    if (ins.tipo === 'Bono') { cantidad = (5 + Math.floor(r() * 45)) * 1000; monto = Math.round(cantidad * ins.precio / 100); }
    else if (ins.tipo === 'Opción') { cantidad = 1 + Math.floor(r() * 10); monto = Math.round(cantidad * ins.precio * 100); }
    else { cantidad = 10 + Math.floor(r() * 400); monto = Math.round(cantidad * ins.precio); }
    const activos = [{ operacion, tipo: ins.tipo, instrumento: ins.instrumento, ticker: ins.ticker, moneda: ins.moneda, cantidad, monto, precio: r() < 0.7 ? 'Mercado' : 'Límite ' + (ins.precio * (operacion === 'Compra' ? 0.99 : 1.01)).toFixed(2), vigencia: 'Día' }];
    if (r() < 0.2) {
      const i2 = rnd(INSTRUMENTS.filter(x => x.tipo === 'Fondo'), r);
      const c2 = 100 + Math.floor(r() * 2000);
      activos.push({ operacion: 'Compra', tipo: i2.tipo, instrumento: i2.instrumento, ticker: i2.ticker, moneda: 'USD', cantidad: c2, monto: Math.round(c2 * i2.precio), precio: 'Mercado', vigencia: 'Día' });
    }
    const t0 = now - daysAgo * D;
    const directo = r() < 0.2 && !['pendiente_revision', 'en_revision', 'en_trading_desk', 'devuelta', 'cancelada'].includes(final);
    const mesa = rnd(USERS.filter(u => u.rol === 'mesa'), r);
    const id = 'o' + n;
    const numero = `ORD-${year}-${String(n).padStart(4, '0')}`;
    n++;
    const o = {
      id, numero, creada: new Date(t0).toISOString(), fechaInstruccion: new Date(t0).toISOString().slice(0, 10),
      clienteId: client.id, asesorId, opera: directo ? 'asesor' : 'mesa', canal: directo ? 'directo' : 'mesa',
      copias: r() < 0.4 ? ['operaciones@roblecapital.net'] : [], activos, observaciones: '',
      estado: 'pendiente_revision', operadorId: null, codigo: code(), fechaMail: null, fechaRespuesta: null,
      fechaEjecucion: null, precioEjecucion: null, motivo: null, respuestaId: null,
    };
    orders.push(o);
    const step = (daysAgo < 1 ? daysAgo * D : 3 * H) / 6;
    let t = t0;
    act(id, t, asesorId, 'Orden creada', directo ? 'Enviada directamente al cliente desde el Gmail del asesor' : 'Enviada a la Mesa para revisión');

    const order = ['pendiente_revision', 'en_revision', 'en_trading_desk', 'mail_enviado', 'aprobada', 'en_ejecucion', 'ejecutada'];
    const target = { rechazada: 'mail_enviado', cancelada: 'en_trading_desk', devuelta: 'en_revision' }[final] || final;
    const reach = order.indexOf(target);
    const by = directo ? asesorId : mesa.id;

    if (directo) {
      t += step; o.estado = 'mail_enviado'; o.fechaMail = new Date(t).toISOString();
      act(id, t, asesorId, 'Mail enviado al cliente', client.email);
    } else {
      if (reach >= 1) { t += step; o.estado = 'en_revision'; act(id, t, mesa.id, 'Revisión tomada por la Mesa'); }
      if (final === 'devuelta') { t += step; o.estado = 'devuelta'; o.motivo = 'Falta indicar precio límite para la venta'; act(id, t, mesa.id, 'Orden devuelta al asesor', o.motivo); continue; }
      if (reach >= 2) { t += step; o.estado = 'en_trading_desk'; act(id, t, mesa.id, 'Revisión aprobada', 'Lista para enviar al cliente'); }
      if (final === 'cancelada') { t += step; o.estado = 'cancelada'; o.motivo = 'El cliente pidió cancelar por teléfono antes del envío'; act(id, t, asesorId, 'Orden cancelada', o.motivo); continue; }
      if (reach >= 3) { t += step; o.estado = 'mail_enviado'; o.fechaMail = new Date(t).toISOString(); act(id, t, mesa.id, 'Mail enviado al cliente', client.email); }
    }
    if (reach >= 4 || final === 'rechazada') {
      t += step;
      const aprueba = final !== 'rechazada';
      const rid = 'r' + (responses.length + 1);
      responses.push({
        id: rid, recibida: new Date(t).toISOString(), de: client.email, asunto: `RE: Orden ${numero} – confirmación requerida`,
        cuerpo: aprueba ? `Confirmo la orden. Código ${o.codigo}.\n\nSaludos,\n${client.nombre}` : `No confirmo esta operación, prefiero esperar. Código ${o.codigo}.\n${client.nombre}`,
        codigo: o.codigo, ordenId: id, resultado: aprueba ? 'aprueba' : 'rechaza', asociadaPor: 'automático',
      });
      o.respuestaId = rid; o.fechaRespuesta = new Date(t).toISOString();
      o.estado = aprueba ? 'aprobada' : 'rechazada';
      act(id, t, null, aprueba ? 'Aprobada por el cliente' : 'Rechazada por el cliente', `Respuesta asociada automáticamente (código ${o.codigo})`);
    }
    if (reach >= 5) { t += step; o.estado = 'en_ejecucion'; o.operadorId = directo ? asesorId : mesa.id; act(id, t, o.operadorId, 'Orden tomada para ejecutar', 'Operador asignado: ' + USERS.find(u => u.id === o.operadorId).nombre); }
    if (reach >= 6) {
      t += step; o.estado = 'ejecutada'; o.fechaEjecucion = new Date(t).toISOString();
      o.ejecutadaEn = rnd(['BNY Pershing (vía Insigneo)', 'Insigneo', 'Banco Itaú'], r);
      act(id, t, o.operadorId, 'Orden ejecutada', o.ejecutadaEn);
    }
  }

  // respuestas sin orden asociada
  responses.push({
    id: 'r' + (responses.length + 1), recibida: new Date(now - 2 * H).toISOString(), de: 'gnunez@gmail.com',
    asunto: 'Consulta', cuerpo: 'Hola, ¿pudieron hacer lo que hablamos ayer por teléfono? Confirmo. Gracias, Gabriela',
    codigo: null, ordenId: null, resultado: 'aprueba', asociadaPor: null,
  });
  responses.push({
    id: 'r' + (responses.length + 1), recibida: new Date(now - 5 * H).toISOString(), de: 'flamas@lamasyasoc.com.ar',
    asunto: 'RE: orden', cuerpo: 'OK, adelante. Código ZZ99QQ', codigo: 'ZZ99QQ', ordenId: null, resultado: 'aprueba', asociadaPor: null,
  });

  return { users: USERS, clients: CLIENTS, instruments: INSTRUMENTS, orders, activity, responses, seq: n, actSeq: actId, seededAt: new Date().toISOString() };
}

module.exports = { buildSeed, code };
