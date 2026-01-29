'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, ScanLine, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from 'sonner';
import { POSSidebar } from './POSSidebar';
import { POSCart } from './POSCart';
import { POSDialogs } from './POSDialogs';
import { usePOS } from './POSContext';

interface POSLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    showCart?: boolean;
    showSearch?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function POSLayout({
    children,
    title,
    description,
    showCart = true,
    showSearch = false,
    searchValue = '',
    onSearchChange,
    onSearchKeyDown,
}: POSLayoutProps) {
    const {
        store,
        cart,
        setCartOpen,
        setScannerDialogOpen,
        pendingOrdersCount,
        successOrdersCount,
    } = usePOS();

    const [sidebarOpen, setSidebarOpen] = useState(false);

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

                        <div className="flex items-center gap-2 overflow-hidden">
                            <img src={store?.logo_url || "/merthanayafix.svg"} className="w-16 h-10 sm:w-20 sm:h-12 object-contain" alt="" />
                            <div className="flex flex-col truncate">
                                <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate leading-tight">
                                    {store?.name || 'POS'}
                                </h1>
                                {store?.address && <span className="text-[10px] sm:text-xs text-slate-500 truncate">{store.address}</span>}
                            </div>
                        </div>

                        {/* Search Bar - only when showSearch is true */}
                        {showSearch && (
                            <div className="flex-1 max-w-xl hidden sm:block">
                                <Input
                                    placeholder="Search by name or code..."
                                    value={searchValue}
                                    onChange={(e) => onSearchChange?.(e.target.value)}
                                    onKeyDown={onSearchKeyDown}
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
                        {showCart && (
                            <Button variant="outline" size="sm" onClick={() => setCartOpen(true)}
                                className="xl:hidden relative border-slate-300 text-slate-700 bg-white hover:bg-indigo-50">
                                <ShoppingCart className="h-4 w-4" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {cart.length}
                                    </span>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Mobile Search Bar */}
                    {showSearch && (
                        <div className="mt-3 sm:hidden">
                            <Input
                                placeholder="Search products..."
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                onKeyDown={onSearchKeyDown}
                                className="bg-white border-slate-300 text-slate-800"
                            />
                        </div>
                    )}
                </div>
            </header>

            <div className="flex h-[calc(100vh-60px)]">
                {/* Left Sidebar */}
                <POSSidebar
                    pendingCount={pendingOrdersCount}
                    successCount={successOrdersCount}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                {/* Main Content */}
                <main className="flex-1 overflow-auto py-4 px-4">
                    {children}
                </main>

                {/* Cart Sidebar - Desktop */}
                {showCart && <POSCart />}
            </div>

            {/* Shared Dialogs */}
            <POSDialogs />
        </div>
    );
}
