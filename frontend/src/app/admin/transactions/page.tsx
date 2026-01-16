'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FileText,
    ArrowLeft,
    RefreshCw,
    Download,
    Search,
    Calendar,
    Filter
} from 'lucide-react';
import { orderApi } from '@/lib/api';
import { OrderSummary } from '@/types';
import { toast, Toaster } from 'sonner';

export default function TransactionsPage() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [status, setStatus] = useState<string>('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [search, setSearch] = useState('');

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const result = await orderApi.getHistory({
                page,
                page_size: 20,
                status: status || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                search: search || undefined
            });
            setOrders(result.orders);
            setTotalPages(result.total_pages);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page, status, dateFrom, dateTo]);

    const handleSearch = () => {
        setPage(1);
        fetchTransactions();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (orderStatus: string) => {
        switch (orderStatus) {
            case 'PAID':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const exportToCSV = () => {
        if (orders.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['Invoice ID', 'Ticket', 'Status', 'Total Amount', 'Items', 'Date'];
        const rows = orders.map(order => [
            order.invoice_id,
            order.short_id,
            order.status,
            order.total_amount,
            order.item_count,
            formatDateTime(order.created_at)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        toast.success('CSV exported successfully');
    };

    const clearFilters = () => {
        setStatus('');
        setDateFrom('');
        setDateTo('');
        setSearch('');
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" richColors />

            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📋 Transaction History</h1>
                            <p className="text-sm text-gray-500">View and export all orders</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                        <button
                            onClick={fetchTransactions}
                            disabled={loading}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Navigation */}
                <div className="flex gap-2">
                    <Link href="/admin/products" className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
                        Products
                    </Link>
                    <Link href="/admin/analytics" className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
                        Analytics
                    </Link>
                    <Link href="/admin/inventory" className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
                        Inventory
                    </Link>
                    <Link href="/admin/transactions" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
                        Transactions
                    </Link>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-4 border">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm text-gray-600 mb-1">Search Invoice ID</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="INV-20260116-001"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                                className="px-4 py-2 border rounded-lg bg-white"
                            >
                                <option value="">All Status</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                className="px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                className="px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Search className="w-4 h-4" />
                        </button>

                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Results Summary */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing {orders.length} of {total} transactions
                    </p>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Invoice ID</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Ticket</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Items</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm">{order.invoice_id}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-blue-600">{order.short_id}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600">
                                            {order.item_count}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-sm">
                                            {formatDateTime(order.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 text-sm">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
