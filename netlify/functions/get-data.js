// netlify/functions/get-data.js
// Chef Chef Harfer — Consulta clientes, pedidos y actividad desde Netlify Blobs

const { getStore } = require('@netlify/blobs');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) };

  const tipo = event.queryStringParameters && event.queryStringParameters.tipo;
  if (!tipo) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Falta parámetro tipo' }) };

  try {
    // ── OBTENER CLIENTES ─────────────────────────────────────────────────────
    if (tipo === 'clientes') {
      const store = getStore({ name: 'clientes', consistency: 'strong' });
      const { blobs } = await store.list();
      const clientes = [];
      for (const blob of blobs) {
        try {
          const data = JSON.parse(await store.get(blob.key));
          if (data) clientes.push(data);
        } catch(e) {}
      }
      clientes.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, data: clientes }) };
    }

    // ── OBTENER PEDIDOS ──────────────────────────────────────────────────────
    if (tipo === 'pedidos') {
      const store = getStore({ name: 'pedidos', consistency: 'strong' });
      const { blobs } = await store.list();
      const pedidos = [];
      for (const blob of blobs) {
        try {
          const data = JSON.parse(await store.get(blob.key));
          if (data) pedidos.push(data);
        } catch(e) {}
      }
      pedidos.sort((a, b) => new Date(b.fechaPedido) - new Date(a.fechaPedido));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, data: pedidos }) };
    }

    // ── OBTENER ACTIVIDAD ────────────────────────────────────────────────────
    if (tipo === 'actividad') {
      const store = getStore({ name: 'actividad', consistency: 'strong' });
      const { blobs } = await store.list();
      const logs = [];
      for (const blob of blobs) {
        try {
          const data = JSON.parse(await store.get(blob.key));
          if (data) logs.push(data);
        } catch(e) {}
      }
      logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      // Limitar a 500 entradas más recientes
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, data: logs.slice(0, 500) }) };
    }

    // ── PEDIDOS DEL DÍA (para aviso de entrega) ──────────────────────────────
    if (tipo === 'pedidos_hoy') {
      const store = getStore({ name: 'pedidos', consistency: 'strong' });
      const { blobs } = await store.list();
      const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Mexico_City' });
      const diasMap = { 'martes': 'Martes', 'jueves': 'Jueves', 'sábado': 'Sabado' };
      const diaHoy = diasMap[hoy.toLowerCase()] || '';
      const pedidos = [];
      for (const blob of blobs) {
        try {
          const data = JSON.parse(await store.get(blob.key));
          if (data && data.dia === diaHoy && !data.avisoEnviado && data.status !== 'Cancelado') {
            pedidos.push(data);
          }
        } catch(e) {}
      }
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, data: pedidos, diaHoy }) };
    }

    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Tipo desconocido' }) };

  } catch (err) {
    console.error('get-data error:', err.message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
