/**
 * Authentication utilities using Supabase Auth
 */
import { supabase } from './supabase';

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'staff';
    is_active: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: AuthUser | null;
    access_token: string | null;
    error: string | null;
}

/**
 * Sign in with email and password
 */
export async function signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });

        if (error) {
            return { user: null, access_token: null, error: error.message };
        }

        if (!data.user || !data.session) {
            return { user: null, access_token: null, error: 'Login failed' };
        }

        // Get user profile from users table
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            return { user: null, access_token: null, error: 'User profile not found' };
        }

        if (!profile.is_active) {
            await supabase.auth.signOut();
            return { user: null, access_token: null, error: 'Account is deactivated' };
        }

        return {
            user: {
                id: data.user.id,
                email: data.user.email!,
                full_name: profile.full_name,
                role: profile.role,
                is_active: profile.is_active,
            },
            access_token: data.session.access_token,
            error: null,
        };
    } catch (err) {
        return { user: null, access_token: null, error: 'An error occurred during login' };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch {
        return { success: false, error: 'An error occurred' };
    }
}

/**
 * Get current session
 */
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Get current user with profile
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_active) return null;

        return {
            id: user.id,
            email: user.email!,
            full_name: profile.full_name,
            role: profile.role,
            is_active: profile.is_active,
        };
    } catch {
        return null;
    }
}

/**
 * Get access token for API requests
 */
export async function getAccessToken(): Promise<string | null> {
    const session = await getSession();
    return session?.access_token || null;
}
