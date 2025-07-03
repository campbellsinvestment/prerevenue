// pages/api/stripe/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { startupId } = req.body;

    try {


      const session = await stripe.checkout.sessions.create({
        mode: 'payment', // or 'subscription' if applicable
        payment_method_types: ['card'],
        line_items: [
          {
            price: "price_1OLF5hDH2exhYVMC26gIOFOU", 
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin}/startup/${startupId}?success=true`,
        cancel_url: `${req.headers.origin}/startup/${startupId}?canceled=true`,
        metadata: { startupId },
      });

      res.status(200).json({ checkoutUrl: session.url });
    } catch (error) {
      console.error('Error in create-checkout-session:', error);
      res.status(500).json({ error: { message: 'Error creating checkout session' } });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: { message: 'Method not allowed' } });
  }
}
