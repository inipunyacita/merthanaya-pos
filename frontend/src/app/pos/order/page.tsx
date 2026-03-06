'use client';

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { ChevronLeft, ChevronRight, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, PRODUCT_CATEGORIES } from '@/types';
import { productApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';
import { POSLayout, usePOS } from '@/components/pos';

const PAGE_SIZE = 8;

const ProductCard = memo(function ProductCard({
    product,
    onClick,
    formatPrice
}: {
    product: Product;
    onClick: (p: Product) => void;
    formatPrice: (pr: number) => string
}) {
    return (
        <Card
            className="bg-white border-slate-200 active:scale-95 transition-transform cursor-pointer"
            onClick={() => onClick(product)}
        >
            <CardContent className="p-2 sm:p-3">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-16 sm:h-24 object-cover rounded-md mb-2"
                    />
                ) : (
                    <div className="w-full h-16 sm:h-24 bg-slate-100 rounded-md mb-2 flex items-center justify-center">
                        <span className="text-xl sm:text-2xl">📦</span>
                    </div>
                )}
                <h3 className="text-slate-800 font-medium text-[11px] sm:text-sm truncate leading-tight">{product.name}</h3>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-emerald-600 font-mono text-[11px] sm:text-sm font-bold">
                        {formatPrice(product.price)}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 h-4 border-slate-200 text-slate-500 font-normal">{product.category}</Badge>
                </div>
            </CardContent>
        </Card>
    );
});

export default function OrderPage() {
    const {
        handleProductClick,
        setScannerDialogOpen,
        formatPrice,
        store,
        getProductsLocal,
        registryLoaded
    } = usePOS();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    // Use a ref for the input to support uncontrolled access (faster on old devices)
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchProducts = useCallback(async (searchQuery?: string) => {
        const finalSearch = searchQuery !== undefined ? searchQuery : inputRef.current?.value;

        // 1. If registry is loaded, use local filtering (Sub-100ms)
        if (registryLoaded) {
            console.log('[OrderPage] Using local product index...');
            const { products: localProducts, total } = getProductsLocal({
                category: activeCategory,
                search: finalSearch,
                page: currentPage,
                page_size: PAGE_SIZE
            });
            setProducts(localProducts);
            setTotalProducts(total);
            setLoading(false);
            return;
        }

        // 2. Fallback to API if registry not yet ready
        try {
            setLoading(true);
            const params: { category?: string; search?: string; page?: number; page_size?: number } = {
                page: currentPage,
                page_size: PAGE_SIZE
            };
            if (activeCategory !== 'all') params.category = activeCategory;
            if (finalSearch) params.search = finalSearch;

            const response = await productApi.list(params);
            setProducts(response.products);
            setTotalProducts(response.total);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, activeCategory, registryLoaded, getProductsLocal]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts, registryLoaded]); // Re-run when registry loads to switch to local mode

    const handleBarcodeSearch = async (barcode: string) => {
        // Use local registry for instant lookup
        const { getProductByBarcode } = usePOS();
        const product = getProductByBarcode(barcode);

        if (product) {
            handleProductClick(product);
            // Clear input without triggering a full re-render
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        // Fallback to API only if not in registry
        try {
            const freshProduct = await productApi.getByBarcode(barcode);
            if (freshProduct) {
                handleProductClick(freshProduct);
                if (inputRef.current) inputRef.current.value = '';
            }
        } catch (error) {
            console.error('Barcode search failed:', error);
        }
    };

    // Global hardware scanner listener — bypasses text input completely
    useHardwareScanner({
        onScan: handleBarcodeSearch,
        enabled: true,
        ignoreWhenInputFocused: false,
    });

    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const val = e.currentTarget.value;
            if (val.length > 5 && /^\d+$/.test(val)) {
                handleBarcodeSearch(val);
            } else {
                setCurrentPage(1);
                fetchProducts(val);
            }
        }
    };

    return (
        <POSLayout title="🛒 New Order" description={store?.name || 'Select products'}>
            {/* Search and Scan Bar */}
            <div className="flex gap-2 mb-4">
                <Input
                    ref={inputRef}
                    placeholder="Search name or scan barcode (Enter to search)"
                    onKeyDown={handleSearchKeyPress}
                    className="flex-1 bg-white border-slate-300"
                />
                <Button variant="outline" size="sm" onClick={() => setScannerDialogOpen(true)} className="border-slate-300">
                    <ScanLine className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Scan</span>
                </Button>
            </div>

            {/* Category selection */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <Button variant={activeCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setActiveCategory('all'); setCurrentPage(1); }}>
                    All
                </Button>
                <Select value={activeCategory !== 'all' ? activeCategory : ''} onValueChange={(value) => { setActiveCategory(value); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[140px] sm:w-[180px] h-9 text-sm">
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
                        <ProductCard
                            key={product.id}
                            product={product}
                            onClick={handleProductClick}
                            formatPrice={formatPrice}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalProducts > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6 pb-4">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <span className="text-sm text-slate-600">{currentPage} / {Math.ceil(totalProducts / PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalProducts / PAGE_SIZE), prev + 1))} disabled={currentPage >= Math.ceil(totalProducts / PAGE_SIZE)}>
                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </POSLayout>
    );
}
