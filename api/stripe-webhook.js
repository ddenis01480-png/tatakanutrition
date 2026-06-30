// Vercel Function — reçoit les événements Stripe et met à jour Supabase
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = 'https://ogkrgsnnoebsvbgsngvm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // clé service_role, jamais publique

export const config = {
  api: {
    bodyParser: false, // Stripe a besoin du raw body pour vérifier la signature
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function updateSupabaseProfile(userId, updates) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Supabase update failed:', text);
  }
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const sig = req.headers['stripe-signature'];
  const rawBody = await buffer(req);

  let event;
  try {
    // Vérification de signature manuelle (sans SDK Stripe pour rester léger)
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (userId) {
          await updateSupabaseProfile(userId, { premium: true });
          console.log('Premium activé pour user:', userId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // Abonnement annulé ou expiré
        const subscription = event.data.object;
        const customerId = subscription.customer;
        // On retrouve l'utilisateur via son email (stocké côté Stripe customer)
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && customer.email) {
          const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(customer.email)}&select=id`, {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          });
          const profiles = await profRes.json();
          if (profiles && profiles[0]) {
            await updateSupabaseProfile(profiles[0].id, { premium: false });
            console.log('Premium désactivé pour:', customer.email);
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        // Paiement échoué — on pourrait notifier l'utilisateur ici
        console.log('Paiement échoué:', event.data.object.customer_email);
        break;
      }
      default:
        console.log('Événement non géré:', event.type);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erreur traitement webhook:', err);
    res.status(500).send('Internal error');
  }
}
