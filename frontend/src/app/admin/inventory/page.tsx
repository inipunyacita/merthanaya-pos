'use client';

import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Plus,
    Minus,
    Save,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { inventoryApi, productApi } from '@/lib/api';
import { LowStockProduct, Product } from '@/types';
import { toast, Toaster } from 'sonner';
import { AdminLayout } from '@/components/admin';

export default function InventoryPage() {
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(10);
    const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});
    const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
    const [adjusting, setAdjusting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    const handleSaveChanges = async (product: Product) => {
        const stockAdjustment = adjustments[product.id] || 0;
        const newPrice = priceChanges[product.id];
        const hasStockChange = stockAdjustment !== 0;
        const hasPriceChange = newPrice !== undefined && newPrice !== product.price;

        if (!hasStockChange && !hasPriceChange) {
            toast.error('No changes to save');
            return;
        }

        setAdjusting(product.id);
        try {
            const messages: string[] = [];

            // Update price if changed
            if (hasPriceChange) {
                await productApi.update(product.id, { price: newPrice });
                messages.push(`Price updated to Rp ${newPrice.toLocaleString('id-ID')}`);
            }

            // Update stock if changed
            if (hasStockChange) {
                const result = await inventoryApi.adjustStock({
                    product_id: product.id,
                    adjustment: stockAdjustment,
                });
                messages.push(`Stock: ${result.new_stock} units`);
            }

            toast.success(`${product.name} updated`, {
                description: messages.join(' | '),
                duration: 3000,
            });

            // Clear inputs
            setAdjustments(prev => ({ ...prev, [product.id]: 0 }));
            setPriceChanges(prev => {
                const updated = { ...prev };
                delete updated[product.id];
                return updated;
            });

            // Refresh data
            fetchData();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
            toast.error(errorMessage);
        } finally {
            setAdjusting(null);
        }
    };

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
    );

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Calculate paginated products
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    const getStockStatus = (stock: number) => {
        if (stock <= 0) return { color: 'bg-red-100 text-red-800', label: 'Out of Stock' };
        if (stock <= 5) return { color: 'bg-red-100 text-red-800', label: 'Critical' };
        if (stock <= threshold) return { color: 'bg-yellow-100 text-yellow-800', label: 'Low' };
        return { color: 'bg-green-100 text-green-800', label: 'OK' };
    };

    return (
        <AdminLayout title="📦 Inventory Management" description="Monitor stock levels and make adjustments">
            <Toaster position="top-right" richColors expand visibleToasts={5} />

            {/* Controls - Responsive */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Low stock:</label>
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-16 px-2 py-1 border rounded text-sm"
                        min={0}
                    />
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg border"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
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
            <div className="bg-white rounded-xl shadow-sm p-4 border mb-6">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                />
            </div>

            {/* Products Table - Scrollable on mobile */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Code</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Current Stock</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Adjust</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Price (Rp)</th>
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
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No products found
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map(product => {
                                    const status = getStockStatus(product.stock);
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{product.barcode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{product.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold">{product.stock}</span>
                                                <span className="text-gray-500 text-sm ml-1">{product.unit_type === 'weight' ? 'kg' : (product.unit_type === 'item' ? 'item' : (product.unit_type === 'pcs' ? 'pcs' : ''))}</span>
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
                                                    type="number"
                                                    placeholder={Math.round(product.price).toLocaleString('id-ID')}
                                                    value={priceChanges[product.id] !== undefined ? Math.round(priceChanges[product.id]) : ''}
                                                    onChange={(e) => setPriceChanges(prev => ({
                                                        ...prev,
                                                        [product.id]: e.target.value ? Math.round(Number(e.target.value)) : product.price
                                                    }))}
                                                    className="w-28 px-2 py-1 border rounded text-sm text-right"
                                                    min={0}
                                                    step={500}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleSaveChanges(product)}
                                                    disabled={(!adjustments[product.id] && !priceChanges[product.id]) || adjusting === product.id}
                                                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500 order-2 sm:order-1">
                    Showing {filteredProducts.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 flex-wrap justify-center">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Previous</span>
                        </button>
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`min-w-8 px-3 py-1.5 rounded-lg text-sm ${currentPage === page
                                        ? 'bg-purple-600 text-white'
                                        : 'border text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
