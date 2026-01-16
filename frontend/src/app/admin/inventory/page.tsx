'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package,
    AlertTriangle,
    ArrowLeft,
    RefreshCw,
    Plus,
    Minus,
    Save
} from 'lucide-react';
import { inventoryApi, productApi } from '@/lib/api';
import { LowStockProduct, Product } from '@/types';
import { toast, Toaster } from 'sonner';

export default function InventoryPage() {
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(10);
    const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});
    const [reasons, setReasons] = useState<Record<string, string>>({});
    const [adjusting, setAdjusting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [lowStockRes, productsRes] = await Promise.all([
                inventoryApi.getLowStock(threshold),
                productApi.list({ active_only: true, page_size: 100 })
            ]);
            setLowStockProducts(lowStockRes.products);
            setAllProducts(productsRes.products);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
            toast.error('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [threshold]);

    const handleAdjustStock = async (productId: string) => {
        const adjustment = adjustments[productId];
        if (!adjustment || adjustment === 0) {
            toast.error('Enter a valid adjustment amount');
            return;
        }

        setAdjusting(productId);
        try {
            const result = await inventoryApi.adjustStock({
                product_id: productId,
                adjustment,
                reason: reasons[productId] || undefined
            });

            toast.success(`Stock updated: ${result.product_name} now has ${result.new_stock} units`);

            // Clear adjustment input
            setAdjustments(prev => ({ ...prev, [productId]: 0 }));
            setReasons(prev => ({ ...prev, [productId]: '' }));

            // Refresh data
            fetchData();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to adjust stock';
            toast.error(errorMessage);
        } finally {
            setAdjusting(null);
        }
    };

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStockStatus = (stock: number) => {
        if (stock <= 0) return { color: 'bg-red-100 text-red-800', label: 'Out of Stock' };
        if (stock <= 5) return { color: 'bg-red-100 text-red-800', label: 'Critical' };
        if (stock <= threshold) return { color: 'bg-yellow-100 text-yellow-800', label: 'Low' };
        return { color: 'bg-green-100 text-green-800', label: 'OK' };
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
                            <h1 className="text-2xl font-bold text-gray-900">📦 Inventory Management</h1>
                            <p className="text-sm text-gray-500">Monitor stock levels and make adjustments</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Low stock threshold:</label>
                            <input
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                className="w-20 px-2 py-1 border rounded text-sm"
                                min={0}
                            />
                        </div>
                        <button
                            onClick={fetchData}
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
                    <Link href="/admin/inventory" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
                        Inventory
                    </Link>
                    <Link href="/admin/transactions" className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
                        Transactions
                    </Link>
                </div>

                {/* Low Stock Alerts */}
                {lowStockProducts.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-semibold text-yellow-800">
                                Low Stock Alert ({lowStockProducts.length} products)
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {lowStockProducts.map(product => (
                                <span
                                    key={product.id}
                                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                                >
                                    {product.name}: {product.stock} {product.unit_type}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="bg-white rounded-xl shadow-sm p-4 border">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                    />
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Current Stock</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Adjust</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Reason</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No products found
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => {
                                    const status = getStockStatus(product.stock);
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{product.name}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{product.category}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold">{product.stock}</span>
                                                <span className="text-gray-500 text-sm ml-1">{product.unit_type}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setAdjustments(prev => ({
                                                            ...prev,
                                                            [product.id]: (prev[product.id] || 0) - 1
                                                        }))}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={adjustments[product.id] || 0}
                                                        onChange={(e) => setAdjustments(prev => ({
                                                            ...prev,
                                                            [product.id]: Number(e.target.value)
                                                        }))}
                                                        className="w-16 px-2 py-1 border rounded text-center text-sm"
                                                    />
                                                    <button
                                                        onClick={() => setAdjustments(prev => ({
                                                            ...prev,
                                                            [product.id]: (prev[product.id] || 0) + 1
                                                        }))}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    placeholder="Reason (optional)"
                                                    value={reasons[product.id] || ''}
                                                    onChange={(e) => setReasons(prev => ({
                                                        ...prev,
                                                        [product.id]: e.target.value
                                                    }))}
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleAdjustStock(product.id)}
                                                    disabled={!adjustments[product.id] || adjusting === product.id}
                                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
