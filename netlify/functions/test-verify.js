const { getClient } = require('./utils/db');

async function testVerification() {
  const testCode = 'TKT-ABC123'; // Replace with a valid ticket code from your database
  
  try {
    // Test the database connection first
    const client = getClient();
    await client.connect();
    console.log('✅ Successfully connected to the database');
    
    // Test query to list all tickets (for debugging)
    const result = await client.query('SELECT code, status, customer_name FROM tickets LIMIT 5');
    console.log('📋 First 5 tickets in database:');
    console.table(result.rows);
    
    // Test the verification
    console.log(`\n🔍 Testing verification for code: ${testCode}`);
    const verifyResult = await client.query(
      'SELECT * FROM tickets WHERE code = $1',
      [testCode]
    );
    
    if (verifyResult.rows.length === 0) {
      console.log(`❌ No ticket found with code: ${testCode}`);
      return;
    }
    
    const ticket = verifyResult.rows[0];
    console.log('🎫 Ticket found:');
    console.log({
      code: ticket.code,
      status: ticket.status,
      customer: ticket.customer_name,
      email: ticket.email,
      amount: ticket.amount,
      lastVerified: ticket.last_verified_at,
      verificationCount: ticket.verification_count
    });
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Close the database connection
    if (client) {
      await client.end();
    }
    process.exit();
  }
}

// Set the DATABASE_URL environment variable
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_L5g6vNnIRMQO@ep-shy-cake-aeiqit7w-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

// Run the test
testVerification();
