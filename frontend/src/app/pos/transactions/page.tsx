'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderSummary } from '@/types';
import { orderApi } from '@/lib/api';
import { POSLayout, usePOS } from '@/components/pos';
import { toast } from 'sonner';

const TRANSACTION_PAGE_SIZE = 10;

// CSV-safe date formatter (no commas that would break CSV columns)
const formatDateTimeCSV = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('id-ID', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export default function TransactionsPage() {
    const { formatPrice, formatDateTime, handlePrintInvoice } = usePOS();

    const [transactions, setTransactions] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Filters
    const [status, setStatus] = useState<string>('');

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getHistory({
                page: transactionPage,
                page_size: TRANSACTION_PAGE_SIZE,
                search: transactionSearch || undefined,
                status: status || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined
            });
            setTransactions(response.orders);
            setTotalTransactions(response.total);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [transactionPage, transactionSearch, status, dateFrom, dateTo]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleSearch = () => {
        setTransactionPage(1);
        fetchTransactions();
    }

    const clearFilter = () => {
        setTransactionSearch('');
        setStatus('');
        setDateFrom('');
        setDateTo('');
        setTransactionPage(1);
    }

    const handleExport = () => {
        if (transactions.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['Invoice ID', 'Ticket', 'Status', 'Total Amount', 'Items', 'Date'];
        const rows = transactions.map(order => [
            order.invoice_id,
            order.short_id,
            order.status,
            order.total_amount,
            order.item_count,
            formatDateTimeCSV(order.created_at)
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

    return (
        <POSLayout title="📋 Transaction History" description={`${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}`} showCart={false}>
            {/* Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                {/* export */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="gap-2 px-3 sm:px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 text-sm text-white hover:text-white"
                >
                    <Download className="w-4 h-4" />Export
                </Button>
                <div className="flex gap-2">

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by invoice ID..."
                            value={transactionSearch}
                            onChange={(e) => setTransactionSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full sm:w-48 pl-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    {/* Status Filter */}
                    <div>
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setTransactionPage(1); }}
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
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setTransactionPage(1); }}
                            className="w-full px-3 py-2 border bg-white rounded-lg text-sm"
                        />
                    </div>

                    {/* To Date */}
                    <div>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setTransactionPage(1); }}
                            className="w-full px-3 py-2 border bg-white rounded-lg text-sm"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSearch}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:text-white"
                    >
                        Search
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilter}
                        className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    >
                        Clear
                    </Button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="text-center text-slate-600">Invoice ID</TableHead>
                                <TableHead className="text-center text-slate-600">Ticket</TableHead>
                                <TableHead className="text-center text-slate-600">Status</TableHead>
                                <TableHead className="text-center text-slate-600">Total</TableHead>
                                <TableHead className="text-center text-slate-600">Items</TableHead>
                                <TableHead className="text-slate-600 text-center">Date</TableHead>
                                <TableHead className="text-slate-600 text-center">Invoice</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        Loading transactions...
                                    </TableCell>
                                </TableRow>
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No transactions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((order) => (
                                    <TableRow key={order.id} className="hover:bg-gray-50">
                                        <TableCell className="text-center font-mono text-sm text-slate-700">
                                            {order.invoice_id}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-bold text-indigo-600">{order.short_id}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`text-xs ${order.status === 'PAID' ? 'bg-green-100 text-green-800 border-green-200' :
                                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    'bg-red-100 text-red-800 border-red-200'
                                                }`}>
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-semibold text-green-600">
                                            {formatPrice(order.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-600">
                                            {order.item_count}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-600 text-sm">
                                            {formatDateTime(order.created_at)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePrintInvoice(order.id)}
                                                className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {!loading && totalTransactions > TRANSACTION_PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4 pb-4">
                    <Button variant="outline" size="sm"
                        onClick={() => setTransactionPage(prev => Math.max(1, prev - 1))}
                        disabled={transactionPage === 1}
                        className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <span className="text-sm text-slate-600">
                        {transactionPage} / {Math.ceil(totalTransactions / TRANSACTION_PAGE_SIZE)}
                    </span>
                    <Button variant="outline" size="sm"
                        onClick={() => setTransactionPage(prev => Math.min(Math.ceil(totalTransactions / TRANSACTION_PAGE_SIZE), prev + 1))}
                        disabled={transactionPage >= Math.ceil(totalTransactions / TRANSACTION_PAGE_SIZE)}
                        className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </POSLayout>
    );
}
