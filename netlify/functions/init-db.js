const { Pool } = require('pg');

async function initDatabase() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED;

  if (!connectionString) {
    throw new Error('DATABASE_URL (or NETLIFY_DATABASE_URL) environment variable is required');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    try {
      // Create tickets table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tickets (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(255),
          amount DECIMAL(10, 2) NOT NULL,
          method VARCHAR(50),
          ref VARCHAR(100),
          event_details JSONB,
          valid_until TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) DEFAULT 'active',
          verification_count INTEGER DEFAULT 0,
          last_verified_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Supporting tables (optional)
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          location VARCHAR(255),
          price DECIMAL(10, 2) NOT NULL,
          available_tickets INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'customer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

exports.handler = async () => {
  try {
    await initDatabase();
    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Database initialized successfully' }) };
  } catch (error) {
    console.error('init-db error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
