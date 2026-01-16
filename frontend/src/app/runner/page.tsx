'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ScanLine } from 'lucide-react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

    // Scanner dialog state
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

    // Ticket dialog state
    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [lastTicket, setLastTicket] = useState<{
        shortId: string;
        total: number;
        items: CartItem[];
        createdAt: Date;
    } | null>(null);

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
        // Round to 2 decimal places to fix floating-point precision issues
        const roundedQty = Math.round(qty * 100) / 100;
        if (roundedQty <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
        } else {
            setCart((prev) =>
                prev.map((item) =>
                    item.product.id === productId ? { ...item, quantity: roundedQty } : item
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

    const handleBarcodeScan = async (barcode: string) => {
        setScannerDialogOpen(false);
        try {
            const product = await productApi.getByBarcode(barcode);
            if (product) {
                handleProductClick(product);
                toast.success('Product Found', {
                    description: `Found "${product.name}"`,
                    duration: 2000,
                });
            }
        } catch {
            toast.error('Product Not Found', {
                description: `No product with code "${barcode}"`,
            });
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

            // Save cart items before clearing for the invoice display
            setLastTicket({
                shortId: response.short_id,
                total: response.total_amount,
                items: [...cart],
                createdAt: new Date(),
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
                                placeholder="Search by name or code..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                onKeyDown={handleSearchKeyPress}
                                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Scan Button */}
                        <Button
                            variant="outline"
                            onClick={() => setScannerDialogOpen(true)}
                            className="border-slate-300 text-slate-700 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600"
                        >
                            <ScanLine className="h-4 w-4 mr-2" />
                            Scan
                        </Button>

                        <nav className="flex gap-2 shrink-0">
                            {/* <a href="/admin/products" className="px-3 py-1 text-sm text-slate-600 hover:text-indigo-600 transition-colors">Admin</a> */}
                            <a href="/cashier" className="px-3 py-1 text-sm text-slate-600 hover:text-indigo-600 transition-colors">Cashier</a>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4">
                <div className="flex h-[calc(100vh-60px)]">
                    {/* Main Content - Product Grid */}
                    <main className="flex-1 overflow-auto py-4 pr-4">
                        {/* Category Tabs */}
                        <div className="flex gap-2 mb-4 items-center">
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
                            <Select
                                value={activeCategory !== 'all' ? activeCategory : ''}
                                onValueChange={(value) => {
                                    setActiveCategory(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger
                                    className={`w-[180px] h-9 text-sm ${activeCategory !== 'all'
                                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 [&_svg]:text-white'
                                        : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:border-indigo-400'
                                        }`}
                                >
                                    <SelectValue placeholder="Other Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRODUCT_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                            {product.barcode && (
                                                <div className="text-xs text-slate-400 font-mono truncate">{product.barcode}</div>
                                            )}
                                            <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600 bg-indigo-50 mt-1">
                                                {product.category}
                                            </Badge>
                                            <div className="mt-1">
                                                <span className="text-green-600 font-mono text-sm font-semibold">
                                                    {formatPrice(product.price)}
                                                    {product.unit_type === 'weight' ? (
                                                        <span className="text-gray-500">/kg</span>
                                                    ) : product.unit_type === 'pcs' ? (
                                                        <span className="text-gray-500">/pcs</span>
                                                    ) : (
                                                        <span className="text-gray-500">/item</span>
                                                    )}
                                                </span>
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
                    <aside className="w-80 border-l border-slate-200 bg-white/90 backdrop-blur-xl flex flex-col shadow-lg h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-200 shrink-0">
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

                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-4">
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
                                                            {item.quantity}{item.product.unit_type === 'weight' ? (
                                                                <span className="text-gray-500"> kg</span>
                                                            ) : item.product.unit_type === 'pcs' ? (
                                                                <span className="text-gray-500"> pcs</span>
                                                            ) : (
                                                                <span className="text-gray-500"> item</span>
                                                            )}
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
                            </div>
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

            {/* Ticket Success Dialog - Invoice Style */}
            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white border-slate-200 shadow-xl p-0 overflow-hidden">
                    {/* Visually hidden title for accessibility */}
                    <DialogTitle className="sr-only">Order Ticket {lastTicket?.shortId}</DialogTitle>
                    {/* Invoice Header */}
                    <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white p-4 text-center">
                        <div className="text-xs uppercase tracking-wider opacity-80">Order Ticket</div>
                        <div className="text-4xl font-bold mt-1">{lastTicket?.shortId}</div>
                        <div className="text-xs opacity-70 mt-2">
                            {lastTicket?.createdAt?.toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4">
                        <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Order Details</div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {lastTicket?.items.map((item) => (
                                <div key={item.product.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-800">{item.product.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {item.quantity} {item.product.unit_type === 'weight' ? 'kg' : item.product.unit_type === 'pcs' ? 'pcs' : 'item'} × {formatPrice(item.product.price)}
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800">
                                        {formatPrice(item.product.price * item.quantity)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Section */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total ({lastTicket?.items.length || 0} items)</span>
                            <span className="text-2xl font-bold text-green-600">
                                {formatPrice(lastTicket?.total || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 pt-0">
                        <Button
                            onClick={() => setTicketDialogOpen(false)}
                            className="w-full bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                        >
                            ✓ Done - New Order
                        </Button>
                        <p className="text-center text-xs text-slate-400 mt-2">Present this ticket to cashier for payment</p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Barcode Scanner Dialog */}
            <Dialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen}>
                <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 flex items-center gap-2">
                            <ScanLine className="h-5 w-5 text-indigo-600" />
                            Scan Product Barcode
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Point your camera at a product barcode to add it to cart
                        </DialogDescription>
                    </DialogHeader>
                    <BarcodeScanner
                        onScanSuccess={handleBarcodeScan}
                        onClose={() => setScannerDialogOpen(false)}
                        autoStart
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
