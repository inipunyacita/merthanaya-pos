'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Toaster, toast } from 'sonner';
import { Product, ProductCreate, ProductUpdate, PRODUCT_CATEGORIES } from '@/types';
import { productApi } from '@/lib/api';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [formData, setFormData] = useState<ProductCreate>({
        name: '',
        category: 'Sembako',
        price: 0,
        stock: 0,
        barcode: null,
        image_url: null,
        unit_type: 'item',
        is_active: true,
    });

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: { category?: string; search?: string; active_only?: boolean } = {
                active_only: false,
            };
            if (filterCategory && filterCategory !== 'all') {
                params.category = filterCategory;
            }
            if (searchTerm) {
                params.search = searchTerm;
            }
            const response = await productApi.list(params);
            setProducts(response.products);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [filterCategory, searchTerm]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const resetForm = () => {
        setFormData({
            name: '',
            category: 'Sembako',
            price: 0,
            stock: 0,
            barcode: null,
            image_url: null,
            unit_type: 'item',
            is_active: true,
        });
        setEditingProduct(null);
    };

    const openDialog = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                category: product.category,
                price: product.price,
                stock: product.stock,
                barcode: product.barcode,
                image_url: product.image_url,
                unit_type: product.unit_type,
                is_active: product.is_active,
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                const updateData: ProductUpdate = { ...formData };
                await productApi.update(editingProduct.id, updateData);
                toast.success('Product updated successfully');
            } else {
                await productApi.create(formData);
                toast.success('Product created successfully');
            }
            setIsDialogOpen(false);
            resetForm();
            fetchProducts();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to save product');
        }
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Are you sure you want to deactivate "${product.name}"?`)) return;
        try {
            await productApi.delete(product.id);
            toast.success('Product deactivated');
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
            toast.error('Failed to delete product');
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    // Check if category requires barcode (Sembako) or image (Visual items)
    const showBarcode = ['Sembako', 'Minuman'].includes(formData.category);
    const showImage = ['Daging', 'Canang', 'Sayur', 'Buah', 'Jajan'].includes(formData.category);
    const showWeightUnit = ['Daging', 'Sayur', 'Buah'].includes(formData.category);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Toaster richColors position="top-right" />

            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Product Manager</h1>
                            <p className="text-sm text-gray-400">Manage your store inventory</p>
                        </div>
                        <nav className="flex gap-4">
                            <a href="/runner" className="px-4 py-2 text-gray-300 hover:text-white transition">Runner</a>
                            <a href="/cashier" className="px-4 py-2 text-gray-300 hover:text-white transition">Cashier</a>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <Input
                            placeholder="Search products by name or barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {PRODUCT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => openDialog()} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                                + Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/20 text-white">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                                    <DialogDescription className="text-gray-400">
                                        {showBarcode ? 'Barcoded product (Sembako)' : 'Visual product with image'}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    {/* Name */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="col-span-3 bg-white/10 border-white/20"
                                            required
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="category" className="text-right">Category</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                                        >
                                            <SelectTrigger className="col-span-3 bg-white/10 border-white/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRODUCT_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Price */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="price" className="text-right">Price (Rp)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            min="0"
                                            step="500"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                            className="col-span-3 bg-white/10 border-white/20"
                                            required
                                        />
                                    </div>

                                    {/* Stock */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="stock" className="text-right">Stock</Label>
                                        <Input
                                            id="stock"
                                            type="number"
                                            min="0"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                            className="col-span-3 bg-white/10 border-white/20"
                                        />
                                    </div>

                                    {/* Barcode - Only for Sembako */}
                                    {showBarcode && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="barcode" className="text-right">Barcode</Label>
                                            <Input
                                                id="barcode"
                                                value={formData.barcode || ''}
                                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })}
                                                className="col-span-3 bg-white/10 border-white/20"
                                                placeholder="Scan or enter barcode"
                                            />
                                        </div>
                                    )}

                                    {/* Image URL - Only for Visual items */}
                                    {showImage && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="image_url" className="text-right">Image URL</Label>
                                            <Input
                                                id="image_url"
                                                value={formData.image_url || ''}
                                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value || null })}
                                                className="col-span-3 bg-white/10 border-white/20"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    )}

                                    {/* Unit Type - For items sold by weight */}
                                    {showWeightUnit && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="unit_type" className="text-right">Sold by</Label>
                                            <Select
                                                value={formData.unit_type}
                                                onValueChange={(value: 'item' | 'weight') => setFormData({ ...formData, unit_type: value })}
                                            >
                                                <SelectTrigger className="col-span-3 bg-white/10 border-white/20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="item">Per Item</SelectItem>
                                                    <SelectItem value="weight">Per Kg</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Active Toggle */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="is_active" className="text-right">Active</Label>
                                        <div className="col-span-3 flex items-center">
                                            <Switch
                                                id="is_active"
                                                checked={formData.is_active}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                            />
                                            <span className="ml-2 text-sm text-gray-400">
                                                {formData.is_active ? 'Available for sale' : 'Hidden from runners'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500">
                                        {editingProduct ? 'Save Changes' : 'Create Product'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Products Table */}
                <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-300">Name</TableHead>
                                <TableHead className="text-gray-300">Category</TableHead>
                                <TableHead className="text-gray-300">Price</TableHead>
                                <TableHead className="text-gray-300">Stock</TableHead>
                                <TableHead className="text-gray-300">Barcode</TableHead>
                                <TableHead className="text-gray-300">Status</TableHead>
                                <TableHead className="text-gray-300 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        Loading products...
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        No products found. Add your first product!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-3">
                                                {product.image_url && (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="w-10 h-10 rounded-lg object-cover"
                                                    />
                                                )}
                                                {product.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                                                {product.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-green-400 font-mono">
                                            {formatPrice(product.price)}
                                            {product.unit_type === 'weight' && <span className="text-gray-500">/kg</span>}
                                        </TableCell>
                                        <TableCell className="text-gray-300">{product.stock}</TableCell>
                                        <TableCell className="text-gray-400 font-mono text-sm">
                                            {product.barcode || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={product.is_active ? 'default' : 'secondary'}
                                                className={product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                                            >
                                                {product.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openDialog(product)}
                                                className="text-gray-300 hover:text-white hover:bg-white/10"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(product)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Summary */}
                <div className="mt-4 text-sm text-gray-400">
                    Showing {products.length} product{products.length !== 1 ? 's' : ''}
                </div>
            </main>
        </div>
    );
}
