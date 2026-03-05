'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OrderSummary } from '@/types';
import { orderApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { POSLayout, usePOSState, usePOSActions } from '@/components/pos';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

const ORDER_PAGE_SIZE = 6;

const SuccessOrderCard = memo(function SuccessOrderCard({
    order,
    onPrint,
    formatPrice,
    formatDateTime
}: {
    order: OrderSummary;
    onPrint: (id: string) => void;
    formatPrice: (p: number) => string;
    formatDateTime: (d: string) => string;
}) {
    return (
        <Card className="bg-white border-slate-200 hover:border-green-300 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-2 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl sm:text-4xl font-bold text-green-600">{order.short_id}</CardTitle>
                        <div className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">{order.invoice_id}</div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">PAID</Badge>
                </div>
            </CardHeader>
            <CardContent className="pb-2 p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">{formatPrice(order.total_amount)}</div>
                <div className="text-sm text-slate-500">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-200 flex justify-between items-center p-3 sm:p-6">
                <div className="text-xs text-slate-400">{formatDateTime(order.created_at)}</div>
                <Button size="sm" variant="outline" onClick={() => onPrint(order.id)} className="border-slate-300">
                    <Printer className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Invoice</span>
                </Button>
            </CardFooter>
        </Card>
    );
});

export default function SuccessPage() {
    const { handlePrintInvoice, formatPrice, formatDateTime, setSuccessOrdersCount } = usePOSActions();

    const [paidOrders, setPaidOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [successSearch, setSuccessSearch] = useState('');
    const debouncedSuccessSearch = useDebounce(successSearch, 300);
    const [paidPage, setPaidPage] = useState(1);
    const [totalPaidOrders, setTotalPaidOrders] = useState(0);

    const fetchPaidOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getHistory({
                page: paidPage,
                page_size: ORDER_PAGE_SIZE,
                status: 'PAID',
                search: debouncedSuccessSearch || undefined
            });
            setPaidOrders(response.orders);
            setTotalPaidOrders(response.total);
            setSuccessOrdersCount(response.total);
        } catch (error) {
            console.error('Failed to fetch paid orders:', error);
            toast.error('Failed to load completed orders');
        } finally {
            setLoading(false);
        }
    }, [paidPage, debouncedSuccessSearch, setSuccessOrdersCount]);

    useEffect(() => {
        fetchPaidOrders();
    }, [fetchPaidOrders]);

    // Realtime subscription for paid orders
    useEffect(() => {
        const channel = supabase
            .channel('realtime-orders-paid')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload) => {
                    const updatedOrder = payload.new as { id: string; status: string };
                    if (updatedOrder.status === 'PAID') {
                        fetchPaidOrders();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchPaidOrders]);

    const totalPaidPages = Math.ceil(totalPaidOrders / ORDER_PAGE_SIZE);

    return (
        <POSLayout title="✅ Success Orders" description={`${totalPaidOrders} completed`} showCart={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="hidden sm:block" />
                <Input
                    placeholder="Search by ID..."
                    value={successSearch}
                    onChange={(e) => { setSuccessSearch(e.target.value); setPaidPage(1); }}
                    className="w-full sm:w-48 bg-white border-slate-300"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">Loading orders...</div>
            ) : paidOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <span className="text-6xl mb-4">📋</span>
                    <p className="text-xl">No completed orders</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {paidOrders.map((order) => (
                        <SuccessOrderCard
                            key={order.id}
                            order={order}
                            onPrint={handlePrintInvoice}
                            formatPrice={formatPrice}
                            formatDateTime={formatDateTime}
                        />
                    ))}
                </div>
            )}

            {totalPaidPages > 1 && (
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                    <Button variant="outline" size="sm" onClick={() => setPaidPage((prev) => Math.max(1, prev - 1))} disabled={paidPage === 1}>
                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <span className="text-sm text-slate-600">{paidPage} / {totalPaidPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPaidPage((prev) => Math.min(totalPaidPages, prev + 1))} disabled={paidPage >= totalPaidPages}>
                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </POSLayout>
    );
}
