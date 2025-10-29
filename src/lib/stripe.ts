// Stripe integration for payments
export async function createCheckoutSession(priceId: string) {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }
  
  return response.json();
}

export async function getUserSubscription(userId?: string) {
  // This would typically fetch from your backend
  return {
    status: 'active',
    plan: 'free',
    features: []
  };
}
