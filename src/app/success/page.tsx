'use client';

import { SuccessPage as SuccessComponent } from '@/components/SuccessPage';

export default function SuccessPage() {
  const handleContinue = () => {
    window.location.href = '/dashboard';
  };

  return <SuccessComponent onContinue={handleContinue} />;
}
