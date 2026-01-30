'use client';

import { POSLayout } from '@/components/pos';

export default function AnalyticsPage() {
    return (
        <POSLayout title="📊 Analytics" description="Sales and performance insights" showCart={false}>
            <div className="text-black flex flex-col items-start justify-center h-64 bg-amber-200 px-4">
                <span className="text-4xl mb-4">📊</span>
                <div className="flex flex-col">
                    <p className="text-xl font-extrabold">Analytics Dashboard</p>
                    <p className="text-sm text-black">View detailed sales reports and insights here</p>
                </div>
            </div>
        </POSLayout>
    );
}
