// Shared PostgreSQL client for Netlify Functions
const { Client } = require('pg');

// Initialize a new client using available env vars (supports Netlify Neon)
function getClient() {
  const connStr =
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED;

  if (!connStr) {
    throw new Error('Database URL not set. Set DATABASE_URL or NETLIFY_DATABASE_URL in env.');
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  return client;
}

// Initialize the database tables if they don't exist
async function initDB() {
  const client = getClient();
  try {
    await client.connect();
    
    // Create tickets table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(20),
        ref VARCHAR(100),
        event_details JSONB,
        valid_until TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'active',
        verification_count INTEGER DEFAULT 0,
        last_verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Helper to execute a query with error handling
async function query(text, params) {
  const client = getClient();
  try {
    await client.connect();
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', { query: text, error });
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = {
  getClient,
  initDB,
  query
};
