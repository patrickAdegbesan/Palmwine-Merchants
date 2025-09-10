// Shared DB access using Netlify Neon
const { neon } = require('@netlify/neon');

// Returns a tagged template function bound to NETLIFY_DATABASE_URL
function getSql() {
  const sql = neon();
  if (!sql) throw new Error('Neon client not initialized');
  return sql;
}

// Initialize the database tables if they don't exist
async function initDB() {
  const sql = getSql();
  try {
    await sql`
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
    `;
    // Optional supporting tables for future features
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        location VARCHAR(255),
        price DECIMAL(10,2) NOT NULL,
        available_tickets INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = {
  getSql,
  initDB,
};
