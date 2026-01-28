'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await resetPassword(email);
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || 'Failed to send reset email');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🔐</div>
                    <h1 className="text-3xl font-bold text-black mb-2">Reset Password</h1>
                    <p className="text-gray">We&apos;ll send you a link to reset your password</p>
                </div>

                <Card className="bg-white/10 border-white/20 backdrop-blur-xl shadow-2xl">
                    {success ? (
                        <>
                            <CardHeader className="space-y-1 pb-4">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <CheckCircle className="h-8 w-8 text-green-400" />
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold text-black text-center">Check Your Email</CardTitle>
                                <CardDescription className="text-gray text-center">
                                    If an account exists with <span className="text-purple-600">{email}</span>, you will receive a password reset link shortly.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="flex flex-col space-y-4">
                                <Link href="/login" className="w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full border-white/20 bg-amber-400 text-black hover:bg-white hover:border-black"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Login
                                    </Button>
                                </Link>
                            </CardFooter>
                        </>
                    ) : (
                        <>
                            <CardHeader className="space-y-1 pb-4">
                                <CardTitle className="text-2xl font-bold text-black text-center">Forgot Password</CardTitle>
                                <CardDescription className="text-gray-400 text-center">
                                    Enter your email address and we&apos;ll send you a reset link
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-4">
                                    {error && (
                                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                                            <p className="text-sm text-red-300 text-center">{error}</p>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-4">
                                        <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400"
                                        />
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col space-y-4">
                                    <Button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 transition-all duration-200"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="mr-2 h-4 w-4" />
                                                Send Reset Link
                                            </>
                                        )}
                                    </Button>

                                    <Link
                                        href="/login"
                                        className="text-sm text-purple-400 hover:text-purple-300 transition text-center flex items-center justify-center gap-1"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Login
                                    </Link>
                                </CardFooter>
                            </form>
                        </>
                    )}
                </Card>

                {/* Footer */}
                <footer className="mt-8 text-center text-sm text-gray-500">
                    <p>Built 2026 by Cakatech</p>
                </footer>
            </div>
        </div>
    );
}
