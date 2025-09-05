const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_L5g6vNnIRMQO@ep-shy-cake-aeiqit7w-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to the database');
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Database tables:');
    console.table(tables.rows);
    
    if (tables.rows.some(t => t.table_name === 'tickets')) {
      const ticketCount = await client.query('SELECT COUNT(*) FROM tickets');
      console.log(`\n🎫 Total tickets in database: ${ticketCount.rows[0].count}`);
      
      const sampleTickets = await client.query('SELECT code, customer_name, status FROM tickets LIMIT 5');
      console.log('\n📝 Sample tickets:');
      console.table(sampleTickets.rows);
    }
    
  } catch (error) {
    console.error('❌ Error connecting to the database:', error);
  } finally {
    await client.end();
  }
}

testConnection();
