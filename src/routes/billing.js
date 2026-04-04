import { Router } from 'express';
import Stripe from 'stripe';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const PLAN_LIMITS = {
  free: 3,
  pro: 25,
  business: Infinity,
};

const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
};

export const billingRouter = Router();

function requireStripe(req, res, next) {
  if (!stripe) return res.status(503).json({ error: 'Billing is not configured' });
  next();
}

// Get current plan info
billingRouter.get('/plan', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT plan, stripe_subscription_id FROM users WHERE id = $1',
    [req.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = rows[0];
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM pipelines WHERE user_id = $1',
    [req.userId]
  );

  res.json({
    plan: user.plan,
    pipelineCount: countRows[0].count,
    pipelineLimit: PLAN_LIMITS[user.plan] ?? 3,
    hasSubscription: !!user.stripe_subscription_id,
  });
});

// Create Stripe Checkout session for upgrade
billingRouter.post('/checkout', requireAuth, requireStripe, async (req, res) => {
  const { plan } = req.body;

  if (!plan || !PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Invalid plan. Choose "pro" or "business".' });
  }

  const { rows } = await pool.query('SELECT id, email, stripe_customer_id FROM users WHERE id = $1', [req.userId]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = rows[0];

  // Create or reuse Stripe customer
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    customerId = customer.id;
    await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.id]);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?billing=success`,
    cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?billing=cancelled`,
    metadata: { userId: user.id, plan },
  });

  res.json({ url: session.url });
});

// Stripe webhook handler
billingRouter.post('/webhook', requireStripe, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[billing] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata;
      if (userId && plan) {
        await pool.query(
          'UPDATE users SET plan = $1, stripe_subscription_id = $2 WHERE id = $3',
          [plan, session.subscription, userId]
        );
        console.log(`[billing] User ${userId} upgraded to ${plan}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await pool.query(
        'UPDATE users SET plan = $1, stripe_subscription_id = NULL WHERE stripe_subscription_id = $2',
        ['free', subscription.id]
      );
      console.log(`[billing] Subscription ${subscription.id} cancelled, reverted to free`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.warn(`[billing] Payment failed for customer ${invoice.customer}`);
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});
