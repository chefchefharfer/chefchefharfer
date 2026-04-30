// netlify/functions/send-email.js
// Chef Chef Harfer — Función serverless de correo
// Plantillas: bienvenida, recuperacion, confirmacion, aviso_entrega

const RESEND_API = 'https://api.resend.com/emails';
const FROM      = 'Chef Chef Harfer <hola@chefchefharfer.mx>';
const LOGO_URL  = 'https://chefchefharfer.github.io/chefchefharfer/Logo%20chef%20chef%20blanco.png';
const SITE_URL  = 'https://chefchefharfer.netlify.app';
const WA_LINK   = 'https://wa.me/523782901365';

// ── HEADER Y FOOTER COMPARTIDOS ──────────────────────────────────────────────
const emailHeader = `
  <div style="background:#111111;padding:28px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="Chef Chef Harfer" style="height:64px;width:auto;display:block;margin:0 auto 10px;" />
    <div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:2px;text-transform:uppercase;">MEAL KITS · TEPATITLÁN DE MORELOS</div>
  </div>`;

const emailFooter = `
  <div style="padding:24px 40px;border-top:1px solid #f0ede6;text-align:center;">
    <p style="margin:0 0 6px;color:#aaa;font-size:11px;line-height:1.7;">
      Tepatitlán de Morelos, Jalisco &nbsp;·&nbsp; Entregas Mar, Jue y Sáb
    </p>
    <a href="${WA_LINK}" style="color:#067c49;font-size:12px;font-weight:600;text-decoration:none;">WhatsApp: +52 378 290 1365</a>
    <p style="margin:10px 0 0;color:#ccc;font-size:10px;">© 2026 Chef Chef Harfer · Todos los derechos reservados</p>
  </div>`;

const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chef Chef Harfer</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    ${emailHeader}
    ${content}
    ${emailFooter}
  </div>
</body>
</html>`;

// ── PLANTILLA 1: BIENVENIDA ──────────────────────────────────────────────────
function templateBienvenida(nombre) {
  return {
    subject: `¡Bienvenido a Chef Chef Harfer, ${nombre}!`,
    html: emailWrapper(`
    <div style="padding:40px;">
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#111;">¡Hola, ${nombre}! 👋</h1>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 22px;">
        Tu cuenta en Chef Chef Harfer está lista. Ya puedes explorar nuestro menú, elegir tus kits favoritos y hacer tu primer pedido.
      </p>
      <div style="background:#f5f3ee;border-radius:14px;padding:20px;margin-bottom:26px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#067c49;text-transform:uppercase;letter-spacing:0.5px;">¿Cómo funciona?</p>
        <p style="margin:0;color:#555;font-size:14px;line-height:1.9;">
          1. Elige tus meal kits — kits para 2 ó 4 personas<br>
          2. Selecciona día y turno de entrega<br>
          3. Confirma tu domicilio en el mapa<br>
          4. ¡Recibe ingredientes frescos y porcionados en tu puerta!
        </p>
      </div>
      <div style="text-align:center;">
        <a href="${SITE_URL}" style="display:inline-block;background:#067c49;color:white;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;">Ver el menú →</a>
      </div>
    </div>`)
  };
}

// ── PLANTILLA 2: RECUPERACIÓN DE PIN ────────────────────────────────────────
function templateRecuperacion(nombre, codigo) {
  return {
    subject: `Tu código de recuperación — Chef Chef Harfer`,
    html: emailWrapper(`
    <div style="padding:40px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111;">Código de recuperación</h1>
      <p style="color:#888;font-size:14px;margin:0 0 30px;line-height:1.6;">
        Hola <strong>${nombre}</strong>, usa este código para restablecer tu PIN.<br>
        Válido por <strong>10 minutos</strong>.
      </p>
      <div style="background:#f5f3ee;border-radius:18px;padding:32px 20px;margin-bottom:28px;display:inline-block;min-width:220px;">
        <div style="font-size:44px;font-weight:900;letter-spacing:12px;color:#067c49;font-variant-numeric:tabular-nums;">${codigo}</div>
      </div>
      <p style="color:#bbb;font-size:12px;margin:0;line-height:1.6;">
        Si no solicitaste este código, ignora este mensaje.<br>Tu PIN no cambiará.
      </p>
    </div>`)
  };
}

// ── PLANTILLA 3: CONFIRMACIÓN DE PEDIDO ─────────────────────────────────────
function templateConfirmacion(nombre, orderId, dia, turno, direccion, platillos, total) {
  const turnoLabel = turno === 'Manana' ? 'Mañana (10am – 1pm)' : 'Tarde (4pm – 7pm)';
  const platillosHtml = Array.isArray(platillos)
    ? platillos.map(p => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f5f3ee;color:#333;font-size:14px;">${p.nombre} — Kit ${p.porciones}p × ${p.cantidad}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f5f3ee;font-weight:700;color:#111;font-size:14px;text-align:right;white-space:nowrap;">$${(p.subtotal||0).toLocaleString('es-MX')} MXN</td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:10px 0;color:#888;">${platillos}</td></tr>`;

  return {
    subject: `Pedido #${orderId} recibido — Chef Chef Harfer`,
    html: emailWrapper(`
    <div style="padding:40px;">
      <div style="background:#067c49;border-radius:14px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <div style="color:white;font-size:20px;font-weight:800;">¡Pedido recibido! 🎉</div>
        <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Pedido #${orderId}</div>
      </div>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hola <strong>${nombre}</strong>, recibimos tu pedido. En breve te enviamos el <strong>link de pago</strong> por WhatsApp.
      </p>
      <div style="background:#f5f3ee;border-radius:14px;padding:20px 22px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#067c49;text-transform:uppercase;letter-spacing:0.5px;">Detalles de entrega</p>
        <p style="margin:0;font-size:14px;color:#333;line-height:1.9;">
          <strong>Día:</strong> ${dia}<br>
          <strong>Turno:</strong> ${turnoLabel}<br>
          <strong>Dirección:</strong> ${direccion || 'Por confirmar'}
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${platillosHtml}
        <tr>
          <td style="padding:16px 0 0;font-size:16px;font-weight:800;color:#111;">Total</td>
          <td style="padding:16px 0 0;font-size:22px;font-weight:900;color:#067c49;text-align:right;">$${(total||0).toLocaleString('es-MX')} MXN</td>
        </tr>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${WA_LINK}" style="display:inline-block;background:#25D366;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;">Contactar por WhatsApp</a>
      </div>
    </div>`)
  };
}

