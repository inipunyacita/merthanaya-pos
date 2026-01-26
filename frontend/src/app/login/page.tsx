'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, user, loading: authLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already logged in (using useEffect to avoid setState during render)
    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/select');
        }
    }, [authLoading, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await signIn(email, password);
            if (result.success) {
                router.push('/select');
            } else {
                setError(result.error || 'Invalid credentials');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br white p-4">
            <div className="w-full max-w-md">
                <Card className="bg-white/10 border-white/20 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-1 pb-1">
                        {/* Logo */}
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center"><img src="/merthanayafix.svg" alt="Logo" className='w-24 h-24' /></div>
                            <h1 className="text-3xl font-bold text-black mb-2">POS</h1>
                            <p className="text-gray">Traditional Market Hybrid Point-of-Sales</p>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                                    <p className="text-sm text-red-300 text-center">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white/10 border-white/20 text-black placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400 mb-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-white/10 border-white/20 text-black placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400 pr-10 mb-5"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/3 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button
                                type="submit"
                                disabled={loading || !email || !password}
                                className="w-full bg-amber-500 hover:bg-amber-700 text-black font-bold py-2.5 transition-all duration-200"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="mr-2 h-4 w-4" />
                                        Sign In
                                    </>
                                )}
                            </Button>

                            <Link
                                href="/forgot-password"
                                className="text-sm text-gray hover:text-gray transition text-center"
                            >
                                Forgot your password?
                            </Link>
                        </CardFooter>
                    </form>
                </Card>

                {/* Footer */}
                <footer className="mt-8 text-center text-sm text-gray-500">
                    <p>Built 2026 by Cakatech</p>
                </footer>
            </div>
        </div>
    );
}
