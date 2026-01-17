'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Package,
    BarChart3,
    PackageSearch,
    FileText,
    Home,
    Menu,
    X
} from 'lucide-react';

const navItems = [
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/inventory', label: 'Inventory', icon: PackageSearch },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/transactions', label: 'History', icon: FileText },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            {/* Mobile Hamburger Button - Fixed at top left */}
            <button
                onClick={toggleSidebar}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
                aria-label="Toggle menu"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                w-64 bg-white border-r border-gray-200 
                min-h-screen flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo/Header */}
                <div className="p-4 border-b border-gray-200">
                    <Link href="/" className="flex items-center gap-2" onClick={closeSidebar}>
                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                            <Home className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">Merthanaya</h1>
                            <p className="text-xs text-gray-500">Admin Panel</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={closeSidebar}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                                            ${isActive
                                                ? 'bg-purple-100 text-purple-700 font-medium'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : ''}`} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer Links */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex flex-col gap-2 text-sm">
                        <Link
                            href="/runner"
                            onClick={closeSidebar}
                            className="text-gray-500 hover:text-purple-600 transition-colors"
                        >
                            → Go to Runner
                        </Link>
                        <Link
                            href="/cashier"
                            onClick={closeSidebar}
                            className="text-gray-500 hover:text-purple-600 transition-colors"
                        >
                            → Go to Cashier
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}
