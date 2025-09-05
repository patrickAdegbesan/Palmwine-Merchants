const { initDB } = require('./utils/db');

exports.handler = async () => {
  try {
    await initDB();
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
