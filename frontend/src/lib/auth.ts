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

        // Try to get user profile from users table
        let profile = null;
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (!profileError && profileData) {
                profile = profileData;
            }
        } catch (e) {
            console.warn('Could not fetch user profile, using auth metadata');
        }

        // If no profile found, use auth user metadata as fallback
        const userInfo = profile || {
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
            role: data.user.user_metadata?.role || 'admin', // Default to admin for now
            is_active: true,
        };

        if (profile && !profile.is_active) {
            await supabase.auth.signOut();
            return { user: null, access_token: null, error: 'Account is deactivated' };
        }

        return {
            user: {
                id: data.user.id,
                email: data.user.email!,
                full_name: userInfo.full_name,
                role: userInfo.role,
                is_active: userInfo.is_active,
            },
            access_token: data.session.access_token,
            error: null,
        };
    } catch (err) {
        console.error('Sign in error:', err);
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            // AuthSessionMissingError is expected when user is not logged in
            if (authError.name === 'AuthSessionMissingError') {
                return null;
            }
            console.error('[getCurrentUser] Auth error:', authError);
            return null;
        }

        if (!user) {
            return null;
        }

        // Try to get profile from users table (with timeout)
        let profile = null;
        try {
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), 3000);
            });

            const profilePromise = supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            const result = await Promise.race([profilePromise, timeoutPromise]);

            if (result && 'data' in result && result.data) {
                profile = result.data;
            }
        } catch (e) {
            // Silently ignore - will use fallback
        }

        // Use auth user metadata as fallback if profile not available
        const userInfo = profile || {
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: user.user_metadata?.role || 'admin',
            is_active: true,
        };

        if (profile && !profile.is_active) {
            return null;
        }

        return {
            id: user.id,
            email: user.email!,
            full_name: userInfo.full_name,
            role: userInfo.role,
            is_active: userInfo.is_active,
        };
    } catch (err) {
        console.error('[getCurrentUser] Unexpected error:', err);
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
