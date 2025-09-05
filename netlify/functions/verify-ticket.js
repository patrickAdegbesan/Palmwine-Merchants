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

    const client = getClient();
    try {
      await client.connect();
      await client.query('BEGIN');
      
      const result = await client.query(
        `SELECT * FROM tickets 
         WHERE code = $1 
         FOR UPDATE`, 
        [code]
      );
      
      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'Ticket not found',
            success: false
          })
        };
      }
      
      const ticket = result.rows[0];
      const now = new Date();
      
      if (ticket.status === 'used') {
        await client.query('ROLLBACK');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'This ticket has already been used',
            ticket: {
              code: ticket.code,
              status: ticket.status,
              lastVerifiedAt: ticket.last_verified_at,
              verificationCount: ticket.verification_count
            }
          })
        };
      }
      
      if (ticket.valid_until && new Date(ticket.valid_until) < now) {
        await client.query('ROLLBACK');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'This ticket has expired',
            ticket: {
              code: ticket.code,
              status: 'expired',
              validUntil: ticket.valid_until
            }
          })
        };
      }
      
      const updateResult = await client.query(
        `UPDATE tickets 
         SET verification_count = verification_count + 1,
             last_verified_at = $1,
             status = 'used',
             updated_at = $1
         WHERE code = $2
         RETURNING *`,
        [now, code]
      );
      
      await client.query('COMMIT');
      
      const updatedTicket = updateResult.rows[0];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ticket: {
            id: updatedTicket.id,
            code: updatedTicket.code,
            customerName: updatedTicket.customer_name,
            email: updatedTicket.email,
            amount: updatedTicket.amount,
            status: updatedTicket.status,
            verificationCount: updatedTicket.verification_count,
            lastVerifiedAt: updatedTicket.last_verified_at,
            eventDetails: updatedTicket.event_details,
            validUntil: updatedTicket.valid_until
          }
        })
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
    
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
