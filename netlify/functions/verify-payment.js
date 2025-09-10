// Netlify Function: verify-payment
// Verifies a Paystack transaction reference using the secret key from env
// Endpoint: /.netlify/functions/verify-payment
// Methods: GET ?reference=REF or POST { reference }

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

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server not configured: PAYSTACK_SECRET_KEY missing' })
    };
  }

  let reference = null;
  try {
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      reference = qs.reference || qs.ref || null;
    } else if (event.httpMethod === 'POST') {
      const ct = String(event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        const body = JSON.parse(event.body || '{}');
        reference = body.reference || body.ref || null;
      } else {
        const params = new URLSearchParams(event.body || '');
        reference = params.get('reference') || params.get('ref');
      }
    }
  } catch (_) {}

  if (!reference) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing reference (send ?reference= or JSON {reference})' })
    };
  }

  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Accept': 'application/json'
      }
    });

    const json = await res.json().catch(() => ({}));
    const ok = res.ok && json && json.status === true;

    if (!ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ verified: false, gateway: 'paystack', reference, raw: json })
      };
    }

    const tr = json.data || {};
    const verified = tr.status === 'success';
    const amount_kobo = Number(tr.amount || 0);
    const amount = Math.round(amount_kobo / 100);

    const payload = {
      verified,
      gateway: 'paystack',
      reference: tr.reference || reference,
      status: tr.status || null,
      amount,                // NGN
      amount_kobo,           // kobo
      currency: tr.currency || 'NGN',
      paid_at: tr.paid_at || null,
      channel: tr.channel || null,
      fees: tr.fees || null,
      customer: tr.customer ? {
        email: tr.customer.email || null,
        first_name: tr.customer.first_name || null,
        last_name: tr.customer.last_name || null,
        phone: tr.customer.phone || null,
      } : null,
      authorization: tr.authorization ? {
        channel: tr.authorization.channel || null,
        brand: tr.authorization.brand || null,
        last4: tr.authorization.last4 || null,
        reusable: tr.authorization.reusable || null,
      } : null,
      metadata: tr.metadata || null,
      raw: undefined // omit heavy raw on success
    };

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(payload) };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Verification failed', details: String(err) })
    };
  }
};
