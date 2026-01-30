'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { POSProvider } from '@/components/pos';

export default function POSLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <POSProvider>
                {children}
            </POSProvider>
        </ProtectedRoute>
    );
}


