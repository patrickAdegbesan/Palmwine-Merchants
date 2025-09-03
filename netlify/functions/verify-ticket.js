const fs = require('fs').promises;
const path = require('path');

// ---
// WARNING: THIS IS NOT A PRODUCTION-READY DATABASE.
// The /tmp directory in a serverless function is temporary (ephemeral) and will be cleared periodically.
// This means your ticket data WILL BE LOST. For a real application, you MUST use a persistent database
// like FaunaDB, PlanetScale, Supabase, or MongoDB Atlas. This file is for local testing/demonstration only.
// ---
const TICKETS_FILE = path.join('/tmp', 'tickets.json');

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
    const { code, qrData, redeem } = JSON.parse(event.body);
    
    let ticketCode = null;
    let ticketData = null;
    
    // If QR data is provided, parse it to get the confirmation code
    if (qrData) {
      try {
        const parsedQR = JSON.parse(qrData);
        ticketCode = parsedQR.code;
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid QR code format',
            valid: false 
          })
        };
      }
    } else if (code) {
      ticketCode = code;
    }

    if (!ticketCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No ticket code provided',
          valid: false 
        })
      };
    }

    // Load stored tickets
    let tickets = {};
    try {
      const data = await fs.readFile(TICKETS_FILE, 'utf8');
      tickets = JSON.parse(data);
    } catch (error) {
      // No tickets file exists
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Ticket not found',
          valid: false,
          status: 'NOT_FOUND'
        })
      };
    }

    // Look up the ticket
    ticketData = tickets[ticketCode];
    
    if (!ticketData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Ticket not found',
          valid: false,
          status: 'NOT_FOUND'
        })
      };
    }
    
    if (!ticketData || !ticketData.code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No ticket data provided',
          valid: false 
        })
      };
    }
    
    // Validate ticket
    const now = new Date();
    const validUntil = new Date(ticketData.validUntil);
    const isExpired = now > validUntil;
    const isUsed = ticketData.status === 'USED';
    
    const isValid = !isExpired && !isUsed && ticketData.code;
    
    // Update verification count
    ticketData.verificationCount = (ticketData.verificationCount || 0) + 1;
    ticketData.lastVerifiedAt = new Date().toISOString();
    
    // If this is a redemption request and the ticket is valid, mark it as used
    if (redeem && isValid) {
      ticketData.status = 'USED';
      ticketData.usedAt = new Date().toISOString();
    }

    // Save updated ticket data
    tickets[ticketCode] = ticketData;
    await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));
    
    const response = {
      valid: isValid,
      ticket: {
        code: ticketData.code,
        customerName: ticketData.customerName || 'N/A',
        phone: ticketData.phone || 'N/A',
        email: ticketData.email || 'N/A',
        amount: ticketData.amount || '0',
        paymentMethod: ticketData.method || 'N/A',
        purchaseDate: ticketData.date || 'N/A',
        purchaseTime: ticketData.time || 'N/A',
        eventDetails: ticketData.eventDetails || {},
        validUntil: ticketData.validUntil || 'N/A'
      },
      status: isValid ? 'VALID' : (isExpired ? 'EXPIRED' : (isUsed ? 'USED' : 'INVALID')),
      verifiedAt: new Date().toISOString(),
      message: isValid ? (redeem ? 'Ticket successfully redeemed!' : 'Ticket is valid and ready for use') : 
               isExpired ? 'Ticket has expired' :
               isUsed ? `Ticket has already been used at ${new Date(ticketData.usedAt || ticketData.lastVerifiedAt).toLocaleString()}` :
               'Ticket is invalid'
    };
    
    // In a real implementation, you would:
    // 1. Log the verification attempt
    // 2. Mark the ticket as used if it's being redeemed
    // 3. Store verification history
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
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
