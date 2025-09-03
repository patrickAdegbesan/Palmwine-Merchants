const { Client } = require('pg');

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create tickets table
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
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.end();
  }
}

// Run the initialization
initDB();
