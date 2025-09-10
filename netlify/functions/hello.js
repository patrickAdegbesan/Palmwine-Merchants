exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Netlify!",
      paystackKey: process.env.PAYSTACK_SECRET_KEY ? "✅ Key found" : "❌ Key not set"
    }),
  };
}
