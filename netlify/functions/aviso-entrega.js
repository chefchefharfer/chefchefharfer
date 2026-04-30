// netlify/functions/aviso-entrega.js
// Chef Chef Harfer — Cron job: envía aviso de entrega a las 8am hora México
// Se ejecuta automáticamente todos los días a las 14:00 UTC (8am México CST)
// Declarado como scheduled function en netlify.toml

const { getStore } = require('@netlify/blobs');

const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'Chef Chef Harfer <hola@chefchefharfer.mx>';
const LOGO_URL = 'https://chefchefharfer.github.io/chefchefharfer/Logo%20chef%20chef.png';
const WA_LINK = 'https://wa.me/523782901365';

function emailWrapper(content) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#111111;padding:28px 40px;text-align:center;">
      <img src="${LOGO_URL}" alt="Chef Chef Harfer" style="height:64px;width:auto;display:block;margin:0 auto 10px;" />
      <div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:2px;text-transform:uppercase;">MEAL KITS · TEPATITLÁN DE MORELOS</div>
    </div>
    ${content}
    <div style="padding:24px 40px;border-top:1px solid #f0ede6;text-align:center;">
      <p style="margin:0 0 6px;color:#aaa;font-size:11px;">Tepatitlán de Morelos, Jalisco · Entregas Mar, Jue y Sáb</p>
      <a href="${WA_LINK}" style="color:#067c49;font-size:12px;font-weight:600;text-decoration:none;">WhatsApp: +52 378 290 1365</a>
      <p style="margin:10px 0 0;color:#ccc;font-size:10px;">© 2026 Chef Chef Harfer</p>
    </div>
  </div>
</body></html>`;
}

async function enviarAvisoEntrega(pedido) {
  const turnoLabel = pedido.turno === 'Manana' ? 'Mañana (10am – 1pm)' : 'Tarde (4pm – 7pm)';
  const platillosHtml = Array.isArray(pedido.platillos)
    ? pedido.platillos.map(p => `<li style="margin-bottom:4px;color:#555;font-size:14px;">${p.nombre} — Kit ${p.porciones}p × ${p.cantidad}</li>`).join('')
    : `<li style="color:#888;">Ver detalle en WhatsApp</li>`;

  const html = emailWrapper(`
    <div style="padding:40px;">
      <div style="background:linear-gradient(135deg,#067c49,#0a9659);border-radius:14px;padding:22px 24px;margin-bottom:28px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🚚</div>
        <div style="color:white;font-size:20px;font-weight:800;">¡Hoy llega tu pedido!</div>
        <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Turno: ${turnoLabel}</div>
      </div>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 22px;">
        Hola <strong>${pedido.cliente}</strong>, hoy te entregamos tu pedido <strong>#${pedido.orderId}</strong>.
        Asegúrate de estar disponible durante el turno indicado.
      </p>
      <div style="background:#f5f3ee;border-radius:14px;padding:20px 22px;margin-bottom:22px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#067c49;text-transform:uppercase;letter-spacing:0.5px;">Tu pedido</p>
        <ul style="margin:0;padding:0 0 0 18px;">${platillosHtml}</ul>
        <p style="margin:14px 0 0;font-size:14px;color:#333;">
          <strong>Dirección:</strong> ${pedido.direccion || 'Registrada en tu cuenta'}<br>
          <strong>Total:</strong> <span style="color:#067c49;font-weight:700;">$${(pedido.total||0).toLocaleString('es-MX')} MXN</span>
        </p>
      </div>
      <div style="text-align:center;">
        <a href="${WA_LINK}" style="display:inline-block;background:#25D366;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;">Contactar por WhatsApp</a>
      </div>
    </div>`);

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [pedido.email], subject: `🚚 Hoy es tu día de entrega — Chef Chef Harfer`, html })
  });
  return res.ok;
}

// Handler estándar — el schedule se declara en netlify.toml
exports.handler = async function(event) {
  console.log('Iniciando aviso de entrega:', new Date().toISOString());

  if (!process.env.RESEND_KEY) {
    console.error('RESEND_KEY no configurada');
    return { statusCode: 500 };
  }

  try {
    const store = getStore({ name: 'pedidos', consistency: 'strong' });
    const { blobs } = await store.list();

    const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Mexico_City' });
    const diasMap = { 'martes': 'Martes', 'jueves': 'Jueves', 'sábado': 'Sabado' };
    const diaHoy = diasMap[hoy.toLowerCase()] || '';

    if (!diaHoy) {
      console.log('Hoy no hay entregas:', hoy);
      return { statusCode: 200 };
    }

    console.log('Día de entregas:', diaHoy);
    let enviados = 0;

    for (const blob of blobs) {
      try {
        const pedido = JSON.parse(await store.get(blob.key));
        if (pedido && pedido.dia === diaHoy && !pedido.avisoEnviado && pedido.status !== 'Cancelado' && pedido.email) {
          const ok = await enviarAvisoEntrega(pedido);
          if (ok) {
            pedido.avisoEnviado = true;
            pedido.fechaAviso = new Date().toISOString();
            await store.set(blob.key, JSON.stringify(pedido));
            enviados++;
            console.log('Aviso enviado a:', pedido.email, 'Pedido:', pedido.orderId);
          }
        }
      } catch(e) {
        console.error('Error procesando pedido:', e.message);
      }
    }

    console.log('Avisos enviados:', enviados);
    return { statusCode: 200 };

  } catch (err) {
    console.error('aviso-entrega error:', err.message);
    return { statusCode: 500 };
  }
};
