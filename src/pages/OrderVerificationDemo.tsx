import React from 'react';
import OrderVerification from '@/components/OrderVerification';

export default function OrderVerificationDemo() {
  const handleVerificationComplete = (approved: boolean) => {
    console.log('Verification completed:', approved);
    // In a real app, this would navigate to order details or dashboard
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Verification</h1>
          <p className="text-gray-600">Review changes made to your order by the rider</p>
        </div>
        
        <OrderVerification 
          orderId="LAU-001"
          onVerificationComplete={handleVerificationComplete}
        />
      </div>
    </div>
  );
}
