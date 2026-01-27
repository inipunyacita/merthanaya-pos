'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Store, StoreUpdate } from '@/types';
import { storeApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, Store as StoreIcon, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface StoreSettingsProps {
    store: Store | null;
    onUpdate: () => void;
}

export function StoreSettings({ store, onUpdate }: StoreSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState<StoreUpdate>({
        name: '',
        logo_url: '',
        address: '',
        phone: '',
        receipt_footer: '',
    });

    useEffect(() => {
        if (store) {
            setFormData({
                name: store.name || '',
                address: store.address || '',
                phone: store.phone || '',
                receipt_footer: store.receipt_footer || '',
            });
        }
    }, [store]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !store) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image size must be less than 2MB');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${store.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('store-assets')
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('store-assets')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, logo_url: publicUrl }));
            toast.success('Logo uploaded successfully. Save changes to apply.');
        } catch (error) {
            console.error('Logo upload error:', error);
            toast.error('Failed to upload logo. Make sure a "store-assets" bucket exists in Supabase.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, logo_url: null }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await storeApi.updateMe(formData);
            toast.success('Store settings updated successfully');
            onUpdate();
        } catch (error) {
            console.error('Failed to update store settings:', error);
            toast.error('Failed to update store settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <StoreIcon className="h-8 w-8 text-indigo-600" />
                    Store Identity
                </h1>
                <p className="text-slate-500 mt-2">Manage your store's information for displays and receipts.</p>
            </header>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo Section */}
                    <Card className="bg-white border-slate-200 shadow-sm md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Store Logo</CardTitle>
                            <CardDescription>Upload your brand logo (min 200x200px recommended).</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 transition-colors group-hover:border-indigo-300">
                                    {formData.logo_url ? (
                                        <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                            <span className="text-xs text-slate-400 font-medium">No Logo</span>
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                {formData.logo_url && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="mt-6 w-full">
                                <Label htmlFor="logo-upload" className="w-full">
                                    <div className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                                        <Upload className="h-4 w-4 text-indigo-600" />
                                        {formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                                    </div>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                        disabled={uploading}
                                    />
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Basic Info */}
                    <Card className="bg-white border-slate-200 shadow-sm md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">General Information</CardTitle>
                            <CardDescription>Primary identification for your store.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="store-name">Store Name</Label>
                                <Input
                                    id="store-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter your store name"
                                    className="bg-white border-slate-300"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="store-phone">Phone Number</Label>
                                    <Input
                                        id="store-phone"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+62..."
                                        className="bg-white border-slate-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="store-address">Store Address</Label>
                                    <Input
                                        id="store-address"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Street name, City..."
                                        className="bg-white border-slate-300"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Receipt Configuration */}
                    <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">Receipt & Display</CardTitle>
                            <CardDescription>Configure how your store appears on printed receipts.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="receipt-footer">Receipt Footer Message</Label>
                                <Input
                                    id="receipt-footer"
                                    value={formData.receipt_footer || ''}
                                    onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                                    placeholder="Thank you for shopping!"
                                    className="bg-white border-slate-300"
                                />
                                <p className="text-xs text-slate-400">This message appears at the bottom of every receipt.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-8 h-12 text-lg shadow-lg shadow-indigo-200"
                    >
                        {loading ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="mr-2 h-5 w-5" /> Save Changes</>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
