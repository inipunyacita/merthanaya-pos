'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode, useMemo } from 'react';
import { Product, CartItem, Store, Order, OrderSummary, ProductCreate, TicketInfo } from '@/types';
import { productApi, orderApi, storeApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';

// === TYPES ===
interface POSState {
    store: Store | null;
    cart: CartItem[];
    cartTotal: number;
    cartOpen: boolean;
    quantityDialogOpen: boolean;
    selectedProduct: Product | null;
    quantity: string;
    quantityInputMode: 'weight' | 'nominal';
    nominalAmount: string;
    unit: string;
    scannerDialogOpen: boolean;
    ticketDialogOpen: boolean;
    lastTicket: TicketInfo | null;
    submitting: boolean;
    selectedOrder: Order | null;
    detailsDialogOpen: boolean;
    invoiceDialogOpen: boolean;
    invoiceOrder: Order | null;
    processing: boolean;
    productDialogOpen: boolean;
    editingProduct: Product | null;
    formData: ProductCreate;
    productScannerOpen: boolean;
    loading: boolean;
    pendingOrdersCount: number;
    successOrdersCount: number;
}

interface POSActions {
    fetchStore: () => Promise<void>;
    addToCart: (product: Product, qty: number) => void;
    updateCartQuantity: (productId: string, qty: number) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    setCartOpen: (open: boolean) => void;
    setQuantityDialogOpen: (open: boolean) => void;
    setSelectedProduct: (product: Product | null) => void;
    setQuantity: (qty: string) => void;
    setQuantityInputMode: (mode: 'weight' | 'nominal') => void;
    setNominalAmount: (amount: string) => void;
    handleQuantitySubmit: () => void;
    handleProductClick: (product: Product) => void;
    setUnit: (unit: string) => void;
    setScannerDialogOpen: (open: boolean) => void;
    handleBarcodeScan: (barcode: string) => Promise<void>;
    setTicketDialogOpen: (open: boolean) => void;
    handlePrintBill: () => Promise<void>;
    setSelectedOrder: (order: Order | null) => void;
    setDetailsDialogOpen: (open: boolean) => void;
    setInvoiceDialogOpen: (open: boolean) => void;
    setInvoiceOrder: (order: Order | null) => void;
    printInvoice: () => void;
    handleViewDetails: (orderId: string) => Promise<void>;
    handlePrintInvoice: (orderId: string) => Promise<void>;
    handlePayOrder: (orderId: string) => Promise<void>;
    handleCancelOrder: (orderId: string) => Promise<void>;
    setProductDialogOpen: (open: boolean) => void;
    setEditingProduct: (product: Product | null) => void;
    setFormData: (data: ProductCreate | ((prev: ProductCreate) => ProductCreate)) => void;
    setProductScannerOpen: (open: boolean) => void;
    resetProductForm: () => void;
    openProductDialog: (product?: Product) => void;
    handleProductSubmit: (e: React.FormEvent) => Promise<void>;
    handleDeactivateProduct: (product: Product) => Promise<void>;
    handleReactivateProduct: (product: Product) => Promise<void>;
    handleDeleteProduct: (product: Product) => Promise<void>;
    setLoading: (loading: boolean) => void;
    formatPrice: (price: number) => string;
    formatTime: (dateString: string) => string;
    formatDateTime: (dateString: string) => string;
    formatSmartDate: (dateString: string) => string;
    refreshProducts: () => void;
    setRefreshProducts: (callback: () => void) => void;
    refreshPendingOrders: () => void;
    setRefreshPendingOrders: (callback: () => void) => void;
    setScanOverride: (fn: ((barcode: string) => void) | null) => void;
    setPendingOrdersCount: (count: number) => void;
    setSuccessOrdersCount: (count: number) => void;
}

const POSStateContext = createContext<POSState | undefined>(undefined);
const POSActionsContext = createContext<POSActions | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
    // State
    const [store, setStore] = useState<Store | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState<string>('1');
    const [quantityInputMode, setQuantityInputMode] = useState<'weight' | 'nominal'>('weight');
    const [nominalAmount, setNominalAmount] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);
    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [lastTicket, setLastTicket] = useState<TicketInfo | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
    const [processing, setProcessing] = useState(false);
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductCreate>({
        name: '', category: 'Sembako', price: 0, stock: 0, barcode: null, image_url: null, unit_type: 'item', is_active: true,
    });
    const [productScannerOpen, setProductScannerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [successOrdersCount, setSuccessOrdersCount] = useState(0);

    // Refs for non-reactive state
    const [refreshProductsState, setRefreshProducts] = useState<() => void>(() => () => { });
    const [refreshPendingOrdersState, setRefreshPendingOrders] = useState<() => void>(() => () => { });
    const scanOverrideRef = useRef<((barcode: string) => void) | null>(null);

    // Cart Total (derived)
    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);

    // Actions
    const fetchStore = useCallback(async () => {
        try {
            const data = await storeApi.getMe();
            setStore(data);
        } catch (error) {
            console.error('Failed to fetch store settings:', error);
        }
    }, []);

    useEffect(() => { fetchStore(); }, [fetchStore]);

    const addToCart = useCallback((product: Product, qty: number) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
            }
            return [...prev, { product, quantity: qty }];
        });
        toast.success(`Added ${product.name}`);
    }, []);

    const updateCartQuantity = useCallback((productId: string, qty: number) => {
        const roundedQty = Math.round(qty * 100) / 100;
        setCart((prev) => roundedQty <= 0
            ? prev.filter((item) => item.product.id !== productId)
            : prev.map((item) => item.product.id === productId ? { ...item, quantity: roundedQty } : item)
        );
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
                qty = Math.round((nominal / selectedProduct.price) * 100) / 100;
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
        if (productScannerOpen) {
            setFormData((prev) => ({ ...prev, barcode }));
            setProductScannerOpen(false);
            return;
        }
        if (scanOverrideRef.current) {
            scanOverrideRef.current(barcode);
            return;
        }
        try {
            const product = await productApi.getByBarcode(barcode);
            if (product) {
                handleProductClick(product);
                toast.success('Found: ' + product.name);
            }
        } catch {
            toast.error('Not Found: ' + barcode);
        }
    }, [handleProductClick, productScannerOpen]);

    useHardwareScanner({
        onScan: handleBarcodeScan,
        enabled: !productScannerOpen,
        ignoreWhenInputFocused: true,
    });

    const handlePrintBill = useCallback(async () => {
        if (cart.length === 0) return;
        try {
            setSubmitting(true);
            const response = await orderApi.create({ items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })) });
            setLastTicket({ shortId: response.short_id, invoiceId: response.invoice_id, total: response.total_amount, items: [...cart], createdAt: new Date() });
            setTicketDialogOpen(true);
            setCartOpen(false);
            clearCart();
            toast.success('Order created!');
        } finally {
            setSubmitting(false);
        }
    }, [cart, clearCart]);

    const handleViewDetails = useCallback(async (id: string) => {
        try {
            const order = await orderApi.get(id);
            setSelectedOrder(order);
            setDetailsDialogOpen(true);
        } catch (e) { toast.error('Failed to load order'); }
    }, []);

    const handlePrintInvoice = useCallback(async (id: string) => {
        try {
            const order = await orderApi.get(id);
            setSelectedOrder(order);
            setInvoiceDialogOpen(true);
        } catch (e) { toast.error('Failed to load invoice'); }
    }, []);

    const handlePayOrder = useCallback(async (id: string) => {
        try {
            setProcessing(true);
            await orderApi.pay(id);
            setDetailsDialogOpen(false);
            refreshPendingOrdersState();
            toast.success('Paid!');
        } finally { setProcessing(false); }
    }, [refreshPendingOrdersState]);

    const handleCancelOrder = useCallback(async (id: string) => {
        if (!confirm('Cancel?')) return;
        try {
            setProcessing(true);
            await orderApi.cancel(id);
            setDetailsDialogOpen(false);
            refreshPendingOrdersState();
        } finally { setProcessing(false); }
    }, [refreshPendingOrdersState]);

    const printInvoice = useCallback(() => {
        if (!invoiceOrder) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        // Simple layout for thermal printer
        printWindow.document.write(`<html><body style="font-family:monospace;width:300px;margin:0 auto;text-align:center;">
            <h3>Merthanaya</h3><p>${invoiceOrder.invoice_id}</p><hr/>
            ${invoiceOrder.items.map(i => `<div style="display:flex;justify-content:space-between"><span>${i.product_name} x${i.quantity}</span><span>Rp ${Math.round(i.subtotal)}</span></div>`).join('')}
            <hr/><h3>TOTAL: Rp ${Math.round(invoiceOrder.total_amount)}</h3><p>Terima Kasih</p>
            </body></html>`);
        printWindow.document.close();
        printWindow.print();
    }, [invoiceOrder]);

    const resetProductForm = useCallback(() => {
        setFormData({ name: '', category: 'Sembako', price: 0, stock: 0, barcode: null, image_url: null, unit_type: 'item', is_active: true });
        setEditingProduct(null);
    }, []);

    const openProductDialog = useCallback((p?: Product) => {
        if (p) {
            setFormData({ name: p.name, category: p.category, price: p.price, stock: p.stock, barcode: p.barcode, image_url: p.image_url, unit_type: p.unit_type || 'item', is_active: p.is_active });
            setEditingProduct(p);
        } else resetProductForm();
        setProductDialogOpen(true);
    }, [resetProductForm]);

    const handleProductSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) await productApi.update(editingProduct.id, formData);
            else await productApi.create(formData);
            setProductDialogOpen(false);
            refreshProductsState();
            toast.success('Saved');
        } catch (e) { toast.error('Failed'); }
    }, [editingProduct, formData, refreshProductsState]);

    const handleDeactivateProduct = useCallback(async (p: Product) => {
        try { await productApi.update(p.id, { is_active: false }); refreshProductsState(); } catch (e) { }
    }, [refreshProductsState]);

    const handleReactivateProduct = useCallback(async (p: Product) => {
        try { await productApi.update(p.id, { is_active: true }); refreshProductsState(); } catch (e) { }
    }, [refreshProductsState]);

    const handleDeleteProduct = useCallback(async (p: Product) => {
        if (!confirm('Delete?')) return;
        try { await productApi.delete(p.id); refreshProductsState(); } catch (e) { }
    }, [refreshProductsState]);

    const formatPrice = useCallback((p: number) => `Rp ${Math.round(p).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`, []);
    const formatTime = useCallback((s: string) => new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), []);
    const formatDateTime = useCallback((s: string) => new Date(s).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }), []);
    const formatSmartDate = useCallback((s: string) => {
        const d = new Date(s);
        const tString = formatTime(s);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const target = new Date(d); target.setHours(0, 0, 0, 0);
        if (today.getTime() === target.getTime()) return `Hari ini jam ${tString}`;
        return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${tString}`;
    }, [formatTime]);

    const stateValue = useMemo(() => ({
        store, cart, cartTotal, cartOpen, quantityDialogOpen, selectedProduct, quantity, quantityInputMode,
        nominalAmount, unit, scannerDialogOpen, ticketDialogOpen, lastTicket, submitting, selectedOrder,
        detailsDialogOpen, invoiceDialogOpen, invoiceOrder, processing, productDialogOpen, editingProduct,
        formData, productScannerOpen, loading, pendingOrdersCount, successOrdersCount
    }), [
        store, cart, cartTotal, cartOpen, quantityDialogOpen, selectedProduct, quantity, quantityInputMode,
        nominalAmount, unit, scannerDialogOpen, ticketDialogOpen, lastTicket, submitting, selectedOrder,
        detailsDialogOpen, invoiceDialogOpen, invoiceOrder, processing, productDialogOpen, editingProduct,
        formData, productScannerOpen, loading, pendingOrdersCount, successOrdersCount
    ]);

    const actionsValue = useMemo(() => ({
        fetchStore, addToCart, updateCartQuantity, removeFromCart, clearCart, setCartOpen, setQuantityDialogOpen,
        setSelectedProduct, setQuantity, setQuantityInputMode, setNominalAmount, handleQuantitySubmit,
        handleProductClick, setUnit, setScannerDialogOpen, handleBarcodeScan, setTicketDialogOpen,
        handlePrintBill, setSelectedOrder, setDetailsDialogOpen, setInvoiceDialogOpen, setInvoiceOrder,
        printInvoice, handleViewDetails, handlePrintInvoice, handlePayOrder, handleCancelOrder, setProductDialogOpen,
        setEditingProduct, setFormData, setProductScannerOpen, resetProductForm, openProductDialog, handleProductSubmit,
        handleDeactivateProduct, handleReactivateProduct, handleDeleteProduct, setLoading, formatPrice,
        formatTime, formatDateTime, formatSmartDate,
        refreshProducts: refreshProductsState, setRefreshProducts: (cb: () => void) => setRefreshProducts(() => cb),
        refreshPendingOrders: refreshPendingOrdersState, setRefreshPendingOrders: (cb: () => void) => setRefreshPendingOrders(() => cb),
        setScanOverride: (fn: ((b: string) => void) | null) => { scanOverrideRef.current = fn; },
        setPendingOrdersCount, setSuccessOrdersCount
    }), [
        fetchStore, addToCart, updateCartQuantity, removeFromCart, clearCart, setCartOpen, setQuantityDialogOpen,
        setSelectedProduct, setQuantity, setQuantityInputMode, setNominalAmount, handleQuantitySubmit,
        handleProductClick, setUnit, setScannerDialogOpen, handleBarcodeScan, setTicketDialogOpen,
        handlePrintBill, setSelectedOrder, setDetailsDialogOpen, setInvoiceDialogOpen, setInvoiceOrder,
        printInvoice, handleViewDetails, handlePrintInvoice, handlePayOrder, handleCancelOrder, setProductDialogOpen,
        setEditingProduct, setProductScannerOpen, resetProductForm, openProductDialog, handleProductSubmit,
        handleDeactivateProduct, handleReactivateProduct, handleDeleteProduct, setLoading, formatPrice,
        formatTime, formatDateTime, formatSmartDate, refreshProductsState, refreshPendingOrdersState
    ]);

    return (
        <POSStateContext.Provider value={stateValue}>
            <POSActionsContext.Provider value={actionsValue}>
                {children}
            </POSActionsContext.Provider>
        </POSStateContext.Provider>
    );
}

export function usePOS() {
    const s = useContext(POSStateContext);
    const a = useContext(POSActionsContext);
    if (!s || !a) throw new Error('usePOS must be used within a POSProvider');
    return { ...s, ...a };
}

// Optimized hooks for specific parts of the state to avoid large context re-renders
export function usePOSActions() {
    const context = useContext(POSActionsContext);
    if (!context) throw new Error('usePOSActions must be used within a POSProvider');
    return context;
}

export function usePOSState() {
    const context = useContext(POSStateContext);
    if (!context) throw new Error('usePOSState must be used within a POSProvider');
    return context;
}
