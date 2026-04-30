// netlify/functions/manage-days.js
// Chef Chef Harfer — Gestión de días bloqueados por el admin

const { getStore } = require('@netlify/blobs');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

const STORE_KEY = 'dias_bloqueados';

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  const store = getStore({ name: 'configuracion', consistency: 'strong' });

  // GET — obtener lista de fechas bloqueadas
  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get(STORE_KEY);
      const dias = raw ? JSON.parse(raw) : [];
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, diasBloqueados: dias }) };
    } catch(e) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, diasBloqueados: [] }) };
    }
  }

  // POST — bloquear o desbloquear una fecha
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch(e) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'JSON inválido' }) };
    }

    const { fecha, accion } = body; // fecha: 'YYYY-MM-DD', accion: 'bloquear' | 'desbloquear'
    if (!fecha || !accion) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Faltan parámetros' }) };

    try {
      const raw = await store.get(STORE_KEY);
      let dias = raw ? JSON.parse(raw) : [];

      if (accion === 'bloquear') {
        if (!dias.includes(fecha)) dias.push(fecha);
      } else if (accion === 'desbloquear') {
        dias = dias.filter(d => d !== fecha);
      }

      await store.set(STORE_KEY, JSON.stringify(dias));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, diasBloqueados: dias }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) };
};
