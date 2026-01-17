'use client';

import { useState, useEffect } from 'react';
import {
    RefreshCw,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { orderApi } from '@/lib/api';
import { OrderSummary } from '@/types';
import { toast, Toaster } from 'sonner';
import { AdminLayout } from '@/components/admin';

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
                page_size: 10,
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
        <AdminLayout title="📋 Transaction History" description="View and export all orders">
            <Toaster position="top-right" richColors />

            {/* Controls - Responsive */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                    <span className="sm:hidden">CSV</span>
                </button>
                <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg border"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filters - Responsive Grid */}
            <div className="bg-white rounded-xl shadow-sm p-4 border mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Search - Full width on mobile */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Search Invoice ID</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="INV-20260116-001"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                        >
                            <option value="">All</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* From Date */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    {/* To Date */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 items-end">
                        <button
                            onClick={handleSearch}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                            Search
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                    Showing {orders.length} of {total} transactions
                </p>
            </div>

            {/* Transactions Table - Scrollable on mobile */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
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
            </div>

            {/* Pagination - Responsive */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                        {/* Previous Button */}
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Previous</span>
                        </button>

                        {/* Numbered Page Buttons */}
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`min-w-[36px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${page === pageNum
                                            ? 'bg-blue-600 text-white'
                                            : 'border hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            ))}
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
