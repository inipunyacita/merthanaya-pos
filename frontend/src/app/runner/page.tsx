'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import { Product, CartItem, PRODUCT_CATEGORIES } from '@/types';
import { productApi, orderApi } from '@/lib/api';

export default function RunnerPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [submitting, setSubmitting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const PAGE_SIZE = 8;

    // Quantity dialog state
    const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState<string>('1');

    // Ticket dialog state
    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [lastTicket, setLastTicket] = useState<{ shortId: string; total: number } | null>(null);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: { category?: string; search?: string; page?: number; page_size?: number } = {
                page: currentPage,
                page_size: PAGE_SIZE
            };
            if (activeCategory && activeCategory !== 'all') {
                params.category = activeCategory;
            }
            if (searchTerm) {
                params.search = searchTerm;
            }
            const response = await productApi.list(params);
            setProducts(response.products);
            setTotalProducts(response.total);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [activeCategory, searchTerm, currentPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const addToCart = (product: Product, qty: number) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + qty }
                        : item
                );
            }
            return [...prev, { product, quantity: qty }];
        });
        toast.success(`Added ${product.name} to cart`);
    };

    const updateCartQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
        } else {
            setCart((prev) =>
                prev.map((item) =>
                    item.product.id === productId ? { ...item, quantity: qty } : item
                )
            );
        }
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const handleProductClick = (product: Product) => {
        if (product.unit_type === 'weight') {
            // Open quantity dialog for weight-based items
            setSelectedProduct(product);
            setQuantity('0.5');
            setQuantityDialogOpen(true);
        } else {
            // Add 1 item directly for item-based products
            addToCart(product, 1);
        }
    };

    const handleQuantitySubmit = () => {
        if (selectedProduct && parseFloat(quantity) > 0) {
            addToCart(selectedProduct, parseFloat(quantity));
            setQuantityDialogOpen(false);
            setSelectedProduct(null);
            setQuantity('1');
        }
    };

    const handleBarcodeSearch = async (barcode: string) => {
        try {
            const product = await productApi.getByBarcode(barcode);
            addToCart(product, 1);
            setSearchTerm('');
        } catch {
            toast.error('Product not found for this barcode');
        }
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.length > 5) {
            // Assume it's a barcode if longer than 5 chars and Enter pressed
            handleBarcodeSearch(searchTerm);
        }
    };

    const cartTotal = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    const handlePrintBill = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        try {
            setSubmitting(true);
            const orderData = {
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
            };

            const response = await orderApi.create(orderData);

            setLastTicket({
                shortId: response.short_id,
                total: response.total_amount,
            });
            setTicketDialogOpen(true);
            clearCart();
            toast.success(`Order ${response.short_id} created!`);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-white">
            <Toaster richColors position="top-center" />

            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <img src="/favicon.svg" className="w-6 h-6" alt="" /> <h1 className="text-xl font-bold text-slate-800 shrink-0">Runner POS</h1>

                        {/* Search Bar */}
                        <div className="flex-1 max-w-xl">
                            <Input
                                placeholder="Search or scan barcode..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                onKeyDown={handleSearchKeyPress}
                                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <nav className="flex gap-2 shrink-0">
                            {/* <a href="/admin/products" className="px-3 py-1 text-sm text-slate-600 hover:text-indigo-600 transition-colors">Admin</a> */}
                            <a href="/cashier" className="px-3 py-1 text-sm text-slate-600 hover:text-indigo-600 transition-colors">Cashier</a>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-60px)]">
                {/* Main Content - Product Grid */}
                <main className="flex-1 overflow-auto p-4">
                    {/* Category Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        <Button
                            variant={activeCategory === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setActiveCategory('all');
                                setCurrentPage(1);
                            }}
                            className={activeCategory === 'all' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600'}
                        >
                            All
                        </Button>
                        {PRODUCT_CATEGORIES.map((cat) => (
                            <Button
                                key={cat}
                                variant={activeCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setActiveCategory(cat);
                                    setCurrentPage(1);
                                }}
                                className={activeCategory === cat ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600'}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    {/* Product Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                            Loading products...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                            No products found
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {products.map((product) => (
                                <Card
                                    key={product.id}
                                    className="bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-200 cursor-pointer group"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <CardContent className="p-3">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-24 object-cover rounded-lg mb-2 group-hover:scale-105 transition"
                                            />
                                        ) : (
                                            <div className="w-full h-24 bg-linear-to-br from-indigo-100 to-purple-100 rounded-lg mb-2 flex items-center justify-center">
                                                <span className="text-3xl">📦</span>
                                            </div>
                                        )}
                                        <h3 className="text-slate-800 font-medium text-sm truncate">{product.name}</h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-green-600 font-mono text-sm font-semibold">
                                                {formatPrice(product.price)}
                                                {product.unit_type === 'weight' && '/kg'}
                                            </span>
                                            <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600 bg-indigo-50">
                                                {product.category}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!loading && totalProducts > PAGE_SIZE && (
                        <div className="flex items-center justify-center gap-4 mt-6 pb-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setCurrentPage(prev => Math.max(1, prev - 1));
                                }}
                                disabled={currentPage === 1}
                                className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <span className="text-sm text-slate-600">
                                Page {currentPage} of {Math.ceil(totalProducts / PAGE_SIZE)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setCurrentPage(prev => Math.min(Math.ceil(totalProducts / PAGE_SIZE), prev + 1));
                                }}
                                disabled={currentPage >= Math.ceil(totalProducts / PAGE_SIZE)}
                                className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </main>

                {/* Sidebar - Cart */}
                <aside className="w-80 border-l border-slate-200 bg-white/90 backdrop-blur-xl flex flex-col shadow-lg">
                    <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800">Cart</h2>
                            {cart.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearCart}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        {cart.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">
                                Cart is empty
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-slate-800 text-sm font-medium truncate flex-1">
                                                {item.product.name}
                                            </h4>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="text-slate-400 hover:text-red-500 ml-2 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - (item.product.unit_type === 'weight' ? 0.1 : 1))}
                                                >
                                                    -
                                                </Button>
                                                <span className="text-slate-800 w-12 text-center font-medium">
                                                    {item.quantity}{item.product.unit_type === 'weight' ? 'kg' : ''}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + (item.product.unit_type === 'weight' ? 0.1 : 1))}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                            <span className="text-green-600 font-mono text-sm font-semibold">
                                                {formatPrice(item.product.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Cart Footer */}
                    <div className="p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500">Total</span>
                            <span className="text-2xl font-bold text-slate-800">
                                {formatPrice(cartTotal)}
                            </span>
                        </div>
                        <Button
                            className="w-full h-14 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                            onClick={handlePrintBill}
                            disabled={cart.length === 0 || submitting}
                        >
                            {submitting ? 'Processing...' : '🖨️ Print Ticket'}
                        </Button>
                    </div>
                </aside>
            </div>

            {/* Quantity Dialog */}
            <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Enter Quantity</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {selectedProduct?.name} - {formatPrice(selectedProduct?.price || 0)}/kg
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="quantity" className="text-slate-700">Weight (kg)</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="mt-2 bg-white border-slate-300 text-slate-800 text-center text-2xl focus:border-indigo-500 focus:ring-indigo-500"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQuantityDialogOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleQuantitySubmit}
                            className="bg-linear-to-r from-green-500 to-emerald-500"
                        >
                            Add to Cart
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket Success Dialog */}
            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
                <DialogContent className="sm:max-w-[350px] bg-white border-slate-200 shadow-xl text-center">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-slate-800">✅ Ticket Created!</DialogTitle>
                    </DialogHeader>
                    <div className="py-8">
                        <div className="text-6xl font-bold text-green-600 mb-4">
                            {lastTicket?.shortId}
                        </div>
                        <Separator className="bg-slate-200 my-4" />
                        <div className="text-slate-500">Total Amount</div>
                        <div className="text-3xl font-bold text-slate-800">
                            {formatPrice(lastTicket?.total || 0)}
                        </div>
                    </div>
                    <DialogFooter className="justify-center">
                        <Button
                            onClick={() => setTicketDialogOpen(false)}
                            className="bg-linear-to-r from-indigo-500 to-purple-500"
                        >
                            New Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
