'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import { OrderSummary, Order } from '@/types';
import { orderApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function CashierPage() {
    const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const fetchPendingOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getPending();
            setPendingOrders(response.orders);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingOrders();
    }, [fetchPendingOrders]);

    // Supabase Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('realtime-orders')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                (payload) => {
                    // New order created by Runner - add to screen
                    const newOrder = payload.new as {
                        id: string;
                        daily_id: number;
                        total_amount: number;
                        status: string;
                        created_at: string;
                    };

                    if (newOrder.status === 'PENDING') {
                        const orderSummary: OrderSummary = {
                            id: newOrder.id,
                            daily_id: newOrder.daily_id,
                            short_id: `#${newOrder.daily_id.toString().padStart(3, '0')}`,
                            total_amount: newOrder.total_amount,
                            status: 'PENDING',
                            item_count: 0, // Will be updated on refresh
                            created_at: newOrder.created_at,
                        };

                        setPendingOrders((prev) => [...prev, orderSummary]);
                        toast.info(`New order ${orderSummary.short_id} received!`, {
                            duration: 5000,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload) => {
                    // Order status changed - remove from pending if paid/cancelled
                    const updatedOrder = payload.new as { id: string; status: string };

                    if (updatedOrder.status !== 'PENDING') {
                        setPendingOrders((prev) =>
                            prev.filter((order) => order.id !== updatedOrder.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleViewDetails = async (orderId: string) => {
        try {
            const order = await orderApi.get(orderId);
            setSelectedOrder(order);
            setDetailsDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            toast.error('Failed to load order details');
        }
    };

    const handlePayOrder = async (orderId: string) => {
        try {
            setProcessing(true);
            await orderApi.pay(orderId);
            toast.success('Payment confirmed!');
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
            // Remove from local state
            setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to process payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        try {
            setProcessing(true);
            await orderApi.cancel(orderId);
            toast.success('Order cancelled');
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
            // Remove from local state
            setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to cancel order');
        } finally {
            setProcessing(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
            <Toaster richColors position="top-right" />

            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-40">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">💳 Cashier Dashboard</h1>
                            <p className="text-sm text-gray-400">
                                {pendingOrders.length} pending order{pendingOrders.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <nav className="flex gap-4">
                            <a href="/admin/products" className="px-4 py-2 text-gray-300 hover:text-white transition">Admin</a>
                            <a href="/runner" className="px-4 py-2 text-gray-300 hover:text-white transition">Runner</a>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchPendingOrders}
                                className="border-white/20 text-white hover:bg-white/10"
                            >
                                🔄 Refresh
                            </Button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        Loading pending orders...
                    </div>
                ) : pendingOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <span className="text-6xl mb-4">✨</span>
                        <p className="text-xl">No pending orders</p>
                        <p className="text-sm">Orders will appear here in real-time</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pendingOrders.map((order) => (
                            <Card
                                key={order.id}
                                className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group"
                                onClick={() => handleViewDetails(order.id)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-4xl font-bold text-emerald-400">
                                            {order.short_id}
                                        </CardTitle>
                                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                                            PENDING
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    <div className="text-3xl font-bold text-white mb-2">
                                        {formatPrice(order.total_amount)}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 border-t border-white/10">
                                    <div className="text-xs text-gray-500">
                                        Created at {formatTime(order.created_at)}
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Order Details Dialog */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/20 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-3xl text-emerald-400">
                            {selectedOrder?.short_id}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Order details and payment
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="py-4">
                            {/* Items List */}
                            <div className="space-y-2 mb-4">
                                {selectedOrder.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/10">
                                        <div>
                                            <div className="text-white">{item.product_name}</div>
                                            <div className="text-sm text-gray-400">
                                                {item.quantity} × {formatPrice(item.price_at_purchase)}
                                            </div>
                                        </div>
                                        <div className="text-green-400 font-mono">
                                            {formatPrice(item.subtotal)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Separator className="bg-white/20 my-4" />

                            {/* Total */}
                            <div className="flex justify-between items-center">
                                <span className="text-xl text-gray-400">Total</span>
                                <span className="text-3xl font-bold text-white">
                                    {formatPrice(selectedOrder.total_amount)}
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => selectedOrder && handleCancelOrder(selectedOrder.id)}
                            disabled={processing}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                            Cancel Order
                        </Button>
                        <Button
                            onClick={() => selectedOrder && handlePayOrder(selectedOrder.id)}
                            disabled={processing}
                            className="flex-1 h-12 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                            {processing ? 'Processing...' : '✅ Confirm Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
