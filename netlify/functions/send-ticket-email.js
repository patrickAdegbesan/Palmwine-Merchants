// Sends ticket email using Resend API
// Env vars required: RESEND_API_KEY, FROM_EMAIL

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'tickets@palmwinemerchants.com';
  if (!RESEND_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing RESEND_API_KEY env' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const to = (payload.email || payload.to || '').trim();
    if (!to) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing recipient email' }) };
    }

    const customerName = payload.customerName || 'Customer';
    const code = payload.code || 'Unknown Code';
    const amount = payload.amount || '0';
    const eventDetails = payload.eventDetails || {};
    const validUntil = payload.validUntil || '';
    const imageUrl = payload.imageUrl || '';

    const subject = `Your Palmwine Merchants Ticket — ${code}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5;">
        <h2>Palmwine Merchants & Flames</h2>
        <p>Hi ${customerName},</p>
        <p>Thank you for your purchase. Here are your ticket details:</p>
        <ul>
          <li><strong>Confirmation Code:</strong> ${code}</li>
          <li><strong>Amount:</strong> ₦${amount}</li>
          <li><strong>Event:</strong> ${eventDetails.name || 'N/A'}</li>
          <li><strong>Date:</strong> ${eventDetails.date || 'N/A'}</li>
          <li><strong>Location:</strong> ${eventDetails.location || 'N/A'}</li>
          <li><strong>Valid Until:</strong> ${validUntil || 'N/A'}</li>
        </ul>
        ${imageUrl ? `<p><img src="${imageUrl}" alt="Ticket QR" width="220" style="border:1px solid #ddd; border-radius:8px; padding:6px;"/></p>` : ''}
        <p>You can verify your ticket at any time here: <a href="https://palmwine-merchant.netlify.app/verify.html">Verify Ticket</a></p>
        <p style="margin-top:24px;">Best regards,<br/>Palmwine Merchants & Flames</p>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html
      })
    });

    const json = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Email send failed', details: json }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: json.id || null }) };
  } catch (err) {
    console.error('send-ticket-email error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
