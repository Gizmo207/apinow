import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader } from 'lucide-react';
import Link from 'next/link';
import { getUserSubscription } from '../lib/stripe';

interface SuccessPageProps {
  onContinue: () => void;
}

export function SuccessPage({ onContinue }: SuccessPageProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const sub = await getUserSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Loading subscription details...</span>
          </div>
        ) : subscription ? (
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Welcome to your new subscription!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Subscription Details</h3>
              <p className="text-blue-800 text-sm">
                Status: <span className="font-medium capitalize">{subscription.subscription_status}</span>
              </p>
              {subscription.current_period_end && (
                <p className="text-blue-800 text-sm">
                  Next billing: {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully. You can now access all premium features.
          </p>
        )}

        <div className="space-y-4">
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/pricing"
            className="block w-full text-center text-blue-600 hover:text-blue-700 py-2"
          >
            View all plans
          </Link>
        </div>
      </div>
    </div>
  );
}