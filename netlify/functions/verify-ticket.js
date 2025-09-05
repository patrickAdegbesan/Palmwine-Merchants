const { getSql } = require('./utils/db');

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
      body: JSON.stringify({ 
        error: 'Method Not Allowed',
        success: false
      })
    };
  }

  try {
    const { code } = JSON.parse(event.body);
    
    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Ticket code is required',
          success: false
        })
      };
    }

    const sql = getSql();
    const now = new Date();

    // Try to mark as used in one atomic statement
    const updated = await sql`
      UPDATE tickets 
      SET verification_count = COALESCE(verification_count, 0) + 1,
          last_verified_at = ${now},
          status = 'used',
          updated_at = ${now}
      WHERE code = ${code} AND status <> 'used'
      RETURNING *
    `;

    if (updated.length === 0) {
      // Not updated: either not found or already used. Check existence.
      const existing = await sql`SELECT * FROM tickets WHERE code = ${code} LIMIT 1`;
      if (existing.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Ticket not found', success: false })
        };
      }
      const t = existing[0];
      if (t.status === 'used') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'This ticket has already been used',
            ticket: {
              code: t.code,
              status: t.status,
              lastVerifiedAt: t.last_verified_at,
              verificationCount: t.verification_count
            }
          })
        };
      }
      // Otherwise some other state like expired
      if (t.valid_until && new Date(t.valid_until) < now) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'This ticket has expired', ticket: { code: t.code, status: 'expired', validUntil: t.valid_until } })
        };
      }
      // Fallback: return as not updated
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Unable to update ticket' }) };
    }

    const ut = updated[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ticket: {
          id: ut.id,
          code: ut.code,
          customerName: ut.customer_name,
          email: ut.email,
          amount: ut.amount,
          status: ut.status,
          verificationCount: ut.verification_count,
          lastVerifiedAt: ut.last_verified_at,
          eventDetails: ut.event_details,
          validUntil: ut.valid_until
        }
      })
    };
    
  } catch (error) {
    console.error('Ticket verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        valid: false 
      })
    };
  }
};
