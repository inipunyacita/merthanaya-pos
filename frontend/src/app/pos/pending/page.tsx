'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OrderSummary } from '@/types';
import { orderApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { POSLayout, usePOS } from '@/components/pos';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

const ORDER_PAGE_SIZE = 6;

const OrderCard = memo(function OrderCard({
    order,
    onClick,
    formatPrice,
    formatSmartDate
}: {
    order: OrderSummary;
    onClick: (id: string) => void;
    formatPrice: (p: number) => string;
    formatSmartDate: (d: string) => string;
}) {
    return (
        <Card className="bg-white border-slate-200 hover:border-yellow-300 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => onClick(order.id)}>
            <CardHeader className="pb-2 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl sm:text-4xl font-bold text-yellow-600">{order.short_id}</CardTitle>
                        <div className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">{order.invoice_id}</div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">PENDING</Badge>
                </div>
            </CardHeader>
            <CardContent className="pb-2 p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">{formatPrice(order.total_amount)}</div>
                <div className="text-sm text-slate-500">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-200 p-3 sm:p-6">
                <div className="text-xs text-slate-400">{formatSmartDate(order.created_at)}</div>
            </CardFooter>
        </Card>
    );
});

export default function PendingPage() {
    const { handleViewDetails, formatPrice, formatSmartDate, setRefreshPendingOrders, setPendingOrdersCount } = usePOS();

    const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingSearch, setPendingSearch] = useState('');
    const debouncedPendingSearch = useDebounce(pendingSearch, 300);
    const [pendingPage, setPendingPage] = useState(1);

    const fetchPendingOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getPending();
            setPendingOrders(response.orders);
            setPendingOrdersCount(response.orders.length);
        } catch (error) {
            console.error('Failed to fetch pending orders:', error);
            toast.error('Failed to load pending orders');
        } finally {
            setLoading(false);
        }
    }, [setPendingOrdersCount]);

    useEffect(() => {
        fetchPendingOrders();
        setRefreshPendingOrders(fetchPendingOrders);
    }, [fetchPendingOrders, setRefreshPendingOrders]);

    // Realtime subscription for new orders
    useEffect(() => {
        const channel = supabase
            .channel('realtime-orders-pending')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
                (payload) => {
                    const newOrder = payload.new as any;
                    if (newOrder.status === 'PENDING') {
                        const summary: OrderSummary = {
                            id: newOrder.id,
                            daily_id: newOrder.daily_id,
                            short_id: `#${newOrder.daily_id.toString().padStart(3, '0')}`,
                            invoice_id: '',
                            total_amount: newOrder.total_amount,
                            status: 'PENDING',
                            item_count: 0,
                            created_at: newOrder.created_at,
                        };
                        setPendingOrders(prev => [summary, ...prev]);
                        toast.info('New Order!', { description: `Order ${summary.short_id} received` });
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload) => {
                    const updatedOrder = payload.new as { id: string; status: string };
                    if (updatedOrder.status === 'PAID' || updatedOrder.status === 'CANCELLED') {
                        setPendingOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Filter and sort pending orders by debounced search (newest first)
    const filteredPendingOrders = pendingOrders
        .filter(order =>
            !debouncedPendingSearch ||
            order.short_id.toLowerCase().includes(debouncedPendingSearch.toLowerCase()) ||
            order.invoice_id?.toLowerCase().includes(debouncedPendingSearch.toLowerCase())
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paginatedPendingOrders = filteredPendingOrders.slice((pendingPage - 1) * ORDER_PAGE_SIZE, pendingPage * ORDER_PAGE_SIZE);
    const pendingTotalPages = Math.ceil(filteredPendingOrders.length / ORDER_PAGE_SIZE);

    return (
        <POSLayout title="📋 Pending Orders" description={`${filteredPendingOrders.length} pending`} showCart={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="hidden sm:block" />
                <Input
                    placeholder="Search by ID..."
                    value={pendingSearch}
                    onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1); }}
                    className="w-full sm:w-48 bg-white border-slate-300"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">Loading orders...</div>
            ) : paginatedPendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <span className="text-6xl mb-4">✨</span>
                    <p className="text-xl">No pending orders</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {paginatedPendingOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onClick={handleViewDetails}
                            formatPrice={formatPrice}
                            formatSmartDate={formatSmartDate}
                        />
                    ))}
                </div>
            )}

            {pendingTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                    <Button variant="outline" size="sm" onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))} disabled={pendingPage === 1}>
                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <span className="text-sm text-slate-600">{pendingPage} / {pendingTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))} disabled={pendingPage >= pendingTotalPages}>
                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </POSLayout>
    );
}
