'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, CheckCircle, Printer, Menu, X } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster, toast } from 'sonner';
import { OrderSummary, Order } from '@/types';
import { orderApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type ViewType = 'pending' | 'success';

export default function CashierPage() {
    // View state
    const [activeView, setActiveView] = useState<ViewType>('pending');

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Pending orders state
    const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([]);
    const [pendingPage, setPendingPage] = useState(1);

    // Success orders state
    const [paidOrders, setPaidOrders] = useState<OrderSummary[]>([]);
    const [paidPage, setPaidPage] = useState(1);
    const [totalPaidPages, setTotalPaidPages] = useState(1);
    const [totalPaidOrders, setTotalPaidOrders] = useState(0);

    // Common state
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const PAGE_SIZE = 6;

    const fetchPendingOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getPending();
            setPendingOrders(response.orders);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load pending orders');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPaidOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getPaid(paidPage, PAGE_SIZE);
            setPaidOrders(response.orders);
            setTotalPaidPages(response.total_pages);
            setTotalPaidOrders(response.total);
        } catch (error) {
            console.error('Failed to fetch paid orders:', error);
            toast.error('Failed to load success orders');
        } finally {
            setLoading(false);
        }
    }, [paidPage]);

    useEffect(() => {
        if (activeView === 'pending') {
            fetchPendingOrders();
        } else {
            fetchPaidOrders();
        }
    }, [activeView, fetchPendingOrders, fetchPaidOrders]);

    // Supabase Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('realtime-orders')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                (payload) => {
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
                            invoice_id: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${newOrder.daily_id.toString().padStart(3, '0')}`,
                            total_amount: newOrder.total_amount,
                            status: 'PENDING',
                            item_count: 0,
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
                    const updatedOrder = payload.new as { id: string; status: string };

                    if (updatedOrder.status !== 'PENDING') {
                        setPendingOrders((prev) =>
                            prev.filter((order) => order.id !== updatedOrder.id)
                        );

                        // Refresh paid orders if on success view
                        if (updatedOrder.status === 'PAID' && activeView === 'success') {
                            fetchPaidOrders();
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeView, fetchPaidOrders]);

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

    const handlePrintInvoice = async (orderId: string) => {
        try {
            const order = await orderApi.get(orderId);
            setSelectedOrder(order);
            setInvoiceDialogOpen(true);
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
            setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to cancel order');
        } finally {
            setProcessing(false);
        }
    };

    const handlePrint = () => {
        window.print();
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

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    // Pagination for pending orders (client-side)
    const pendingTotalPages = Math.ceil(pendingOrders.length / PAGE_SIZE);
    const paginatedPendingOrders = pendingOrders.slice(
        (pendingPage - 1) * PAGE_SIZE,
        pendingPage * PAGE_SIZE
    );

    const handleViewChange = (view: ViewType) => {
        setActiveView(view);
        if (view === 'pending') {
            setPendingPage(1);
        } else {
            setPaidPage(1);
        }
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50 to-white">
            <Toaster richColors position="top-right" />

            {/* Mobile Header */}
            <header className="lg:hidden border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">
                        {activeView === 'pending' ? '📋 Pending' : '✅ Success'}
                    </h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={activeView === 'pending' ? fetchPendingOrders : fetchPaidOrders}
                        className="border-slate-300"
                    >
                        🔄
                    </Button>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex min-h-screen lg:h-screen">
                {/* Left Sidebar - Desktop always visible, Mobile slides in */}
                <aside className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-56 bg-white border-r border-slate-200 flex flex-col shadow-sm
                    transform transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-800">💳 Cashier</h1>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <nav className="flex-1 p-3 space-y-1">
                        <button
                            onClick={() => handleViewChange('pending')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeView === 'pending'
                                ? 'bg-emerald-100 text-emerald-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <ClipboardList className="h-5 w-5" />
                            <span className="flex-1">Pending</span>
                            {pendingOrders.length > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                    {pendingOrders.length}
                                </Badge>
                            )}
                        </button>
                        <button
                            onClick={() => handleViewChange('success')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeView === 'success'
                                ? 'bg-emerald-100 text-emerald-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <CheckCircle className="h-5 w-5" />
                            <span className="flex-1">Success</span>
                            {totalPaidOrders > 0 && (
                                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                                    {totalPaidOrders}
                                </Badge>
                            )}
                        </button>
                    </nav>
                    <div className="p-3 border-t border-slate-200">
                        <nav className="space-y-1 text-sm">
                            <a href="/runner" className="block px-4 py-2 text-slate-500 hover:text-emerald-600 transition">
                                → Runner
                            </a>
                            <a href="/admin/products" className="block px-4 py-2 text-slate-500 hover:text-emerald-600 transition">
                                → Admin
                            </a>
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Desktop Header */}
                    <header className="hidden lg:block border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
                        <div className="px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {activeView === 'pending' ? '📋 Pending Orders' : '✅ Success Orders'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {activeView === 'pending'
                                        ? `${pendingOrders.length} pending order${pendingOrders.length !== 1 ? 's' : ''}`
                                        : `${totalPaidOrders} completed order${totalPaidOrders !== 1 ? 's' : ''}`
                                    }
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={activeView === 'pending' ? fetchPendingOrders : fetchPaidOrders}
                                className="border-slate-300 text-slate-700 bg-white hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-600"
                            >
                                🔄 Refresh
                            </Button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-auto p-4 sm:p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64 text-slate-500">
                                Loading orders...
                            </div>
                        ) : activeView === 'pending' ? (
                            /* Pending Orders View */
                            <>
                                {paginatedPendingOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                        <span className="text-6xl mb-4">✨</span>
                                        <p className="text-xl">No pending orders</p>
                                        <p className="text-sm">Orders will appear here in real-time</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {paginatedPendingOrders.map((order) => (
                                            <Card
                                                key={order.id}
                                                className="bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-200 cursor-pointer"
                                                onClick={() => handleViewDetails(order.id)}
                                            >
                                                <CardHeader className="pb-2 p-3 sm:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-2xl sm:text-4xl font-bold text-emerald-600">
                                                                {order.short_id}
                                                            </CardTitle>
                                                            <div className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">{order.invoice_id}</div>
                                                        </div>
                                                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                                            PENDING
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pb-2 p-3 sm:p-6 pt-0">
                                                    <div className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">
                                                        {formatPrice(order.total_amount)}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="pt-2 border-t border-slate-200 p-3 sm:p-6">
                                                    <div className="text-xs text-slate-400">
                                                        Created at {formatTime(order.created_at)}
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination for pending orders */}
                                {pendingTotalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))}
                                            disabled={pendingPage === 1}
                                            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            <span className="hidden sm:inline ml-1">Previous</span>
                                        </Button>
                                        <span className="text-sm text-slate-600">
                                            {pendingPage} / {pendingTotalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))}
                                            disabled={pendingPage >= pendingTotalPages}
                                            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <span className="hidden sm:inline mr-1">Next</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Success Orders View */
                            <>
                                {paidOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                        <span className="text-6xl mb-4">📋</span>
                                        <p className="text-xl">No completed orders</p>
                                        <p className="text-sm">Completed orders will appear here</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {paidOrders.map((order) => (
                                            <Card
                                                key={order.id}
                                                className="bg-white border-slate-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-100 transition-all duration-200"
                                            >
                                                <CardHeader className="pb-2 p-3 sm:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-2xl sm:text-4xl font-bold text-green-600">
                                                                {order.short_id}
                                                            </CardTitle>
                                                            <div className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">{order.invoice_id}</div>
                                                        </div>
                                                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                                                            PAID
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pb-2 p-3 sm:p-6 pt-0">
                                                    <div className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">
                                                        {formatPrice(order.total_amount)}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="pt-2 border-t border-slate-200 flex justify-between items-center p-3 sm:p-6">
                                                    <div className="text-xs text-slate-400">
                                                        {formatDateTime(order.created_at)}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePrintInvoice(order.id)}
                                                        className="border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
                                                    >
                                                        <Printer className="h-4 w-4 sm:mr-1" />
                                                        <span className="hidden sm:inline">Invoice</span>
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination for success orders */}
                                {totalPaidPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPaidPage((prev) => Math.max(1, prev - 1))}
                                            disabled={paidPage === 1}
                                            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            <span className="hidden sm:inline ml-1">Previous</span>
                                        </Button>
                                        <span className="text-sm text-slate-600">
                                            {paidPage} / {totalPaidPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPaidPage((prev) => Math.min(totalPaidPages, prev + 1))}
                                            disabled={paidPage >= totalPaidPages}
                                            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <span className="hidden sm:inline mr-1">Next</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>

            {/* Order Details Dialog (for pending orders) */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[500px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-3xl text-emerald-600">
                            {selectedOrder?.short_id}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Order details and payment
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="py-4">
                            <div className="space-y-2 mb-4">
                                {selectedOrder.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <div>
                                            <div className="text-slate-800">{item.product_name}</div>
                                            <div className="text-sm text-slate-500">
                                                {item.quantity} × {formatPrice(item.price_at_purchase)}
                                            </div>
                                        </div>
                                        <div className="text-green-600 font-mono font-semibold">
                                            {formatPrice(item.subtotal)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Separator className="bg-slate-200 my-4" />

                            <div className="flex justify-between items-center">
                                <span className="text-xl text-slate-600">Total</span>
                                <span className="text-3xl font-bold text-slate-800">
                                    {formatPrice(selectedOrder.total_amount)}
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => selectedOrder && handleCancelOrder(selectedOrder.id)}
                            disabled={processing}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        >
                            Cancel Order
                        </Button>
                        <Button
                            onClick={() => selectedOrder && handlePayOrder(selectedOrder.id)}
                            disabled={processing}
                            className="flex-1 h-12 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                            {processing ? 'Processing...' : '✅ Confirm Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invoice Dialog (for printing) */}
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[400px] bg-white border-slate-200 shadow-xl p-0 overflow-hidden print:shadow-none print:border-none">
                    <DialogTitle className="sr-only">Invoice {selectedOrder?.short_id}</DialogTitle>

                    {/* Invoice Header */}
                    <div className="bg-linear-to-r from-emerald-600 to-green-600 text-white p-4 text-center print:bg-white print:text-black">
                        <div className="text-xs uppercase tracking-wider opacity-80 print:opacity-100">Invoice</div>
                        <div className="text-4xl font-bold mt-1">{selectedOrder?.short_id}</div>
                        <div className="text-sm font-mono mt-1 opacity-90">{selectedOrder?.invoice_id}</div>
                        <div className="text-xs opacity-70 mt-2 print:opacity-100">
                            {selectedOrder && formatDateTime(selectedOrder.created_at)}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4">
                        <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Order Details</div>
                        <ScrollArea className="max-h-48">
                            <div className="space-y-2">
                                {selectedOrder?.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-800">{item.product_name}</div>
                                            <div className="text-xs text-slate-500">
                                                {item.quantity} × {formatPrice(item.price_at_purchase)}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-800">
                                            {formatPrice(item.subtotal)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Total Section */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total ({selectedOrder?.items.length || 0} items)</span>
                            <span className="text-2xl font-bold text-green-600">
                                {formatPrice(selectedOrder?.total_amount || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 pt-0 flex gap-2 print:hidden">
                        <Button
                            variant="outline"
                            onClick={() => setInvoiceDialogOpen(false)}
                            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handlePrint}
                            className="flex-1 bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
