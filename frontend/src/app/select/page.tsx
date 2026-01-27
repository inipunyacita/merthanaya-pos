'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

function SelectContent() {
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <main className="text-center px-6">
                {/* User Info */}
                <div className="absolute top-4 right-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <User className="h-4 w-4 text-purple-400" />
                        <span className="text-white text-sm">{user?.full_name || user?.email}</span>
                        <span className="px-2 py-0.5 text-xs bg-purple-500/30 text-purple-300 rounded-full ml-2">
                            {user?.role}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>

                {/* Logo */}
                <div className="text-7xl mb-6">🏪</div>

                <h1 className="text-5xl font-bold text-white mb-4 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text">
                    POS
                </h1>

                <p className="text-xl text-gray-400 mb-12 max-w-md mx-auto">
                    Traditional Market Hybrid Point-of-Sales System
                </p>

                {/* Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-6">
                    {/* POS Card - Main */}
                    <Link href="/pos" className="group md:col-span-2">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105">
                            <div className="text-5xl mb-4">🛒</div>
                            <h2 className="text-2xl font-bold text-white mb-2">POS System</h2>
                            <p className="text-gray-400 text-sm">
                                Unified point-of-sale: Browse products, manage cart, and process orders in one place
                            </p>
                            <div className="mt-4 text-indigo-400 group-hover:text-indigo-300 font-medium">
                                Open POS →
                            </div>
                        </div>
                    </Link>

                    {/* Admin Card - Only show for admin users */}
                    {user?.role === 'admin' && (
                        <Link href="/admin/products" className="group md:col-span-2">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                                <div className="text-5xl mb-4">⚙️</div>
                                <h2 className="text-2xl font-bold text-white mb-2">Admin</h2>
                                <p className="text-gray-400 text-sm">
                                    Manage products, inventory, users, and system settings
                                </p>
                                <div className="mt-4 text-purple-400 group-hover:text-purple-300 font-medium">
                                    Open Panel →
                                </div>
                            </div>
                        </Link>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-16 text-sm text-gray-500">
                    <p>Built 2026 by Cakatech</p>
                </footer>
            </main>
        </div>
    );
}

export default function SelectPage() {
    return (
        <ProtectedRoute>
            <SelectContent />
        </ProtectedRoute>
    );
}
