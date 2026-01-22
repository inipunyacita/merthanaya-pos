'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, ScanLine, Printer,
    ShoppingCart, X, Menu, ClipboardList, CheckCircle, Package,
    Plus, Pencil, Power, PowerOff, Trash2
} from 'lucide-react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import { Product, ProductCreate, ProductUpdate, CartItem, OrderSummary, Order, PRODUCT_CATEGORIES } from '@/types';
import { productApi, orderApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type ViewType = 'products' | 'pending' | 'success' | 'manageproduct';

export default function POSPage() {
    // === VIEW STATE ===
    const [activeView, setActiveView] = useState<ViewType>('products');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);

    // === PRODUCT STATE (from Runner) ===
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [submitting, setSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const PAGE_SIZE = 8;

    // Quantity dialog state
    const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState<string>('1');
    const [quantityInputMode, setQuantityInputMode] = useState<'weight' | 'nominal'>('weight');
    const [nominalAmount, setNominalAmount] = useState<string>('');

    // Scanner dialog state
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

    // Ticket dialog state
    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [lastTicket, setLastTicket] = useState<{
        shortId: string;
        invoiceId: string;
        total: number;
        items: CartItem[];
        createdAt: Date;
    } | null>(null);

    // === ORDER STATE (from Cashier) ===
    const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([]);
    const [pendingPage, setPendingPage] = useState(1);
    const [paidOrders, setPaidOrders] = useState<OrderSummary[]>([]);
    const [paidPage, setPaidPage] = useState(1);
    const [totalPaidPages, setTotalPaidPages] = useState(1);
    const [totalPaidOrders, setTotalPaidOrders] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const ORDER_PAGE_SIZE = 6;

    // === SEARCH STATE ===
    const [pendingSearch, setPendingSearch] = useState('');
    const [successSearch, setSuccessSearch] = useState('');
    const [manageSearch, setManageSearch] = useState('');

    // === MANAGE PRODUCT STATE ===
    const [managedProducts, setManagedProducts] = useState<Product[]>([]);
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productPage, setProductPage] = useState(1);
    const [totalManagedProducts, setTotalManagedProducts] = useState(0);
    const MANAGE_PAGE_SIZE = 8;
    const [formData, setFormData] = useState<ProductCreate>({
        name: '',
        category: 'Sembako',
        price: 0,
        stock: 0,
        barcode: null,
        image_url: null,
        unit_type: 'item',
        is_active: true,
    });
    const [productScannerOpen, setProductScannerOpen] = useState(false);

    // === FETCH FUNCTIONS ===
    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: { category?: string; search?: string; page?: number; page_size?: number } = {
                page: currentPage,
                page_size: PAGE_SIZE
            };
            if (activeCategory && activeCategory !== 'all') params.category = activeCategory;
            if (searchTerm) params.search = searchTerm;
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

    const fetchPendingOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getPending();
            setPendingOrders(response.orders);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load pending orders');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPaidOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await orderApi.getPaid(paidPage, ORDER_PAGE_SIZE);
            setPaidOrders(response.orders);
            setTotalPaidPages(response.total_pages);
            setTotalPaidOrders(response.total);
        } catch (error) {
            console.error('Failed to fetch paid orders:', error);
            toast.error('Failed to load success orders');
        } finally {
            setLoading(false);
        }
    }, [paidPage]);

    const fetchManagedProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: { page?: number; page_size?: number; active_only?: boolean; search?: string } = {
                page: productPage,
                page_size: MANAGE_PAGE_SIZE,
                active_only: false,
            };
            if (manageSearch) params.search = manageSearch;
            const response = await productApi.list(params);
            setManagedProducts(response.products);
            setTotalManagedProducts(response.total);
        } catch (error) {
            console.error('Failed to fetch managed products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [productPage, manageSearch]);

    // === EFFECTS ===
    useEffect(() => {
        if (activeView === 'products') fetchProducts();
        else if (activeView === 'pending') fetchPendingOrders();
        else if (activeView === 'success') fetchPaidOrders();
        else if (activeView === 'manageproduct') fetchManagedProducts();
    }, [activeView, fetchProducts, fetchPendingOrders, fetchPaidOrders, fetchManagedProducts]);

    // Realtime subscription for orders
    useEffect(() => {
        const channel = supabase
            .channel('realtime-orders-pos')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
                (payload) => {
                    const newOrder = payload.new as {
                        id: string; daily_id: number; total_amount: number; status: string; created_at: string;
                    };
                    if (newOrder.status === 'PENDING') {
                        const orderSummary: OrderSummary = {
                            id: newOrder.id,
                            daily_id: newOrder.daily_id,
                            short_id: `#${newOrder.daily_id.toString().padStart(3, '0')}`,
                            invoice_id: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${newOrder.daily_id.toString().padStart(3, '0')}`,
                            total_amount: newOrder.total_amount,
                            status: 'PENDING',
                            item_count: 0,
                            created_at: newOrder.created_at,
                        };
                        setPendingOrders((prev) => [...prev, orderSummary]);
                        toast.info(`New order ${orderSummary.short_id} received!`, { duration: 5000 });
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload) => {
                    const updatedOrder = payload.new as { id: string; status: string };
                    if (updatedOrder.status !== 'PENDING') {
                        setPendingOrders((prev) => prev.filter((order) => order.id !== updatedOrder.id));
                        if (updatedOrder.status === 'PAID' && activeView === 'success') fetchPaidOrders();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeView, fetchPaidOrders]);

    // === CART FUNCTIONS ===
    const addToCart = (product: Product, qty: number) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item
                );
            }
            return [...prev, { product, quantity: qty }];
        });
        toast.success(`Added ${product.name} to cart`);
    };

    const updateCartQuantity = (productId: string, qty: number) => {
        const roundedQty = Math.round(qty * 100) / 100;
        if (roundedQty <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
        } else {
            setCart((prev) => prev.map((item) =>
                item.product.id === productId ? { ...item, quantity: roundedQty } : item
            ));
        }
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const clearCart = () => setCart([]);

    const handleProductClick = (product: Product) => {
        if (product.unit_type === 'weight') {
            setSelectedProduct(product);
            setQuantity('0.5');
            setNominalAmount('');
            setQuantityInputMode('weight');
            setQuantityDialogOpen(true);
        } else {
            addToCart(product, 1);
        }
    };

    const handleQuantitySubmit = () => {
        if (!selectedProduct) return;

        let qty = 0;
        if (quantityInputMode === 'weight') {
            qty = parseFloat(quantity);
        } else {
            // Calculate weight from nominal amount
            const nominal = parseFloat(nominalAmount);
            if (nominal > 0 && selectedProduct.price > 0) {
                qty = nominal / selectedProduct.price;
                // Round to 2 decimal places
                qty = Math.round(qty * 100) / 100;
            }
        }

        if (qty > 0) {
            addToCart(selectedProduct, qty);
            setQuantityDialogOpen(false);
            setSelectedProduct(null);
            setQuantity('1');
            setNominalAmount('');
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
                toast.success('Product Found', { description: `Found "${product.name}"`, duration: 2000 });
            }
        } catch {
            toast.error('Product Not Found', { description: `No product with code "${barcode}"` });
        }
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.length > 5) handleBarcodeSearch(searchTerm);
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const handlePrintBill = async () => {
        if (cart.length === 0) { toast.error('Cart is empty'); return; }
        try {
            setSubmitting(true);
            const orderData = { items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })) };
            const response = await orderApi.create(orderData);
            setLastTicket({
                shortId: response.short_id,
                invoiceId: response.invoice_id,
                total: response.total_amount,
                items: [...cart],
                createdAt: new Date(),
            });
            setTicketDialogOpen(true);
            setCartOpen(false);
            clearCart();
            toast.success(`Order ${response.short_id} created!`);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    // === ORDER FUNCTIONS ===
    const handleViewDetails = async (orderId: string) => {
        try {
            const order = await orderApi.get(orderId);
            setSelectedOrder(order);
            setDetailsDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            toast.error('Failed to load order details');
        }
    };

    const handlePrintInvoice = async (orderId: string) => {
        try {
            const order = await orderApi.get(orderId);
            setSelectedOrder(order);
            setInvoiceDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            toast.error('Failed to load order details');
        }
    };

    const handlePayOrder = async (orderId: string) => {
        try {
            setProcessing(true);
            await orderApi.pay(orderId);
            toast.success('Payment confirmed!');
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
            setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to process payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;
        try {
            setProcessing(true);
            await orderApi.cancel(orderId);
            toast.success('Order cancelled');
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
            setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to cancel order');
        } finally {
            setProcessing(false);
        }
    };

    // === HELPER FUNCTIONS ===
    // Manual formatting to avoid hydration mismatch between server/client
    const formatPrice = (price: number) => {
        const rounded = Math.round(price);
        const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `Rp ${formatted}`;
    };
    const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

    // Smart date formatting for pending orders
    const formatSmartDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const time = formatTime(dateString);

        if (orderDate.getTime() === today.getTime()) {
            return `Created Today at ${time}`;
        } else if (orderDate.getTime() === yesterday.getTime()) {
            return `Created Yesterday at ${time}`;
        } else {
            return `Created at ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${time}`;
        }
    };

    const pendingTotalPages = Math.ceil(pendingOrders.length / ORDER_PAGE_SIZE);

    // Filter and sort pending orders by search (newest first)
    const filteredPendingOrders = pendingOrders
        .filter(order =>
            !pendingSearch ||
            order.short_id.toLowerCase().includes(pendingSearch.toLowerCase()) ||
            order.invoice_id?.toLowerCase().includes(pendingSearch.toLowerCase())
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const paginatedPendingOrders = filteredPendingOrders.slice((pendingPage - 1) * ORDER_PAGE_SIZE, pendingPage * ORDER_PAGE_SIZE);

    // Filter and sort paid orders by search (newest first)
    const filteredPaidOrders = paidOrders
        .filter(order =>
            !successSearch ||
            order.short_id.toLowerCase().includes(successSearch.toLowerCase()) ||
            order.invoice_id?.toLowerCase().includes(successSearch.toLowerCase())
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const managedTotalPages = Math.ceil(totalManagedProducts / MANAGE_PAGE_SIZE);

    const handleViewChange = (view: ViewType) => {
        setActiveView(view);
        if (view === 'pending') setPendingPage(1);
        else if (view === 'success') setPaidPage(1);
        else if (view === 'manageproduct') setProductPage(1);
        else setCurrentPage(1);
        setSidebarOpen(false);
    };

    // === PRODUCT MANAGEMENT FUNCTIONS ===
    const resetProductForm = () => {
        setFormData({
            name: '',
            category: 'Sembako',
            price: 0,
            stock: 0,
            barcode: null,
            image_url: null,
            unit_type: 'item',
            is_active: true,
        });
        setEditingProduct(null);
    };

    const openProductDialog = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                category: product.category,
                price: product.price,
                stock: product.stock,
                barcode: product.barcode,
                image_url: product.image_url,
                unit_type: product.unit_type,
                is_active: product.is_active,
            });
        } else {
            resetProductForm();
        }
        setProductDialogOpen(true);
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                const updateData: ProductUpdate = { ...formData };
                await productApi.update(editingProduct.id, updateData);
                toast.success('Product Updated', { description: `"${formData.name}" updated successfully` });
            } else {
                await productApi.create(formData);
                toast.success('Product Created', { description: `"${formData.name}" added to inventory` });
            }
            setProductDialogOpen(false);
            resetProductForm();
            fetchManagedProducts();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to save product');
        }
    };

    const handleDeactivateProduct = async (product: Product) => {
        if (!confirm(`Deactivate "${product.name}"?`)) return;
        try {
            await productApi.delete(product.id);
            toast.success('Product Deactivated');
            fetchManagedProducts();
        } catch (error) {
            console.error('Failed to deactivate:', error);
            toast.error('Failed to deactivate product');
        }
    };

    const handleReactivateProduct = async (product: Product) => {
        if (!confirm(`Reactivate "${product.name}"?`)) return;
        try {
            await productApi.update(product.id, { is_active: true });
            toast.success('Product Reactivated');
            fetchManagedProducts();
        } catch (error) {
            console.error('Failed to reactivate:', error);
            toast.error('Failed to reactivate product');
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        if (!confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) return;
        try {
            await productApi.delete(product.id, true);
            toast.success('Product Deleted');
            fetchManagedProducts();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to delete product');
        }
    };

    const showBarcode = ['Sembako', 'Daging', 'Canang', 'Sayur', 'Buah', 'Jajan', 'Minuman'].includes(formData.category);
    const showWeightUnit = ['Sembako', 'Daging', 'Sayur', 'Buah'].includes(formData.category);

    // Continue in next part - JSX return
    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-white">
            <Toaster richColors position="top-center" expand visibleToasts={5} />

            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                        {/* Mobile Menu Button */}
                        <button onClick={() => setSidebarOpen(true)} className="xl:hidden p-2 hover:bg-gray-100 rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2">
                            <img src="/merthanayafix.svg" className="w-24 h-12" alt="" />
                            <h1 className="text-lg sm:text-xl font-bold text-slate-800 shrink-0">POS</h1>
                        </div>

                        {/* Search Bar - only for products view */}
                        {activeView === 'products' && (
                            <div className="flex-1 max-w-xl hidden sm:block">
                                <Input
                                    placeholder="Search by name or code..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    onKeyDown={handleSearchKeyPress}
                                    className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        {/* Scan Button */}
                        <Button variant="outline" size="sm" onClick={() => setScannerDialogOpen(true)}
                            className="border-slate-300 text-slate-700 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600">
                            <ScanLine className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Scan</span>
                        </Button>

                        {/* Mobile Cart Button */}
                        <Button variant="outline" size="sm" onClick={() => setCartOpen(true)}
                            className="xl:hidden relative border-slate-300 text-slate-700 bg-white hover:bg-indigo-50">
                            <ShoppingCart className="h-4 w-4" />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {cart.length}
                                </span>
                            )}
                        </Button>
                    </div>

                    {/* Mobile Search Bar */}
                    {activeView === 'products' && (
                        <div className="mt-3 sm:hidden">
                            <Input placeholder="Search products..." value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                onKeyDown={handleSearchKeyPress}
                                className="bg-white border-slate-300 text-slate-800" />
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && <div className="xl:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setSidebarOpen(false)} />}

            <div className="flex h-[calc(100vh-60px)]">
                {/* Left Sidebar */}
                <aside className={`fixed xl:static inset-y-0 left-0 z-50 w-56 bg-white border-r border-slate-200 flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between xl:hidden">
                        <h1 className="text-xl font-bold text-slate-800">Menu</h1>
                        <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <nav className="flex-1 p-3 space-y-1">
                        <label htmlFor="" className='w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all text-slate-600 hover:bg-slate-100'>Order</label>
                        <button onClick={() => handleViewChange('products')}
                            className={`w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all ${activeView === 'products' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Package className="h-5 w-5" />
                            <span className="flex-1">New Order</span>
                        </button>
                        <button onClick={() => handleViewChange('pending')}
                            className={`w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all ${activeView === 'pending' ? 'bg-yellow-100 text-yellow-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <ClipboardList className="h-5 w-5" />
                            <span className="flex-1">Pending</span>
                            {pendingOrders.length > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">{pendingOrders.length}</Badge>
                            )}
                        </button>
                        <button onClick={() => handleViewChange('success')}
                            className={`w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all ${activeView === 'success' ? 'bg-green-100 text-green-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <CheckCircle className="h-5 w-5" />
                            <span className="flex-1">Success</span>
                            {totalPaidOrders > 0 && (
                                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">{totalPaidOrders}</Badge>
                            )}
                        </button>
                        <hr className='my-3' />
                        <label htmlFor="" className='w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all text-slate-600 hover:bg-slate-100'>Product</label>
                        <button onClick={() => handleViewChange('manageproduct')}
                            className={`w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all ${activeView === 'manageproduct' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Package className="h-5 w-5" />
                            <span className="flex-1">Manage Product</span>
                        </button>
                    </nav>
                    <div className="p-3 border-t border-slate-200">
                        <nav className="space-y-1 text-sm">
                            <a href="/admin/products" className="block px-4 py-2 text-slate-500 hover:text-indigo-600 transition">→ Admin</a>
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto py-4 px-4">
                    {activeView === 'products' && (
                        <>
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

                            {/* Product Pagination */}
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
                        </>
                    )}

                    {activeView === 'pending' && (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">📋 Pending Orders</h2>
                                    <p className="text-sm text-slate-500">{filteredPendingOrders.length} pending order{filteredPendingOrders.length !== 1 ? 's' : ''}</p>
                                </div>
                                <Input
                                    placeholder="Search by order ID..."
                                    value={pendingSearch}
                                    onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1); }}
                                    className="w-full sm:w-48 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                            {loading ? (
                                <div className="flex items-center justify-center h-64 text-slate-500">Loading orders...</div>
                            ) : paginatedPendingOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                    <span className="text-6xl mb-4">✨</span>
                                    <p className="text-xl">No pending orders</p>
                                    <p className="text-sm">Orders will appear here in real-time</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {paginatedPendingOrders.map((order) => (
                                        <Card key={order.id} className="bg-white border-slate-200 hover:border-yellow-300 hover:shadow-lg hover:shadow-yellow-100 transition-all duration-200 cursor-pointer" onClick={() => handleViewDetails(order.id)}>
                                            <CardHeader className="pb-2 p-3 sm:p-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="text-2xl sm:text-4xl font-bold text-yellow-600">{order.short_id}</CardTitle>
                                                        <div className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">{order.invoice_id}</div>
                                                    </div>
                                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">PENDING</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pb-2 p-3 sm:p-6 pt-0">
                                                <div className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">{formatPrice(order.total_amount)}</div>
                                                <div className="text-sm text-slate-500">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
                                            </CardContent>
                                            <CardFooter className="pt-2 border-t border-slate-200 p-3 sm:p-6">
                                                <div className="text-xs text-slate-400">{formatSmartDate(order.created_at)}</div>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                            {pendingTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                                    <Button variant="outline" size="sm" onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))} disabled={pendingPage === 1} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                                    </Button>
                                    <span className="text-sm text-slate-600">{pendingPage} / {pendingTotalPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))} disabled={pendingPage >= pendingTotalPages} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {activeView === 'success' && (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">✅ Success Orders</h2>
                                    <p className="text-sm text-slate-500">{filteredPaidOrders.length} completed order{filteredPaidOrders.length !== 1 ? 's' : ''}</p>
                                </div>
                                <Input
                                    placeholder="Search by order ID..."
                                    value={successSearch}
                                    onChange={(e) => { setSuccessSearch(e.target.value); setPaidPage(1); }}
                                    className="w-full sm:w-48 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                            {loading ? (
                                <div className="flex items-center justify-center h-64 text-slate-500">Loading orders...</div>
                            ) : filteredPaidOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                    <span className="text-6xl mb-4">📋</span>
                                    <p className="text-xl">No completed orders</p>
                                    <p className="text-sm">Completed orders will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {filteredPaidOrders.map((order) => (
                                        <Card key={order.id} className="bg-white border-slate-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-100 transition-all duration-200">
                                            <CardHeader className="pb-2 p-3 sm:p-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="text-2xl sm:text-4xl font-bold text-green-600">{order.short_id}</CardTitle>
                                                        <div className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">{order.invoice_id}</div>
                                                    </div>
                                                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">PAID</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pb-2 p-3 sm:p-6 pt-0">
                                                <div className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">{formatPrice(order.total_amount)}</div>
                                                <div className="text-sm text-slate-500">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
                                            </CardContent>
                                            <CardFooter className="pt-2 border-t border-slate-200 flex justify-between items-center p-3 sm:p-6">
                                                <div className="text-xs text-slate-400">{formatDateTime(order.created_at)}</div>
                                                <Button size="sm" variant="outline" onClick={() => handlePrintInvoice(order.id)} className="border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600">
                                                    <Printer className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Invoice</span>
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                            {totalPaidPages > 1 && (
                                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                                    <Button variant="outline" size="sm" onClick={() => setPaidPage((prev) => Math.max(1, prev - 1))} disabled={paidPage === 1} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                                    </Button>
                                    <span className="text-sm text-slate-600">{paidPage} / {totalPaidPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setPaidPage((prev) => Math.min(totalPaidPages, prev + 1))} disabled={paidPage >= totalPaidPages} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {activeView === 'manageproduct' && (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">📦 Manage Products</h2>
                                    <p className="text-sm text-slate-500">{totalManagedProducts} product{totalManagedProducts !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Search products..."
                                        value={manageSearch}
                                        onChange={(e) => { setManageSearch(e.target.value); setProductPage(1); }}
                                        className="w-full sm:w-48 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                                    />
                                    <Button onClick={() => openProductDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                                        <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Add</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Products Table */}
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
                                <Table className="min-w-[600px]">
                                    <TableHeader>
                                        <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-100">
                                            <TableHead className="text-slate-700 font-semibold">Code</TableHead>
                                            <TableHead className="text-slate-700 font-semibold">Name</TableHead>
                                            <TableHead className="text-slate-700 font-semibold">Category</TableHead>
                                            <TableHead className="text-slate-700 font-semibold">Price</TableHead>
                                            <TableHead className="text-slate-700 font-semibold">Stock</TableHead>
                                            <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                                            <TableHead className="text-slate-700 font-semibold text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading products...</TableCell>
                                            </TableRow>
                                        ) : managedProducts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No products found. Add your first product!</TableCell>
                                            </TableRow>
                                        ) : (
                                            managedProducts.map((product) => (
                                                <TableRow key={product.id} className="border-slate-200 hover:bg-slate-50">
                                                    <TableCell className="text-slate-500 font-mono text-sm">{product.barcode || '—'}</TableCell>
                                                    <TableCell className="font-medium text-slate-900 whitespace-normal min-w-[150px] px-4">
                                                        <p className="font-medium">{product.name}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="border-indigo-500 text-indigo-600">{product.category}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-green-600 font-mono">
                                                        {formatPrice(product.price)}
                                                        {product.unit_type === 'weight' ? <span className="text-slate-500">/kg</span> : product.unit_type === 'pcs' ? <span className="text-slate-500">/pcs</span> : <span className="text-slate-500">/item</span>}
                                                    </TableCell>
                                                    <TableCell className="text-slate-700">
                                                        {product.stock}
                                                        {product.unit_type === 'weight' ? <span className="text-slate-500"> kg</span> : product.unit_type === 'pcs' ? <span className="text-slate-500"> pcs</span> : <span className="text-slate-500"> item</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={product.is_active ? 'default' : 'secondary'} className={product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                                                            {product.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => openProductDialog(product)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100" title="Edit">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {product.is_active ? (
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeactivateProduct(product)} className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50" title="Deactivate">
                                                                <PowerOff className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" onClick={() => handleReactivateProduct(product)} className="text-green-500 hover:text-green-600 hover:bg-green-50" title="Activate">
                                                                <Power className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {managedTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                                    <Button variant="outline" size="sm" onClick={() => setProductPage(prev => Math.max(1, prev - 1))} disabled={productPage === 1} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                                    </Button>
                                    <span className="text-sm text-slate-600">{productPage} / {managedTotalPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setProductPage(prev => Math.min(managedTotalPages, prev + 1))} disabled={productPage >= managedTotalPages} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* Right Sidebar - Cart (Desktop) */}
                <aside className="hidden xl:flex w-80 border-l border-slate-200 bg-white/90 backdrop-blur-xl flex-col shadow-lg h-full overflow-hidden">
                    <div className="p-4 border-b border-slate-200 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800">Cart</h2>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50">Clear</Button>
                            )}
                        </div>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-slate-400 py-8">Cart is empty</div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-slate-800 text-sm font-medium truncate flex-1">{item.product.name}</h4>
                                                <button onClick={() => removeFromCart(item.product.id)} className="text-slate-400 hover:text-red-500 ml-2 transition-colors">✕</button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400" onClick={() => updateCartQuantity(item.product.id, item.quantity - (item.product.unit_type === 'weight' ? 0.1 : 1))}>-</Button>
                                                    <span className="text-slate-800 w-12 text-center font-medium">
                                                        {item.quantity}{item.product.unit_type === 'weight' ? <span className="text-gray-500"> kg</span> : item.product.unit_type === 'pcs' ? <span className="text-gray-500"> pcs</span> : <span className="text-gray-500"> item</span>}
                                                    </span>
                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400" onClick={() => updateCartQuantity(item.product.id, item.quantity + (item.product.unit_type === 'weight' ? 0.1 : 1))}>+</Button>
                                                </div>
                                                <span className="text-green-600 font-mono text-sm font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500">Total</span>
                            <span className="text-2xl font-bold text-slate-800">{formatPrice(cartTotal)}</span>
                        </div>
                        <Button className="w-full h-14 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" onClick={handlePrintBill} disabled={cart.length === 0 || submitting}>
                            {submitting ? 'Processing...' : 'Submit'}
                        </Button>
                    </div>
                </aside>
            </div>

            {/* Mobile Cart Overlay */}
            {cartOpen && <div className="xl:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setCartOpen(false)} />}

            {/* Mobile Cart Sheet */}
            <div className={`xl:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 flex flex-col ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '75vh' }}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Cart ({cart.length})</h2>
                    <div className="flex items-center gap-2">
                        {cart.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50">Clear</Button>}
                        <button onClick={() => setCartOpen(false)} className="p-2"><X className="w-5 h-5" /></button>
                    </div>
                </div>
                <ScrollArea className="flex-1 overflow-auto">
                    <div className="p-4">
                        {cart.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">Cart is empty</div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.product.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-slate-800 text-sm font-medium truncate flex-1">{item.product.name}</h4>
                                            <button onClick={() => removeFromCart(item.product.id)} className="text-slate-400 hover:text-red-500 ml-2 transition-colors">✕</button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateCartQuantity(item.product.id, item.quantity - (item.product.unit_type === 'weight' ? 0.1 : 1))}>-</Button>
                                                <span className="text-slate-800 text-sm font-medium">{item.quantity}</span>
                                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateCartQuantity(item.product.id, item.quantity + (item.product.unit_type === 'weight' ? 0.1 : 1))}>+</Button>
                                            </div>
                                            <span className="text-green-600 font-mono text-sm font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500">Total</span>
                        <span className="text-2xl font-bold text-slate-800">{formatPrice(cartTotal)}</span>
                    </div>
                    <Button className="w-full h-12 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" onClick={handlePrintBill} disabled={cart.length === 0 || submitting}>
                        {submitting ? 'Processing...' : 'Submit Order'}
                    </Button>
                </div>
            </div>

            {/* Quantity Dialog */}
            <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[420px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Enter Quantity</DialogTitle>
                        <DialogDescription className="text-slate-500">{selectedProduct?.name} - {formatPrice(selectedProduct?.price || 0)}/kg</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {/* Mode Toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant={quantityInputMode === 'weight' ? 'default' : 'outline'}
                                onClick={() => setQuantityInputMode('weight')}
                                className={`flex-1 ${quantityInputMode === 'weight' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Berdasarkan Berat
                            </Button>
                            <Button
                                variant={quantityInputMode === 'nominal' ? 'default' : 'outline'}
                                onClick={() => setQuantityInputMode('nominal')}
                                className={`flex-1 ${quantityInputMode === 'nominal' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Berdasarkan Nominal
                            </Button>
                        </div>

                        {/* Conditional Input */}
                        {quantityInputMode === 'weight' ? (
                            <div>
                                <Label htmlFor="quantity" className="text-slate-700">Berat (kg)</Label>
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
                        ) : (
                            <div>
                                <Label htmlFor="nominal" className="text-slate-700">Nominal (Rp)</Label>
                                <Input
                                    id="nominal"
                                    type="number"
                                    min="100"
                                    step="100"
                                    value={nominalAmount}
                                    onChange={(e) => setNominalAmount(e.target.value)}
                                    placeholder="Masukkan jumlah uang"
                                    className="mt-2 bg-white border-slate-300 text-slate-800 text-center text-2xl focus:border-indigo-500 focus:ring-indigo-500"
                                    autoFocus
                                />
                                {/* Preview calculation */}
                                {nominalAmount && parseFloat(nominalAmount) > 0 && selectedProduct && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="text-sm text-slate-600">Estimasi berat:</div>
                                        <div className="text-xl font-bold text-indigo-600">
                                            {(parseFloat(nominalAmount) / selectedProduct.price).toFixed(2)} kg
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setQuantityDialogOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</Button>
                        <Button onClick={handleQuantitySubmit} className="bg-linear-to-r from-green-500 to-emerald-500">Add to Cart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket Success Dialog */}
            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[400px] bg-white border-slate-200 shadow-xl p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Order Ticket {lastTicket?.shortId}</DialogTitle>
                    <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white p-4 text-center">
                        <div className="text-xs uppercase tracking-wider opacity-80">Order Ticket</div>
                        <div className="text-4xl font-bold mt-1">{lastTicket?.shortId}</div>
                        <div className="text-sm font-mono mt-1 opacity-90">{lastTicket?.invoiceId}</div>
                        <div className="text-xs opacity-70 mt-2">{lastTicket?.createdAt?.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </div>
                    <div className="p-4">
                        <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Order Details</div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {lastTicket?.items.map((item) => (
                                <div key={item.product.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-800">{item.product.name}</div>
                                        <div className="text-xs text-slate-500">{item.quantity} {item.product.unit_type === 'weight' ? 'kg' : item.product.unit_type === 'pcs' ? 'pcs' : 'item'} × {formatPrice(item.product.price)}</div>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800">{formatPrice(item.product.price * item.quantity)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total ({lastTicket?.items.length || 0} items)</span>
                            <span className="text-2xl font-bold text-green-600">{formatPrice(lastTicket?.total || 0)}</span>
                        </div>
                    </div>
                    <div className="p-4 pt-0 space-y-2">
                        <Button onClick={() => window.print()} variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"><Printer className="h-4 w-4 mr-2" />Print Ticket</Button>
                        <Button onClick={() => setTicketDialogOpen(false)} className="w-full bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">✓ Done - New Order</Button>
                        <p className="text-center text-xs text-slate-400">Present this ticket to cashier for payment</p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Scanner Dialog */}
            <Dialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[450px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 flex items-center gap-2"><ScanLine className="h-5 w-5 text-indigo-600" />Scan Product Barcode</DialogTitle>
                        <DialogDescription className="text-slate-500">Point your camera at a product barcode to add it to cart</DialogDescription>
                    </DialogHeader>
                    {scannerDialogOpen && (
                        <BarcodeScanner onScanSuccess={handleBarcodeScan} onClose={() => setScannerDialogOpen(false)} autoStart />
                    )}
                </DialogContent>
            </Dialog>

            {/* Order Details Dialog (for pending orders) */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[500px] max-h-[85vh] flex flex-col bg-white border-slate-200 shadow-xl">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-3xl text-yellow-600">{selectedOrder?.short_id}</DialogTitle>
                        <DialogDescription className="text-slate-500">Order details and payment</DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="flex-1 overflow-hidden flex flex-col py-2">
                            <ScrollArea className="flex-1 max-h-[40vh] pr-2">
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <div>
                                                <div className="text-slate-800">{item.product_name}</div>
                                                <div className="text-sm text-slate-500">{item.quantity} × {formatPrice(item.price_at_purchase)}</div>
                                            </div>
                                            <div className="text-green-600 font-mono font-semibold">{formatPrice(item.subtotal)}</div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <Separator className="bg-slate-200 my-4 shrink-0" />
                            <div className="flex justify-between items-center shrink-0">
                                <span className="text-xl text-slate-600">Total</span>
                                <span className="text-3xl font-bold text-slate-800">{formatPrice(selectedOrder.total_amount)}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0 pt-2">
                        <Button variant="outline" onClick={() => selectedOrder && handleCancelOrder(selectedOrder.id)} disabled={processing} className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400">Cancel Order</Button>
                        <Button onClick={() => selectedOrder && handlePayOrder(selectedOrder.id)} disabled={processing} className="flex-1 h-12 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">{processing ? 'Processing...' : '✅ Confirm Payment'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invoice Dialog (for printing) */}
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[400px] bg-white border-slate-200 shadow-xl p-0 overflow-hidden print:shadow-none print:border-none">
                    <DialogTitle className="sr-only">Invoice {selectedOrder?.short_id}</DialogTitle>
                    <div className="bg-linear-to-r from-emerald-600 to-green-600 text-white p-4 text-center print:bg-white print:text-black">
                        <div className="text-xs uppercase tracking-wider opacity-80 print:opacity-100">Invoice</div>
                        <div className="text-4xl font-bold mt-1">{selectedOrder?.short_id}</div>
                        <div className="text-sm font-mono mt-1 opacity-90">{selectedOrder?.invoice_id}</div>
                        <div className="text-xs opacity-70 mt-2 print:opacity-100">{selectedOrder && formatDateTime(selectedOrder.created_at)}</div>
                    </div>
                    <div className="p-4">
                        <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Order Details</div>
                        <ScrollArea className="max-h-48">
                            <div className="space-y-2">
                                {selectedOrder?.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-800">{item.product_name}</div>
                                            <div className="text-xs text-slate-500">{item.quantity} × {formatPrice(item.price_at_purchase)}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-800">{formatPrice(item.subtotal)}</div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total ({selectedOrder?.items.length || 0} items)</span>
                            <span className="text-2xl font-bold text-green-600">{formatPrice(selectedOrder?.total_amount || 0)}</span>
                        </div>
                    </div>
                    <div className="p-4 pt-0 flex gap-2 print:hidden">
                        <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100">Close</Button>
                        <Button onClick={() => window.print()} className="flex-1 bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"><Printer className="h-4 w-4 mr-2" />Print</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Product Form Dialog */}
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 text-slate-900">
                    <form onSubmit={handleProductSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                {showBarcode ? 'Barcoded product' : 'Product information'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Barcode */}
                            {showBarcode && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="barcode" className="text-right">Code</Label>
                                    <div className="col-span-3 flex gap-2">
                                        <Input
                                            id="barcode"
                                            value={formData.barcode || ''}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })}
                                            className="flex-1 bg-white border-slate-300 text-slate-900"
                                            placeholder="Enter barcode or code"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setProductScannerOpen(true)}
                                            className="border-slate-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                            title="Scan barcode"
                                        >
                                            <ScanLine className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {/* Name */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="col-span-3 bg-white border-slate-300 text-slate-900"
                                    required
                                />
                            </div>
                            {/* Category */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                    <SelectTrigger className="col-span-3 bg-white border-slate-300 text-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRODUCT_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Price */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Price (Rp)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={formData.price || ''}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                                    onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                    placeholder="0"
                                    className="col-span-3 bg-white border-slate-300 text-slate-900"
                                    required
                                />
                            </div>
                            {/* Stock */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">Stock</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    min="0"
                                    value={formData.stock || ''}
                                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                                    onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                    placeholder="0"
                                    className="col-span-3 bg-white border-slate-300 text-slate-900"
                                />
                            </div>
                            {/* Unit Type */}
                            {showWeightUnit && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="unit_type" className="text-right">Sold by</Label>
                                    <Select value={formData.unit_type} onValueChange={(value: 'item' | 'weight' | 'pcs') => setFormData({ ...formData, unit_type: value })}>
                                        <SelectTrigger className="col-span-3 bg-white border-slate-300 text-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="item">Per Item</SelectItem>
                                            <SelectItem value="weight">Per Kg</SelectItem>
                                            <SelectItem value="pcs">Per Pcs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {/* Active Toggle */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="is_active" className="text-right">Active</Label>
                                <div className="col-span-3 flex items-center">
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <span className="ml-2 text-sm text-slate-600">
                                        {formData.is_active ? 'Available for sale' : 'Hidden from orders'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100">
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {editingProduct ? 'Save Changes' : 'Create Product'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Product Barcode Scanner Dialog */}
            <Dialog open={productScannerOpen} onOpenChange={setProductScannerOpen}>
                <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <ScanLine className="h-5 w-5 text-indigo-600" />
                            Scan Barcode
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Scan a barcode to fill the product code field
                        </DialogDescription>
                    </DialogHeader>
                    {productScannerOpen && (
                        <BarcodeScanner
                            onScanSuccess={(barcode) => {
                                setFormData({ ...formData, barcode });
                                setProductScannerOpen(false);
                                toast.success('Barcode Scanned', { description: `Code "${barcode}" captured` });
                            }}
                            onClose={() => setProductScannerOpen(false)}
                            autoStart
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
