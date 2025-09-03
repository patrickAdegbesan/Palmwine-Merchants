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

    // Add timestamp and status
    const ticket = {
      ...ticketData,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      usedAt: null,
      verificationCount: 0
    };

    // Store ticket with confirmation code as key
    const result = await query({
      text: `INSERT INTO tickets (code, customer_name, amount, created_at, status, used_at, verification_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      values: [ticketData.code, ticketData.customerName, ticketData.amount, ticket.createdAt, ticket.status, ticket.usedAt, ticket.verificationCount]
    });

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
