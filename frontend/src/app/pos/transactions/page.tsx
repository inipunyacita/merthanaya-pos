'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderSummary } from '@/types';
import { orderApi } from '@/lib/api';
import { POSLayout, usePOS } from '@/components/pos';
import { toast } from 'sonner';

const TRANSACTION_PAGE_SIZE = 10;

export default function TransactionsPage() {
    const { formatPrice, formatDateTime } = usePOS();

    const [transactions, setTransactions] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getHistory({
                page: transactionPage,
                page_size: TRANSACTION_PAGE_SIZE,
                search: transactionSearch || undefined
            });
            setTransactions(response.orders);
            setTotalTransactions(response.total);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [transactionPage, transactionSearch]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return (
        <POSLayout title="📋 Transaction History" description={`${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}`} showCart={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="hidden sm:block" /> {/* Spacer */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Search by invoice ID..."
                        value={transactionSearch}
                        onChange={(e) => { setTransactionSearch(e.target.value); setTransactionPage(1); }}
                        className="w-full sm:w-48 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTransactions}
                        className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="text-slate-600">Invoice ID</TableHead>
                                <TableHead className="text-center text-slate-600">Ticket</TableHead>
                                <TableHead className="text-center text-slate-600">Status</TableHead>
                                <TableHead className="text-right text-slate-600">Total</TableHead>
                                <TableHead className="text-center text-slate-600">Items</TableHead>
                                <TableHead className="text-slate-600">Date</TableHead>
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
                                        <TableCell className="font-mono text-sm text-slate-700">
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
                                        <TableCell className="text-right font-semibold text-green-600">
                                            {formatPrice(order.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-600">
                                            {order.item_count}
                                        </TableCell>
                                        <TableCell className="text-slate-600 text-sm">
                                            {formatDateTime(order.created_at)}
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
