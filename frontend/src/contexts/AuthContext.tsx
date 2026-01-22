'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthUser, signIn as authSignIn, signOut as authSignOut, resetPassword as authResetPassword, getCurrentUser } from '@/lib/auth';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        // Check initial auth state
        const initAuth = async () => {
            setLoading(true);
            await refreshUser();
            setLoading(false);
        };

        initAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await refreshUser();
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (event === 'TOKEN_REFRESHED') {
                await refreshUser();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [refreshUser]);

    const signIn = async (email: string, password: string) => {
        const result = await authSignIn({ email, password });
        if (result.user) {
            setUser(result.user);
            return { success: true, error: null };
        }
        return { success: false, error: result.error };
    };

    const signOut = async () => {
        await authSignOut();
        setUser(null);
    };

    const resetPassword = async (email: string) => {
        return await authResetPassword(email);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, resetPassword, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
