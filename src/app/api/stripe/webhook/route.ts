import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOurFirestore } from '@/services/firebaseServiceServer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    console.log('[Stripe Webhook] Event received:', event.type);

    const firestore = getOurFirestore();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error('[Stripe Webhook] No userId in metadata');
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Determine plan from priceId
        let plan = 'free';
        if (priceId.includes('pro') || priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL) {
          plan = 'pro';
        } else if (priceId.includes('enterprise') || priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL) {
          plan = 'enterprise';
        }

        // Update user in Firestore
        await firestore.collection('users').doc(userId).set({
          plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: subscription.status,
          updatedAt: new Date(),
        }, { merge: true });

        console.log('[Stripe Webhook] ✅ User upgraded:', userId, '→', plan);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await firestore.collection('users').doc(userId).update({
            subscriptionStatus: subscription.status,
            updatedAt: new Date(),
          });
          console.log('[Stripe Webhook] ✅ Subscription updated:', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Downgrade to free
          await firestore.collection('users').doc(userId).update({
            plan: 'free',
            subscriptionStatus: 'cancelled',
            updatedAt: new Date(),
          });
          console.log('[Stripe Webhook] ✅ Subscription cancelled:', userId, '→ free');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('[Stripe Webhook] ⚠️ Payment failed:', invoice.customer);
        // Optionally notify user
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
