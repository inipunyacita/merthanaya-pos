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

        // SECURITY: Require profile to exist - deny access if no profile found
        if (!profile) {
            console.warn('[signIn] Access denied: User has no profile in users table');
            await supabase.auth.signOut();
            return { user: null, access_token: null, error: 'User profile not found. Please contact administrator.' };
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

// In-memory cache for the user profile to speed up repeated getCurrentUser calls
let _cachedProfile: AuthUser | null = null;

/**
 * Get current user with profile.
 * Uses in-memory cache for the profile to avoid redundant DB lookups.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        // Add timeout to getUser() to prevent hanging on stale sessions
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{ data: { user: null }, error: any }>((resolve) => {
            setTimeout(() => resolve({ data: { user: null }, error: { name: 'TimeoutError', message: 'Auth check timed out' } }), 8000);
        });

        const { data: { user }, error: authError } = await Promise.race([userPromise, timeoutPromise]) as any;

        if (authError) {
            // AuthSessionMissingError is expected when user is not logged in
            if (authError.name === 'AuthSessionMissingError') {
                console.log('[getCurrentUser] No session found');
                _cachedProfile = null;
                return null;
            }
            if (authError.name === 'TimeoutError') {
                console.warn('[getCurrentUser] Auth check timed out');
                return _cachedProfile; // Return cached profile if we have one, better than nothing
            }
            console.error('[getCurrentUser] Auth error:', authError.name);
            return null;
        }

        if (!user) {
            _cachedProfile = null;
            return null;
        }

        // Return cached profile if user ID matches
        if (_cachedProfile && _cachedProfile.id === user.id) {
            return _cachedProfile;
        }

        // Try to get profile from users table (with generous timeout for slow cold starts)
        let profile = null;
        try {
            const profileTimeout = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), 12000); // Increased to 12s
            });

            const profilePromise = supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            const result = await Promise.race([profilePromise, profileTimeout]);

            if (result && 'data' in result && result.data) {
                profile = result.data;
            } else if (result === null) {
                console.warn('[getCurrentUser] Profile fetch timed out, falling back to cache/metadata');
                // If we have a cached profile for this user, keep using it instead of logging out
                if (_cachedProfile && _cachedProfile.id === user.id) return _cachedProfile;
            }
        } catch (e) {
            console.error('[getCurrentUser] Profile fetch error:', e);
        }

        // Only force logout if we explicitly confirmed the user is inactive or the profile is definitely missing
        if (!profile) {
            // If we have no profile AND no cache, we can't proceed
            if (!_cachedProfile || _cachedProfile.id !== user.id) {
                console.error('[getCurrentUser] No profile found and no cache - access denied');
                return null;
            }
            return _cachedProfile;
        }

        if (!profile.is_active) {
            console.error('[getCurrentUser] User is deactivated');
            _cachedProfile = null;
            return null;
        }

        _cachedProfile = {
            id: user.id,
            email: user.email!,
            full_name: profile.full_name,
            role: profile.role,
            is_active: profile.is_active,
        };

        return _cachedProfile;
    } catch (err) {
        console.error('[getCurrentUser] Unexpected error:', err);
        return null;
    }
}

/**
 * Get access token for API requests.
 * Uses in-memory cache first (fast path) — zero latency after first login.
 * Falls back to async Supabase session and then localStorage for older browsers.
 */
export async function getAccessToken(): Promise<string | null> {
    // ── Fast path: synchronous in-memory cache (no async, no overhead) ──
    const { getCachedToken } = await import('./supabase');
    const cached = getCachedToken();
    if (cached) return cached;

    // ── Slow path: async Supabase session (needed on first load or after restart) ──
    try {
        const sessionPromise = getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 8000); // 8s timeout for slow devices
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);
        if (session?.access_token) {
            return session.access_token;
        }

        // ── Fallback: direct localStorage read for Android 9 compat ──
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const raw = localStorage.getItem('merthanaya-auth');
                if (raw) {
                    const stored = JSON.parse(raw);
                    const expiresAt = stored?.expires_at;
                    const nowSeconds = Math.floor(Date.now() / 1000);
                    if (stored?.access_token && expiresAt && expiresAt > nowSeconds) {
                        console.log('[getAccessToken] Used localStorage fallback for token');
                        return stored.access_token;
                    }
                }
            } catch (e) {
                // localStorage not available or JSON parse error
            }
        }

        return null;
    } catch (err) {
        console.warn('[getAccessToken] Failed to fetch session:', err);
        return null;
    }
}
