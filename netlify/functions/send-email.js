// netlify/functions/send-email.js
// Función serverless para Chef Chef Harfer
// Maneja 3 tipos de correo: bienvenida, recuperacion, confirmacion

const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'Chef Chef Harfer <hola@chefchefharfer.mx>';

// Plantillas de correo
function templateBienvenida(nombre) {
  return {
    subject: `¡Bienvenido a Chef Chef Harfer, ${nombre}!`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#111;padding:32px 40px;text-align:center;">
      <div style="color:white;font-size:26px;font-weight:900;letter-spacing:-0.5px;">Chef Chef <span style="color:#4caf50;">Harfer</span></div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px;letter-spacing:1px;">MEAL KITS · TEPATITLÁN</div>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#111;">¡Hola, ${nombre}! 👋</h1>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Tu cuenta en Chef Chef Harfer está lista. Ya puedes explorar nuestro menú, elegir tus kits favoritos y hacer tu primer pedido.
      </p>
      <div style="background:#f5f3ee;border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#067c49;text-transform:uppercase;letter-spacing:0.5px;">¿Cómo funciona?</p>
        <p style="margin:0;color:#555;font-size:14px;line-height:1.8;">
          1. Elige tus meal kits (kits para 2 ó 4 personas)<br>
          2. Selecciona día y turno de entrega<br>
          3. Confirma tu domicilio<br>
          4. ¡Recibe tus ingredientes frescos y porcionados!
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://chefchefharfer.github.io/chefchefharfer" style="display:inline-block;background:#067c49;color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">Ver el menú →</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:24px 40px;border-top:1px solid #f0ede6;text-align:center;">
      <p style="margin:0;color:#aaa;font-size:11px;line-height:1.6;">
        Tepatitlán de Morelos, Jalisco · Entregas Mar, Jue y Sáb<br>
        <a href="https://wa.me/523782901365" style="color:#067c49;">WhatsApp: +52 378 290 1365</a>
      </p>
    </div>
  </div>
</body>
</html>`
  };
}

function templateRecuperacion(nombre, codigo) {
  return {
    subject: `Tu código de recuperación — Chef Chef Harfer`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#111;padding:32px 40px;text-align:center;">
      <div style="color:white;font-size:26px;font-weight:900;letter-spacing:-0.5px;">Chef Chef <span style="color:#4caf50;">Harfer</span></div>
    </div>
    <div style="padding:40px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111;">Código de recuperación</h1>
      <p style="color:#888;font-size:14px;margin:0 0 32px;">Hola ${nombre}, usa este código para restablecer tu PIN:</p>
      <div style="background:#f5f3ee;border-radius:16px;padding:28px;margin-bottom:28px;display:inline-block;min-width:200px;">
        <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#067c49;font-variant-numeric:tabular-nums;">${codigo}</div>
      </div>
      <p style="color:#aaa;font-size:13px;margin:0;">Este código es válido por <strong>10 minutos</strong>.<br>Si no solicitaste este código, ignora este mensaje.</p>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #f0ede6;text-align:center;">
      <p style="margin:0;color:#aaa;font-size:11px;">Chef Chef Harfer · Tepatitlán de Morelos, Jalisco</p>
    </div>
  </div>
</body>
</html>`
  };
}

function templateConfirmacion(nombre, orderId, dia, turno, direccion, platillos, total) {
  const turnoLabel = turno === 'Manana' ? 'Mañana (10am - 1pm)' : 'Tarde (4pm - 7pm)';
  const platillosHtml = Array.isArray(platillos)
    ? platillos.map(p => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ede6;color:#333;font-size:14px;">${p.nombre} — Kit ${p.porciones}p × ${p.cantidad}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ede6;font-weight:700;color:#111;font-size:14px;text-align:right;">$${(p.subtotal||0).toLocaleString('es-MX')}</td>
      </tr>`).join('')
    : `<tr><td colspan="2" style="padding:10px 0;color:#888;font-size:14px;">${platillos}</td></tr>`;

  return {
    subject: `Pedido #${orderId} confirmado — Chef Chef Harfer`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#067c49;padding:32px 40px;text-align:center;">
      <div style="color:white;font-size:26px;font-weight:900;letter-spacing:-0.5px;">¡Pedido enviado! 🎉</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:6px;">Pedido #${orderId}</div>
    </div>
    <div style="padding:40px;">
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hola <strong>${nombre}</strong>, recibimos tu pedido. En breve te enviamos el link de pago por WhatsApp.
      </p>
      <!-- Resumen -->
      <div style="background:#f5f3ee;border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#067c49;text-transform:uppercase;letter-spacing:0.5px;">Detalles de entrega</p>
        <p style="margin:0 0 6px;font-size:14px;color:#333;"><strong>Día:</strong> ${dia}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#333;"><strong>Turno:</strong> ${turnoLabel}</p>
        <p style="margin:0;font-size:14px;color:#333;"><strong>Dirección:</strong> ${direccion}</p>
      </div>
      <!-- Platillos -->
      <table style="width:100%;border-collapse:collapse;">
        ${platillosHtml}
        <tr>
          <td style="padding:14px 0 0;font-size:16px;font-weight:800;color:#111;">Total</td>
          <td style="padding:14px 0 0;font-size:20px;font-weight:900;color:#067c49;text-align:right;">$${(total||0).toLocaleString('es-MX')} MXN</td>
        </tr>
      </table>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #f0ede6;text-align:center;">
      <p style="margin:0 0 8px;color:#aaa;font-size:12px;">¿Tienes dudas? Escríbenos por WhatsApp</p>
      <a href="https://wa.me/523782901365" style="color:#067c49;font-weight:700;font-size:13px;text-decoration:none;">+52 378 290 1365</a>
    </div>
  </div>
</body>
</html>`
  };
}

// Handler principal
exports.handler = async function(event) {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  // CORS — solo permitir el dominio propio
  const headers = {
    'Access-Control-Allow-Origin': 'https://chefchefharfer.github.io',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { tipo, to, data } = body;

  // Validaciones básicas
  if (!tipo || !to || !data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan parámetros' }) };
  }
  if (!to.includes('@')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email inválido' }) };
  }

  // Seleccionar plantilla
  let template;
  if (tipo === 'bienvenida') {
    template = templateBienvenida(data.nombre || 'Cliente');
  } else if (tipo === 'recuperacion') {
    template = templateRecuperacion(data.nombre || 'Cliente', data.codigo || '------');
  } else if (tipo === 'confirmacion') {
    template = templateConfirmacion(
      data.nombre, data.orderId, data.dia, data.turno,
      data.direccion, data.platillos, data.total
    );
  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tipo de email desconocido' }) };
  }

  // Enviar via Resend
  const RESEND_KEY = process.env.RESEND_KEY;
  if (!RESEND_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'RESEND_KEY no configurada en variables de entorno' }) };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: template.subject,
        html: template.html
      })
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend error:', result);
      return { statusCode: 502, headers, body: JSON.stringify({ ok: false, error: result.message || 'Error de Resend' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: result.id }) };

  } catch (err) {
    console.error('Fetch error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
