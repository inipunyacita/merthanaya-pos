'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, PRODUCT_CATEGORIES } from '@/types';
import { productApi } from '@/lib/api';
import { POSLayout, usePOS } from '@/components/pos';

const PAGE_SIZE = 8;

export default function OrderPage() {
    const {
        handleProductClick,
        setScannerDialogOpen,
        formatPrice,
        store,
        loading: globalLoading,
        setLoading: setGlobalLoading,
    } = usePOS();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: { category?: string; search?: string; page?: number; page_size?: number } = {
                page: currentPage,
                page_size: PAGE_SIZE
            };
            if (activeCategory !== 'all') params.category = activeCategory;
            if (searchTerm) params.search = searchTerm;
            const response = await productApi.list(params);
            setProducts(response.products);
            setTotalProducts(response.total);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, activeCategory, searchTerm]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleBarcodeSearch = async (barcode: string) => {
        try {
            const product = await productApi.getByBarcode(barcode);
            handleProductClick(product);
            setSearchTerm('');
        } catch {
            // Product not found - will be handled by toast in context
        }
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.length > 5) handleBarcodeSearch(searchTerm);
    };

    return (
        <POSLayout title="🛒 New Order" description={store?.name || 'Select products to add to cart'}>
            {/* Search and Scan Bar */}
            <div className="flex gap-2 mb-4">
                <Input
                    placeholder="Search by name or scan barcode..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    onKeyDown={handleSearchKeyPress}
                    className="flex-1 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <Button variant="outline" size="sm" onClick={() => setScannerDialogOpen(true)}
                    className="border-slate-300 text-slate-700 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600">
                    <ScanLine className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Scan</span>
                </Button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 items-center overflow-x-auto pb-2">
                <Button variant={activeCategory === 'all' ? 'default' : 'outline'} size="sm"
                    onClick={() => { setActiveCategory('all'); setCurrentPage(1); }}
                    className={`shrink-0 ${activeCategory === 'all' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600'}`}>
                    All
                </Button>
                <Select value={activeCategory !== 'all' ? activeCategory : ''} onValueChange={(value) => { setActiveCategory(value); setCurrentPage(1); }}>
                    <SelectTrigger className={`w-[140px] sm:w-[180px] h-9 text-sm shrink-0 ${activeCategory !== 'all' ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 [&_svg]:text-white' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:border-indigo-400'}`}>
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {PRODUCT_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">Loading products...</div>
            ) : products.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500">No products found</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {products.map((product) => (
                        <Card key={product.id} className="bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-200 cursor-pointer group" onClick={() => handleProductClick(product)}>
                            <CardContent className="p-2 sm:p-3">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-full h-16 sm:h-24 object-cover rounded-lg mb-2 group-hover:scale-105 transition" />
                                ) : (
                                    <div className="w-full h-16 sm:h-24 bg-linear-to-br from-indigo-100 to-purple-100 rounded-lg mb-2 flex items-center justify-center">
                                        <span className="text-2xl sm:text-3xl">📦</span>
                                    </div>
                                )}
                                <h3 className="text-slate-800 font-medium text-xs sm:text-sm truncate">{product.name}</h3>
                                <Badge variant="outline" className="text-[10px] sm:text-xs border-indigo-300 text-indigo-600 bg-indigo-50 mt-1">{product.category}</Badge>
                                <div className="mt-1">
                                    <span className="text-green-600 font-mono text-xs sm:text-sm font-semibold">
                                        {formatPrice(product.price)}
                                        {product.unit_type === 'weight' ? <span className="text-gray-500">/kg</span> : product.unit_type === 'pcs' ? <span className="text-gray-500">/pcs</span> : <span className="text-gray-500">/item</span>}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalProducts > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6 pb-4">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <span className="text-sm text-slate-600">{currentPage} / {Math.ceil(totalProducts / PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalProducts / PAGE_SIZE), prev + 1))} disabled={currentPage >= Math.ceil(totalProducts / PAGE_SIZE)} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </POSLayout>
    );
}