// ── PLANTILLA 4: AVISO DE ENTREGA ────────────────────────────────────────────
function templateAvisoEntrega(nombre, orderId, turno, direccion, platillos, total) {
  const turnoLabel = turno === 'Manana' ? 'Mañana (10am – 1pm)' : 'Tarde (4pm – 7pm)';
  const platillosHtml = Array.isArray(platillos)
    ? platillos.map(p => `<li style="margin-bottom:4px;color:#555;font-size:14px;">${p.nombre} — Kit ${p.porciones}p × ${p.cantidad}</li>`).join('')
    : `<li style="color:#888;font-size:14px;">${platillos}</li>`;

  return {
    subject: `🚚 Hoy es tu día de entrega — Chef Chef Harfer`,
    html: emailWrapper(`
    <div style="padding:40px;">
      <div style="background:linear-gradient(135deg,#067c49,#0a9659);border-radius:14px;padding:22px 24px;margin-bottom:28px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🚚</div>
        <div style="color:white;font-size:20px;font-weight:800;">¡Hoy llega tu pedido!</div>
        <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Turno: ${turnoLabel}</div>
      </div>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 22px;">
        Hola <strong>${nombre}</strong>, hoy te entregamos tu pedido <strong>#${orderId}</strong>.
        Asegúrate de estar disponible durante el turno indicado.
      </p>
      <div style="background:#f5f3ee;border-radius:14px;padding:20px 22px;margin-bottom:22px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#067c49;text-transform:uppercase;letter-spacing:0.5px;">Tu pedido de hoy</p>
        <ul style="margin:0;padding:0 0 0 18px;">${platillosHtml}</ul>
        <p style="margin:14px 0 0;font-size:14px;color:#333;">
          <strong>Dirección:</strong> ${direccion || 'Registrada en tu cuenta'}<br>
          <strong>Total:</strong> <span style="color:#067c49;font-weight:700;">$${(total||0).toLocaleString('es-MX')} MXN</span>
        </p>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 20px;">
        ¿Tienes alguna duda? Escríbenos por WhatsApp.
      </p>
      <div style="text-align:center;">
        <a href="${WA_LINK}" style="display:inline-block;background:#25D366;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;">Contactar por WhatsApp</a>
      </div>
    </div>`)
  };
}

// ── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
exports.handler = async function(event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigins = [
    'https://chefchefharfer.netlify.app',
    'https://chefchefharfer.github.io',
    'http://localhost:8888'
  ];
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  const headers = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const { tipo, to, data } = body;
  if (!tipo || !to || !data) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan parámetros' }) };
  if (!to.includes('@')) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email inválido' }) };

  let template;
  if      (tipo === 'bienvenida')    template = templateBienvenida(data.nombre || 'Cliente');
  else if (tipo === 'recuperacion')  template = templateRecuperacion(data.nombre || 'Cliente', data.codigo || '------');
  else if (tipo === 'confirmacion')  template = templateConfirmacion(data.nombre, data.orderId, data.dia, data.turno, data.direccion, data.platillos, data.total);
  else if (tipo === 'aviso_entrega') template = templateAvisoEntrega(data.nombre, data.orderId, data.turno, data.direccion, data.platillos, data.total);
  else return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tipo de email desconocido' }) };

  const RESEND_KEY = process.env.RESEND_KEY;
  if (!RESEND_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'RESEND_KEY no configurada' }) };

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject: template.subject, html: template.html })
    });
    const result = await res.json();
    if (!res.ok) {
      console.error('Resend error:', result);
      return { statusCode: 502, headers, body: JSON.stringify({ ok: false, error: result.message }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: result.id }) };
  } catch (err) {
    console.error('Fetch error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
