'use client';

import { POSLayout, usePOS } from '@/components/pos';
import { StoreSettings } from '@/components/pos/StoreSettings';

export default function SettingsPage() {
    const { store, fetchStore } = usePOS();

    return (
        <POSLayout title="⚙️ Store Settings" description="Manage your store information" showCart={false}>
            <StoreSettings store={store} onUpdate={fetchStore} />
        </POSLayout>
    );
}
