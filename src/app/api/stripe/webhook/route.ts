import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.metadata?.email;
        
        if (email) {
          // Query Firestore to find user by email using Admin SDK
          const querySnapshot = await adminDb.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            
            // Determine plan based on price ID
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            const priceId = lineItems.data[0]?.price?.id;
            
            let plan = 'free';
            let usageLimit = 10000;
            
            // Map price IDs to plans
            if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 
                priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL) {
              plan = 'pro';
              usageLimit = 100000;
            } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || 
                       priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL) {
              plan = 'enterprise';
              usageLimit = 1000000;
            }
            
            // Update user document using Admin SDK
            await adminDb.collection('users').doc(userDoc.id).update({
              plan,
              usageLimit,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              updatedAt: new Date().toISOString(),
            });
            
            console.log(`✅ Updated user ${email} to ${plan} plan`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);
        // Handle subscription updates (e.g., plan changes, renewals)
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by subscription ID and downgrade to free using Admin SDK
        const querySnapshot = await adminDb.collection('users')
          .where('stripeSubscriptionId', '==', subscription.id)
          .limit(1)
          .get();
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await adminDb.collection('users').doc(userDoc.id).update({
            plan: 'free',
            usageLimit: 10000,
            stripeSubscriptionId: null,
            updatedAt: new Date().toISOString(),
          });
          console.log(`✅ Downgraded user to free plan after subscription cancellation`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for customer:', invoice.customer);
        // Handle failed payments (e.g., send notification)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
