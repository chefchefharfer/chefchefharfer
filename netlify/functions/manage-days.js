// netlify/functions/manage-days.js
// Gestión de días bloqueados — usa variable de entorno DIAS_BLOQUEADOS

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Los días bloqueados se leen/escriben via variable de entorno
// Netlify no permite escribir env vars en runtime, así que usamos
// un archivo en /tmp que persiste durante la ejecución del mismo contenedor
// Para persistencia real entre invocaciones usamos BLOBS_STORE_OVERRIDE o fetch a la API de Netlify

const https = require('https');
const NETLIFY_API = 'https://api.netlify.com/api/v1';

function netlifyRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(responseData) }); }
        catch(e) { resolve({ status: res.statusCode, data: responseData }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  // Leer días bloqueados desde variable de entorno (fallback a array vacío)
  const diasEnv = process.env.DIAS_BLOQUEADOS || '[]';
  let diasBloqueados = [];
  try { diasBloqueados = JSON.parse(diasEnv); } catch(e) { diasBloqueados = []; }

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

    // Actualizar la variable de entorno en Netlify via API
    const token = process.env.NETLIFY_API_TOKEN;
    const siteId = process.env.NETLIFY_SITE_ID;

    if (token && siteId) {
      try {
        await netlifyRequest('PATCH', `/sites/${siteId}/env/DIAS_BLOQUEADOS`, {
          value: JSON.stringify(diasBloqueados)
        }, token);
      } catch(e) {
        console.error('Error actualizando env var:', e.message);
      }
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, diasBloqueados }) };
  }

  return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) };
};
