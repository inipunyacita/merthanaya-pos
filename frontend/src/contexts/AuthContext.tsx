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
            // Only update if we got a valid user, don't clear on null/error
            // This prevents race conditions from logging out the user
            if (currentUser) {
                console.log('[AuthContext] refreshUser: Got user', currentUser.email);
                setUser(currentUser);
            } else {
                console.log('[AuthContext] refreshUser: No user returned (keeping current state if any)');
                // Don't setUser(null) here - let onAuthStateChange handle sign-out events
            }
        } catch (e) {
            console.error('[AuthContext] refreshUser error (keeping current user state):', e);
            // Don't setUser(null) on errors - this was causing the auto-logout
        }
    }, []);

    useEffect(() => {
        // Check initial auth state
        const initAuth = async () => {
            console.log('[AuthContext] Starting auth initialization...');
            setLoading(true);

            // Safety timeout for the entire initialization
            const initTimeout = setTimeout(() => {
                if (loading) {
                    console.warn('[AuthContext] Auth initialization taking too long, forcing loading to false');
                    setLoading(false);
                }
            }, 5000); // 5s absolute maximum wait

            try {
                await refreshUser();
                console.log('[AuthContext] Auth initialized successfully');
            } catch (error) {
                console.error('[AuthContext] Auth init error:', error);
            } finally {
                clearTimeout(initTimeout);
                console.log('[AuthContext] Setting loading to false');
                setLoading(false);
            }
        };

        initAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthContext] Auth state change:', event);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session) {
                    await refreshUser();
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
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
        try {
            await authSignOut();
            // Force clear local storage just in case Supabase client misses something
            if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) localStorage.removeItem(key);
                });
            }
        } catch (err) {
            console.error('[AuthContext] Sign out error:', err);
        } finally {
            setUser(null);
        }
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
