'use client';

import { POSLayout } from '@/components/pos';

export default function AnalyticsPage() {
    return (
        <POSLayout title="📊 Analytics" description="Sales and performance insights" showCart={false}>
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <span className="text-6xl mb-4">📊</span>
                <p className="text-xl">Analytics Coming Soon</p>
                <p className="text-sm text-slate-400 mt-2">View detailed sales reports and insights here</p>
            </div>
        </POSLayout>
    );
}
