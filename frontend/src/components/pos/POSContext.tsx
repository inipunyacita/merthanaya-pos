'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Product, CartItem, Store, Order, OrderSummary, ProductCreate } from '@/types';
import { productApi, orderApi, storeApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// === TYPES ===
interface TicketInfo {
    shortId: string;
    invoiceId: string;
    total: number;
    items: CartItem[];
    createdAt: Date;
}

interface POSContextType {
    // Auth/Store
    store: Store | null;
    fetchStore: () => Promise<void>;

    // Cart State
    cart: CartItem[];
    cartTotal: number;
    addToCart: (product: Product, qty: number) => void;
    updateCartQuantity: (productId: string, qty: number) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;

    // Cart UI
    cartOpen: boolean;
    setCartOpen: (open: boolean) => void;

    // Quantity Dialog State
    quantityDialogOpen: boolean;
    setQuantityDialogOpen: (open: boolean) => void;
    selectedProduct: Product | null;
    setSelectedProduct: (product: Product | null) => void;
    quantity: string;
    setQuantity: (qty: string) => void;
    quantityInputMode: 'weight' | 'nominal';
    setQuantityInputMode: (mode: 'weight' | 'nominal') => void;
    nominalAmount: string;
    setNominalAmount: (amount: string) => void;
    handleQuantitySubmit: () => void;
    handleProductClick: (product: Product) => void;

    // Scanner
    scannerDialogOpen: boolean;
    setScannerDialogOpen: (open: boolean) => void;
    handleBarcodeScan: (barcode: string) => Promise<void>;

    // Ticket Dialog
    ticketDialogOpen: boolean;
    setTicketDialogOpen: (open: boolean) => void;
    lastTicket: TicketInfo | null;

    // Order Creation
    submitting: boolean;
    handlePrintBill: () => Promise<void>;

    // Order Operations
    selectedOrder: Order | null;
    setSelectedOrder: (order: Order | null) => void;
    detailsDialogOpen: boolean;
    setDetailsDialogOpen: (open: boolean) => void;
    invoiceDialogOpen: boolean;
    setInvoiceDialogOpen: (open: boolean) => void;
    processing: boolean;
    handleViewDetails: (orderId: string) => Promise<void>;
    handlePrintInvoice: (orderId: string) => Promise<void>;
    handlePayOrder: (orderId: string) => Promise<void>;
    handleCancelOrder: (orderId: string) => Promise<void>;

    // Product Form State (for manage products)
    productDialogOpen: boolean;
    setProductDialogOpen: (open: boolean) => void;
    editingProduct: Product | null;
    setEditingProduct: (product: Product | null) => void;
    formData: ProductCreate;
    setFormData: (data: ProductCreate) => void;
    productScannerOpen: boolean;
    setProductScannerOpen: (open: boolean) => void;
    resetProductForm: () => void;
    openProductDialog: (product?: Product) => void;
    handleProductSubmit: (e: React.FormEvent) => Promise<void>;
    handleDeactivateProduct: (product: Product) => Promise<void>;
    handleReactivateProduct: (product: Product) => Promise<void>;
    handleDeleteProduct: (product: Product) => Promise<void>;

    // Loading State
    loading: boolean;
    setLoading: (loading: boolean) => void;

    // Helper Functions
    formatPrice: (price: number) => string;
    formatTime: (dateString: string) => string;
    formatDateTime: (dateString: string) => string;
    formatSmartDate: (dateString: string) => string;

    // Refresh callbacks for views
    refreshProducts: () => void;
    setRefreshProducts: (callback: () => void) => void;
    refreshPendingOrders: () => void;
    setRefreshPendingOrders: (callback: () => void) => void;

    // Order counts for sidebar badges
    pendingOrdersCount: number;
    successOrdersCount: number;
    setPendingOrdersCount: (count: number) => void;
    setSuccessOrdersCount: (count: number) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
    // Store State
    const [store, setStore] = useState<Store | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);

    // Quantity Dialog State
    const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState<string>('1');
    const [quantityInputMode, setQuantityInputMode] = useState<'weight' | 'nominal'>('weight');
    const [nominalAmount, setNominalAmount] = useState<string>('');

    // Scanner State
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

    // Ticket State
    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [lastTicket, setLastTicket] = useState<TicketInfo | null>(null);

    // Order Creation State
    const [submitting, setSubmitting] = useState(false);

    // Order Operations State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Product Form State
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

    // Loading State
    const [loading, setLoading] = useState(false);

    // Refresh callbacks
    const [refreshProducts, setRefreshProducts] = useState<() => void>(() => () => { });
    const [refreshPendingOrders, setRefreshPendingOrders] = useState<() => void>(() => () => { });

    // Order counts for sidebar badges
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [successOrdersCount, setSuccessOrdersCount] = useState(0);

    // === CART FUNCTIONS ===
    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const addToCart = useCallback((product: Product, qty: number) => {
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
    }, []);

    const updateCartQuantity = useCallback((productId: string, qty: number) => {
        const roundedQty = Math.round(qty * 100) / 100;
        if (roundedQty <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
        } else {
            setCart((prev) => prev.map((item) =>
                item.product.id === productId ? { ...item, quantity: roundedQty } : item
            ));
        }
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const handleProductClick = useCallback((product: Product) => {
        if (product.unit_type === 'weight') {
            setSelectedProduct(product);
            setQuantity('');
            setNominalAmount('');
            setQuantityInputMode('weight');
            setQuantityDialogOpen(true);
        } else {
            addToCart(product, 1);
        }
    }, [addToCart]);

    const handleQuantitySubmit = useCallback(() => {
        if (!selectedProduct) return;

        let qty = 0;
        if (quantityInputMode === 'weight') {
            qty = parseFloat(quantity);
        } else {
            const nominal = parseFloat(nominalAmount);
            if (nominal > 0 && selectedProduct.price > 0) {
                qty = nominal / selectedProduct.price;
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
    }, [selectedProduct, quantityInputMode, quantity, nominalAmount, addToCart]);

    const handleBarcodeScan = useCallback(async (barcode: string) => {
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
    }, [handleProductClick]);

    // === STORE FUNCTIONS ===
    const fetchStore = useCallback(async () => {
        try {
            const data = await storeApi.getMe();
            setStore(data);
        } catch (error) {
            console.error('Failed to fetch store settings:', error);
        }
    }, []);

    useEffect(() => {
        fetchStore();
    }, [fetchStore]);

    // === ORDER FUNCTIONS ===
    const handlePrintBill = useCallback(async () => {
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
    }, [cart, clearCart]);

    const handleViewDetails = useCallback(async (orderId: string) => {
        try {
            const order = await orderApi.get(orderId);
            setSelectedOrder(order);
            setDetailsDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            toast.error('Failed to load order details');
        }
    }, []);

    const handlePrintInvoice = useCallback(async (orderId: string) => {
        try {
            const order = await orderApi.get(orderId);
            setSelectedOrder(order);
            setInvoiceDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            toast.error('Failed to load order details');
        }
    }, []);

    const handlePayOrder = useCallback(async (orderId: string) => {
        try {
            setProcessing(true);
            await orderApi.pay(orderId);
            toast.success('Payment confirmed!');
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
            refreshPendingOrders();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to process payment');
        } finally {
            setProcessing(false);
        }
    }, [refreshPendingOrders]);

    const handleCancelOrder = useCallback(async (orderId: string) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;
        try {
            setProcessing(true);
            await orderApi.cancel(orderId);
            toast.success('Order cancelled');
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
            refreshPendingOrders();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to cancel order');
        } finally {
            setProcessing(false);
        }
    }, [refreshPendingOrders]);

    // === PRODUCT MANAGEMENT FUNCTIONS ===
    const resetProductForm = useCallback(() => {
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
    }, []);

    const openProductDialog = useCallback((product?: Product) => {
        if (product) {
            setFormData({
                name: product.name,
                category: product.category,
                price: product.price,
                stock: product.stock,
                barcode: product.barcode,
                image_url: product.image_url,
                unit_type: product.unit_type || 'item',
                is_active: product.is_active,
            });
            setEditingProduct(product);
        } else {
            resetProductForm();
        }
        setProductDialogOpen(true);
    }, [resetProductForm]);

    const handleProductSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await productApi.update(editingProduct.id, formData);
                toast.success(`${formData.name} has been updated`);
            } else {
                await productApi.create(formData);
                toast.success(`${formData.name} has been created`);
            }
            setProductDialogOpen(false);
            resetProductForm();
            refreshProducts();
        } catch (error) {
            console.error('Failed to save product:', error);
            toast.error('Failed to save product');
        }
    }, [editingProduct, formData, resetProductForm, refreshProducts]);

    const handleDeactivateProduct = useCallback(async (product: Product) => {
        try {
            await productApi.update(product.id, { is_active: false });
            toast.success(`${product.name} deactivated`);
            refreshProducts();
        } catch (error) {
            console.error('Failed to deactivate product:', error);
            toast.error('Failed to deactivate product');
        }
    }, [refreshProducts]);

    const handleReactivateProduct = useCallback(async (product: Product) => {
        try {
            await productApi.update(product.id, { is_active: true });
            toast.success(`${product.name} activated`);
            refreshProducts();
        } catch (error) {
            console.error('Failed to reactivate product:', error);
            toast.error('Failed to reactivate product');
        }
    }, [refreshProducts]);

    const handleDeleteProduct = useCallback(async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
        try {
            await productApi.delete(product.id);
            toast.success(`${product.name} has been deleted`);
            refreshProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
            toast.error('Failed to delete product');
        }
    }, [refreshProducts]);

    // === HELPER FUNCTIONS ===
    const formatPrice = useCallback((price: number) => {
        const rounded = Math.round(price);
        const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `Rp ${formatted}`;
    }, []);

    const formatTime = useCallback((dateString: string) =>
        new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), []);

    const formatDateTime = useCallback((dateString: string) =>
        new Date(dateString).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }), []);

    const formatSmartDate = useCallback((dateString: string) => {
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
    }, [formatTime]);

    const value: POSContextType = {
        store, fetchStore,
        cart, cartTotal, addToCart, updateCartQuantity, removeFromCart, clearCart,
        cartOpen, setCartOpen,
        quantityDialogOpen, setQuantityDialogOpen, selectedProduct, setSelectedProduct,
        quantity, setQuantity, quantityInputMode, setQuantityInputMode,
        nominalAmount, setNominalAmount, handleQuantitySubmit, handleProductClick,
        scannerDialogOpen, setScannerDialogOpen, handleBarcodeScan,
        ticketDialogOpen, setTicketDialogOpen, lastTicket,
        submitting, handlePrintBill,
        selectedOrder, setSelectedOrder, detailsDialogOpen, setDetailsDialogOpen,
        invoiceDialogOpen, setInvoiceDialogOpen, processing,
        handleViewDetails, handlePrintInvoice, handlePayOrder, handleCancelOrder,
        productDialogOpen, setProductDialogOpen, editingProduct, setEditingProduct,
        formData, setFormData, productScannerOpen, setProductScannerOpen,
        resetProductForm, openProductDialog, handleProductSubmit,
        handleDeactivateProduct, handleReactivateProduct, handleDeleteProduct,
        loading, setLoading,
        formatPrice, formatTime, formatDateTime, formatSmartDate,
        refreshProducts, setRefreshProducts: (cb) => setRefreshProducts(() => cb),
        refreshPendingOrders, setRefreshPendingOrders: (cb) => setRefreshPendingOrders(() => cb),
        pendingOrdersCount, successOrdersCount, setPendingOrdersCount, setSuccessOrdersCount,
    };

    return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export function usePOS() {
    const context = useContext(POSContext);
    if (context === undefined) {
        throw new Error('usePOS must be used within a POSProvider');
    }
    return context;
}
