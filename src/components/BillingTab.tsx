import React, { useState, useEffect } from 'react';
import { PLAN_LIMITS } from '@/config/plans';
import { CheckCircle, XCircle, Zap } from 'lucide-react';

interface BillingTabProps {
  user: any;
}

export function BillingTab({ user }: BillingTabProps) {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [usageStats, setUsageStats] = useState({
    usageCount: 0,
    usageLimit: 10000,
    percentageUsed: 0,
  });

  useEffect(() => {
    loadUserPlan();
  }, [user]);

  const loadUserPlan = async () => {
    try {
      const { auth } = await import('../services/firebaseService');
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/user/plan', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plan || 'free');
        setUsageStats({
          usageCount: data.usageCount || 0,
          usageLimit: data.usageLimit || 10000,
          percentageUsed: data.percentageUsed || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load user plan:', error);
    }
  };

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const { auth } = await import('../services/firebaseService');
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          email: currentUser.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      ...PLAN_LIMITS.free,
      isCurrent: currentPlan === 'free',
    },
    {
      id: 'pro',
      ...PLAN_LIMITS.pro,
      isCurrent: currentPlan === 'pro',
    },
    {
      id: 'enterprise',
      ...PLAN_LIMITS.enterprise,
      isCurrent: currentPlan === 'enterprise',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Current Plan & Usage */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Plan & Usage</h2>
        
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-blue-600" />
          <div>
            <div className="text-2xl font-bold text-gray-900">{PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS].name}</div>
            <div className="text-sm text-gray-600">{PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS].price}</div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">API Requests This Month</span>
            <span className="font-medium text-gray-900">
              {usageStats.usageCount.toLocaleString()} / {usageStats.usageLimit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                usageStats.percentageUsed < 70
                  ? 'bg-green-600'
                  : usageStats.percentageUsed < 90
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(usageStats.percentageUsed, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {usageStats.percentageUsed}% used
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 ${
                plan.isCurrent
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                {plan.isCurrent && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    Current
                  </span>
                )}
              </div>

              <div className="text-3xl font-bold text-gray-900 mb-2">{plan.price}</div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {!plan.isCurrent && (
                <button
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={loading || plan.id === 'free'}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    plan.id === 'free'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Loading...' : plan.id === 'free' ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
              )}

              {plan.isCurrent && plan.id !== 'free' && (
                <div className="text-sm text-center text-gray-600">
                  Manage subscription in Stripe portal
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Billing FAQ */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">💡 Billing Information</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Usage resets on the 1st of each month</li>
          <li>• Upgrades take effect immediately</li>
          <li>• Downgrades apply at next billing cycle</li>
          <li>• All plans include automatic backups</li>
          <li>• Cancel anytime with no penalty</li>
        </ul>
      </div>
    </div>
  );
}
