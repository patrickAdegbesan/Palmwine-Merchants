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

    // Load existing tickets
    let tickets = {};
    try {
      const data = await fs.readFile(TICKETS_FILE, 'utf8');
      tickets = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty object
      tickets = {};
    }

    // Add timestamp and status
    const ticket = {
      ...ticketData,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      usedAt: null,
      verificationCount: 0
    };

    // Store ticket with confirmation code as key
    tickets[ticketData.code] = ticket;

    // Save back to file
    await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Ticket stored successfully',
        ticketId: ticketData.code
      })
    };

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
