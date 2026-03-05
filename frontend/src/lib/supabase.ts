import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Key length:', supabaseAnonKey?.length || 0);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'merthanaya-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

// ─── In-memory token cache ─────────────────────────────────────────────────
// Avoids calling supabase.auth.getSession() (async, slow on Android 9)
// on every single API request. Updated automatically via onAuthStateChange.
interface CachedToken {
    token: string;
    expiresAt: number; // unix seconds
}
let _cachedToken: CachedToken | null = null;

// Warm up the cache immediately from any persisted session
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
        _cachedToken = { token: session.access_token, expiresAt: session.expires_at ?? 0 };
    }
});

// Keep cache in sync whenever session changes
supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
        _cachedToken = { token: session.access_token, expiresAt: session.expires_at ?? 0 };
    } else {
        _cachedToken = null;
    }
});

/**
 * Return the cached access token if still valid (with 60s early-refresh buffer).
 * This is synchronous — zero async overhead on every API call.
 */
export function getCachedToken(): string | null {
    if (!_cachedToken) return null;
    const nowSeconds = Math.floor(Date.now() / 1000);
    // Consider token expired 60 seconds early so refresh has time to complete
    if (_cachedToken.expiresAt > nowSeconds + 60) {
        return _cachedToken.token;
    }
    return null;
}
