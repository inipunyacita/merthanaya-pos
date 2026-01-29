'use client';

import { X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from './POSContext';

interface CartItemRowProps {
    item: {
        product: {
            id: string;
            name: string;
            price: number;
            unit_type?: string;
        };
        quantity: number;
    };
    formatPrice: (price: number) => string;
    updateCartQuantity: (productId: string, qty: number) => void;
    removeFromCart: (productId: string) => void;
    compact?: boolean;
}

function CartItemRow({ item, formatPrice, updateCartQuantity, removeFromCart, compact }: CartItemRowProps) {
    const step = item.product.unit_type === 'weight' ? 0.1 : 1;
    const unitLabel = item.product.unit_type === 'weight' ? 'kg' : item.product.unit_type === 'pcs' ? 'pcs' : 'item';

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
                <h4 className={`text-slate-800 text-sm font-medium ${compact ? 'truncate' : ''} flex-1`}>
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
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - step)}
                    >
                        -
                    </Button>
                    <span className="text-slate-800 w-12 text-center font-medium">
                        {item.quantity}
                        <span className="text-gray-500"> {unitLabel}</span>
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + step)}
                    >
                        +
                    </Button>
                </div>
                <span className="text-green-600 font-mono text-sm font-semibold">
                    {formatPrice(item.product.price * item.quantity)}
                </span>
            </div>
        </div>
    );
}

export function POSCart() {
    const {
        cart,
        cartTotal,
        clearCart,
        updateCartQuantity,
        removeFromCart,
        cartOpen,
        setCartOpen,
        submitting,
        handlePrintBill,
        formatPrice,
    } = usePOS();

    return (
        <>
            {/* Desktop Cart Sidebar */}
            <aside className="hidden xl:flex w-80 max-w-80 border-l border-slate-200 bg-white/90 backdrop-blur-xl flex-col shadow-lg h-full overflow-hidden">
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
                            <div className="text-center text-slate-400 py-8">Cart is empty</div>
                        ) : (
                            <div className="space-y-3 max-w-72">
                                {cart.map((item) => (
                                    <CartItemRow
                                        key={item.product.id}
                                        item={item}
                                        formatPrice={formatPrice}
                                        updateCartQuantity={updateCartQuantity}
                                        removeFromCart={removeFromCart}
                                    />
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
                    <Button
                        className="w-full h-14 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        onClick={handlePrintBill}
                        disabled={cart.length === 0 || submitting}
                    >
                        {submitting ? 'Processing...' : 'Submit'}
                    </Button>
                </div>
            </aside>

            {/* Mobile Cart FAB */}
            <button
                onClick={() => setCartOpen(true)}
                className="xl:hidden fixed bottom-4 right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
            >
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {cart.length}
                    </span>
                )}
            </button>

            {/* Mobile Cart Overlay */}
            {cartOpen && (
                <div
                    className="xl:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={() => setCartOpen(false)}
                />
            )}

            {/* Mobile Cart Sheet */}
            <div
                className={`xl:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 flex flex-col ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: '75vh' }}
            >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Cart ({cart.length})</h2>
                    <div className="flex items-center gap-2">
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
                        <button onClick={() => setCartOpen(false)} className="p-2">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <ScrollArea className="flex-1 overflow-auto">
                    <div className="p-4">
                        {cart.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">Cart is empty</div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <CartItemRow
                                        key={item.product.id}
                                        item={item}
                                        formatPrice={formatPrice}
                                        updateCartQuantity={updateCartQuantity}
                                        removeFromCart={removeFromCart}
                                        compact
                                    />
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
                    <Button
                        className="w-full h-12 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        onClick={handlePrintBill}
                        disabled={cart.length === 0 || submitting}
                    >
                        {submitting ? 'Processing...' : 'Submit Order'}
                    </Button>
                </div>
            </div>
        </>
    );
}
