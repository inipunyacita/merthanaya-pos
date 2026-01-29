'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ShoppingCart,
    ClipboardList,
    CheckCircle,
    Package,
    FileText,
    BarChart3,
    Power,
    Menu,
    X,
    LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface NavSection {
    label: string;
    items: {
        href: string;
        label: string;
        icon: React.ElementType;
        badgeCount?: number;
    }[];
}

interface POSSidebarProps {
    pendingCount?: number;
    successCount?: number;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function POSSidebar({ pendingCount = 0, successCount = 0, sidebarOpen, setSidebarOpen }: POSSidebarProps) {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const isAdmin = user?.role === 'admin';

    const closeSidebar = () => setSidebarOpen(false);

    const navSections: NavSection[] = [
        {
            label: 'Order',
            items: [
                { href: '/pos/order', label: 'New Order', icon: Package },
                { href: '/pos/pending', label: 'Pending', icon: ClipboardList, badgeCount: pendingCount },
                { href: '/pos/success', label: 'Success', icon: CheckCircle, badgeCount: successCount },
            ],
        },
        {
            label: 'Product',
            items: [
                { href: '/pos/products', label: 'Manage Product', icon: Package },
            ],
        },
        {
            label: 'Sales',
            items: [
                { href: '/pos/transactions', label: 'Transactions', icon: FileText },
                { href: '/pos/analytics', label: 'Analytics', icon: BarChart3 },
            ],
        },
        {
            label: 'Settings',
            items: [
                { href: '/pos/settings', label: 'Store Settings', icon: Power },
            ],
        },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="xl:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed xl:static inset-y-0 left-0 z-50
                w-56 bg-white border-r border-slate-200 
                flex flex-col shadow-sm
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
            `}>
                {/* Mobile Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between xl:hidden">
                    <h1 className="text-xl font-bold text-slate-800">Menu</h1>
                    <button onClick={closeSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navSections.map((section, sectionIndex) => (
                        <div key={section.label}>
                            {/* Section Label */}
                            <label className="w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all text-slate-600 hover:bg-slate-100">
                                {section.label}
                            </label>

                            {/* Section Items */}
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={closeSidebar}
                                        className={`w-full flex items-center gap-3 px-4 py-1 rounded-lg text-left transition-all ${isActive
                                                ? item.href === '/pos/pending'
                                                    ? 'bg-yellow-100 text-yellow-700 font-medium'
                                                    : item.href === '/pos/success'
                                                        ? 'bg-green-100 text-green-700 font-medium'
                                                        : 'bg-indigo-100 text-indigo-700 font-medium'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badgeCount !== undefined && item.badgeCount > 0 && (
                                            <Badge className={`text-xs ${item.href === '/pos/pending'
                                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                    : 'bg-green-100 text-green-700 border-green-300'
                                                }`}>
                                                {item.badgeCount}
                                            </Badge>
                                        )}
                                    </Link>
                                );
                            })}

                            {/* Separator after each section except the last */}
                            {sectionIndex < navSections.length - 1 && (
                                <hr className="my-3" />
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer Links */}
                <div className="p-3 border-t border-slate-200">
                    <nav className="space-y-1 text-sm">
                        {isAdmin && (
                            <Link
                                href="/admin/products"
                                onClick={closeSidebar}
                                className="block px-4 py-2 text-slate-500 hover:text-indigo-600 transition"
                            >
                                → Admin
                            </Link>
                        )}
                        <button
                            onClick={async () => { closeSidebar(); await signOut(); window.location.href = '/login'; }}
                            className="w-full text-left px-4 py-2 text-red-500 hover:text-red-600 transition flex items-center gap-2"
                        >
                            <LogOut className="h-4 w-4" /> Logout
                        </button>
                    </nav>
                </div>
            </aside>
        </>
    );
}
