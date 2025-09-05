const { getClient } = require('./utils/db');

exports.handler = async (event, context) => {
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const ticketData = JSON.parse(event.body);
    
    // Validate required fields
    if (!ticketData.code || !ticketData.customerName || !ticketData.amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: code, customerName, amount',
          success: false 
        })
      };
    }

    // Normalize values
    const amount = parseFloat(ticketData.amount) || 0;
    const createdAt = new Date();
    const status = 'active';

    const client = getClient();
    try {
      await client.connect();
      const result = await client.query(
        `INSERT INTO tickets (
          code, customer_name, phone, email, amount, method, ref, event_details, valid_until, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
        ON CONFLICT (code) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          amount = EXCLUDED.amount,
          method = EXCLUDED.method,
          ref = EXCLUDED.ref,
          event_details = EXCLUDED.event_details,
          valid_until = EXCLUDED.valid_until,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
        RETURNING id, code, customer_name, email, amount, status, created_at`,
        [
          ticketData.code,
          ticketData.customerName,
          ticketData.phone || null,
          ticketData.email || null,
          amount,
          ticketData.method || null,
          ticketData.ref || null,
          ticketData.eventDetails ? JSON.stringify(ticketData.eventDetails) : null,
          ticketData.validUntil ? new Date(ticketData.validUntil) : null,
          status,
          createdAt
        ]
      );

      const saved = result.rows[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Ticket stored successfully',
          ticket: {
            id: saved.id,
            code: saved.code,
            customerName: saved.customer_name,
            email: saved.email,
            amount: saved.amount,
            status: saved.status,
            createdAt: saved.created_at
          }
        })
      };
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('Error storing ticket:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to store ticket',
        success: false 
      })
    };
  }
};
