// netlify/functions/save-data.js
// Chef Chef Harfer — Guarda clientes, pedidos y actividad en Netlify Blobs
// El panel admin consulta estos datos via get-data.js

const { getStore } = require('@netlify/blobs');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const { tipo, data } = body;
  if (!tipo || !data) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Faltan parámetros' }) };

  try {
    // ── GUARDAR CLIENTE ──────────────────────────────────────────────────────
    if (tipo === 'cliente') {
      const store = getStore({ name: 'clientes', consistency: 'strong' });
      const key = 'cliente_' + (data.phone || '').replace(/\D/g, '');

      // Verificar si ya existe para no sobreescribir datos importantes
      let existente = null;
      try { existente = JSON.parse(await store.get(key)); } catch(e) {}

      const cliente = {
        nombre: data.nombre || (existente && existente.nombre) || '',
        phone: data.phone || (existente && existente.phone) || '',
        email: data.email || (existente && existente.email) || '',
        direccion: data.direccion || (existente && existente.direccion) || '',
        fechaRegistro: (existente && existente.fechaRegistro) || data.fechaRegistro || new Date().toISOString(),
        ultimaConexion: new Date().toISOString(),
        totalPedidos: (existente && existente.totalPedidos) || 0,
        status: data.status || (existente && existente.status) || 'Activo'
      };

      await store.set(key, JSON.stringify(cliente));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
    }

    // ── GUARDAR PEDIDO ───────────────────────────────────────────────────────
    if (tipo === 'pedido') {
      const store = getStore({ name: 'pedidos', consistency: 'strong' });
      const key = 'pedido_' + (data.orderId || Date.now().toString());

      const pedido = {
        orderId: data.orderId || key,
        cliente: data.cliente || '',
        phone: data.phone || '',
        email: data.email || '',
        dia: data.dia || '',
        turno: data.turno || '',
        fechaEntrega: data.fechaEntrega || '',
        direccion: data.direccion || '',
        platillos: data.platillos || [],
        total: data.total || 0,
        status: data.status || 'Pendiente',
        mapLat: data.mapLat || null,
        mapLng: data.mapLng || null,
        fechaPedido: new Date().toISOString(),
        avisoEnviado: false
      };

      await store.set(key, JSON.stringify(pedido));

      // Incrementar contador de pedidos del cliente
      try {
        const clienteStore = getStore({ name: 'clientes', consistency: 'strong' });
        const clienteKey = 'cliente_' + (data.phone || '').replace(/\D/g, '');
        const clienteData = JSON.parse(await clienteStore.get(clienteKey));
        if (clienteData) {
          clienteData.totalPedidos = (clienteData.totalPedidos || 0) + 1;
          clienteData.ultimoPedido = new Date().toISOString();
          await clienteStore.set(clienteKey, JSON.stringify(clienteData));
        }
      } catch(e) {}

      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
    }

    // ── GUARDAR ACTIVIDAD ────────────────────────────────────────────────────
    if (tipo === 'actividad') {
      const store = getStore({ name: 'actividad', consistency: 'strong' });
      const key = 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      const log = {
        tipo: data.tipo || 'Evento',
        usuario: data.usuario || 'Anonimo',
        telefono: data.telefono || '',
        detalle: data.detalle || '',
        fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
      };

      await store.set(key, JSON.stringify(log));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
    }

    // ── ACTUALIZAR STATUS DE PEDIDO ──────────────────────────────────────────
    if (tipo === 'update_pedido') {
      const store = getStore({ name: 'pedidos', consistency: 'strong' });
      const key = 'pedido_' + data.orderId;
      let pedido = null;
      try { pedido = JSON.parse(await store.get(key)); } catch(e) {}
      if (!pedido) return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Pedido no encontrado' }) };
      pedido.status = data.status || pedido.status;
      pedido.avisoEnviado = data.avisoEnviado !== undefined ? data.avisoEnviado : pedido.avisoEnviado;
      await store.set(key, JSON.stringify(pedido));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Tipo desconocido' }) };

  } catch (err) {
    console.error('save-data error:', err.message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
