// Stripe integration - stub implementation for now
// TODO: Implement proper Stripe backend integration

interface CreateCheckoutSessionParams {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({
  priceId,
  mode,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<{ sessionId: string; url: string }> {
  // Stub implementation - redirect to success for now
  console.warn('Stripe checkout not yet implemented');
  return {
    sessionId: 'stub_session',
    url: successUrl
  };
}

export async function getUserSubscription() {
  // Stub implementation
  console.warn('getUserSubscription not yet implemented');
  return null;
}

export async function getUserOrders() {
  // Stub implementation
  console.warn('getUserOrders not yet implemented');
  return [];
}