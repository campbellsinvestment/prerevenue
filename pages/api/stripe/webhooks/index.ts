// pages/api/stripe/webhooks/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Cors from 'micro-cors';
import Stripe from 'stripe';

// Configure CORS for the webhook endpoint
const cors = Cors({
    allowMethods: ['POST', 'HEAD'],
  });
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET_WEBHOOKS!;
  
  // Stripe requires the raw body to construct the event.
  export const config = {
    api: {
      bodyParser: false,
    },
  }

  const webhookHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
      const buf = await buffer(req);
      const sig = req.headers['stripe-signature']!;
  
      let event: Stripe.Event;
  
      try {
        event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
        console.log(JSON.stringify(event, null, 2));
      } catch (err) {
        if (err instanceof Error) {
          console.log(`❌ Error message: ${err.message}`);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        return res.status(400).send('Webhook error occurred');
      }
  
      // Check the event structure
      if (!event || !event.data || !event.data.object) {
        console.error("Unexpected event structure:", event);
        return res.status(400).send("Webhook Error: Unexpected event structure");
      }
  
      // Handle the event
      switch (event.type) {
        case 'charge.succeeded':
          await handleSuccessfulPayment(event);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
  
      // Return a response to acknowledge the event was received
      res.json({ received: true });
    } else {
      res.setHeader('Allow', 'POST');
      res.status(405).send('Method Not Allowed');
    }
  };
  
  export default cors(webhookHandler as any);

  export const handleSuccessfulPayment = async (event: Stripe.Event) => {
    const charge = event.data.object as Stripe.Charge;
  
    if (!charge.metadata || !charge.metadata.startupId) {
      console.error('Charge metadata missing or incomplete', charge.metadata);
      return;
    }
  
    const startupId = charge.metadata.startupId;
  
    try {
      const response = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'activateStartup',
          startupId: startupId,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to activate startup');
      }
  
      console.log('Startup activated successfully');
    } catch (error) {
      console.error('Error activating startup:', error);
    }
  };
  