import React, { useState } from 'react';
import { Check, Loader, Crown } from 'lucide-react';
import { products } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';

interface PricingPageProps {
  onSuccess: () => void;
}

export function PricingPage({ onSuccess }: PricingPageProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    setError('');

    try {
      const { url } = await createCheckoutSession({
        priceId,
        mode: 'subscription',
        successUrl: `${window.location.origin}/success`,
        cancelUrl: window.location.href,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError('Failed to create checkout session. Please try again.');
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start building APIs with the perfect plan for your needs
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
            <p className="text-red-800 text-sm text-center">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Perfect for getting started</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-gray-700">1 Database connection</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-gray-700">5 API endpoints</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-gray-700">1,000 requests/month</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-gray-700">Basic documentation</span>
              </li>
            </ul>

            <button
              onClick={onSuccess}
              className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Get Started Free
            </button>
          </div>

          {/* Paid Plans */}
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-500 relative"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                  <Crown className="w-4 h-4 mr-1" />
                  Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">${product.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">{product.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Unlimited databases</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Unlimited API endpoints</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">100,000 requests/month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Advanced documentation</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom authentication</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(product.priceId)}
                disabled={loading === product.priceId}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                {loading === product.priceId ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Subscribe Now</span>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}