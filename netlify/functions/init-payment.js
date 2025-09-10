// Netlify Function: init-payment
// Initializes a Paystack Standard transaction and returns authorization_url
// Endpoint: /.netlify/functions/init-payment
// Methods: POST { email, amount, reference, currency?, metadata?, callback_url? }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST'){
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server not configured: PAYSTACK_SECRET_KEY missing' })
    };
  }

  let data = {};
  try{
    const ct = String(event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
    if (ct.includes('application/json')) {
      data = JSON.parse(event.body || '{}');
    } else {
      const params = new URLSearchParams(event.body || '');
      data = Object.fromEntries(params.entries());
    }
  } catch(_){ data = {}; }

  const email = (data.email || '').trim();
  const amount = Number(data.amount || data.amount_kobo || 0); // expect kobo
  const reference = (data.reference || data.ref || '').trim();
  const currency = (data.currency || 'NGN').trim();
  const metadata = data.metadata || undefined;
  const callback_url = (data.callback_url || '').trim();

  if (!email || !amount || amount <= 0 || !reference){
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields: email, amount(kobo), reference' }) };
  }

  const payload = { email, amount, reference, currency };
  if (metadata) payload.metadata = metadata;
  if (callback_url) payload.callback_url = callback_url;

  try{
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(()=>({}));
    if (!res.ok || !json || json.status !== true){
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: false, error: json && json.message || 'Initialize failed', raw: json }) };
    }

    const d = json.data || {};
    const result = {
      ok: true,
      authorization_url: d.authorization_url,
      access_code: d.access_code,
      reference: d.reference || reference
    };
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
  } catch(err){
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Initialize error', details: String(err) }) };
  }
};
