// netlify/functions/manage-days.js
// Gestión de días bloqueados sin dependencia de Netlify Blobs
// Los días se guardan en la variable de entorno DIAS_BLOQUEADOS
// y se actualizan via Netlify API

const https = require('https');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function updateEnvVar(siteId, token, value) {
  return new Promise((resolve) => {
    const data = JSON.stringify([{ key: 'DIAS_BLOQUEADOS', value: value, context: 'all' }]);
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/sites/${siteId}/env`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', () => resolve(500));
    req.write(data);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  // Leer días bloqueados desde variable de entorno
  let diasBloqueados = [];
  try { diasBloqueados = JSON.parse(process.env.DIAS_BLOQUEADOS || '[]'); } catch(e) {}

  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, diasBloqueados }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch(e) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'JSON inválido' }) };
    }

    const { fecha, accion } = body;
    if (!fecha || !accion) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Faltan parámetros' }) };

    if (accion === 'bloquear') {
      if (!diasBloqueados.includes(fecha)) diasBloqueados.push(fecha);
    } else if (accion === 'desbloquear') {
      diasBloqueados = diasBloqueados.filter(d => d !== fecha);
    }

    const token = process.env.NETLIFY_API_TOKEN;
    const siteId = process.env.NETLIFY_SITE_ID;

    if (token && siteId) {
      const status = await updateEnvVar(siteId, token, JSON.stringify(diasBloqueados));
      if (status !== 200 && status !== 201) {
        console.error('Error actualizando env var, status:', status);
      }
    } else {
      console.warn('NETLIFY_API_TOKEN o NETLIFY_SITE_ID no configurados');
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, diasBloqueados }) };
  }

  return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) };
};
