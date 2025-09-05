const { getClient } = require('./utils/db');

exports.handler = async () => {
  try {
    const client = getClient();
    await client.connect();

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

    await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Database initialized' })
    };
  } catch (err) {
    console.error('init-db error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
