'use client';

import { PricingPage as PricingComponent } from '@/components/pricing/PricingPage';

export default function PricingPage() {
  const handleSuccess = () => {
    window.location.href = '/dashboard';
  };

  return <PricingComponent onSuccess={handleSuccess} />;
}
