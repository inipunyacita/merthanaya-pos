'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Power, PowerOff, Trash2, ChevronLeft, ChevronRight, ScanLine } from 'lucide-react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Scanner state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanMode, setScanMode] = useState<'input' | 'lookup'>('input');

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

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCategory]);

    // Calculate paginated products
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);

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
                toast.success('Product Updated', {
                    description: `"${formData.name}" has been updated successfully`,
                    duration: 3000,
                });
            } else {
                await productApi.create(formData);
                toast.success('Product Created', {
                    description: `"${formData.name}" has been added to inventory`,
                    duration: 3000,
                });
            }
            setIsDialogOpen(false);
            resetForm();
            fetchProducts();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to save product');
        }
    };

    const handleDeactivate = async (product: Product) => {
        if (!confirm(`Are you sure you want to deactivate "${product.name}"?`)) return;
        try {
            await productApi.delete(product.id);
            toast.success('Product Deactivated', {
                description: `"${product.name}" has been deactivated`,
                duration: 3000,
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to deactivate product:', error);
            toast.error('Failed to deactivate product');
        }
    };

    const handleReactivate = async (product: Product) => {
        if (!confirm(`Reactivate "${product.name}"?`)) return;
        try {
            await productApi.update(product.id, { is_active: true });
            toast.success('Product Reactivated', {
                description: `"${product.name}" is now available for sale`,
                duration: 3000,
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to reactivate product:', error);
            toast.error('Failed to reactivate product');
        }
    };

    const handleDeletePerm = async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
        try {
            await productApi.delete(product.id, true);
            toast.success('Product Deleted', {
                description: `"${product.name}" has been deleted`,
                duration: 3000,
            });
            fetchProducts();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            console.error('Failed to delete product:', error);
            toast.error(err.response?.data?.detail || 'Failed to delete product');
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    // Barcode scanner handlers
    const openScanner = (mode: 'input' | 'lookup') => {
        setScanMode(mode);
        setIsScannerOpen(true);
    };

    const handleBarcodeScan = async (barcode: string) => {
        setIsScannerOpen(false);

        if (scanMode === 'input') {
            // Fill the barcode field in the form
            setFormData({ ...formData, barcode });
            toast.success('Barcode Scanned', {
                description: `Barcode "${barcode}" captured`,
                duration: 2000,
            });
        } else if (scanMode === 'lookup') {
            // Try to find product by barcode
            try {
                const product = await productApi.getByBarcode(barcode);
                if (product) {
                    openDialog(product);
                    toast.success('Product Found', {
                        description: `Found "${product.name}"`,
                        duration: 2000,
                    });
                }
            } catch (error) {
                // Product not found - offer to create new
                toast.info('Product Not Found', {
                    description: `No product with barcode "${barcode}". Create a new one?`,
                    duration: 5000,
                    action: {
                        label: 'Create',
                        onClick: () => {
                            resetForm();
                            setFormData((prev) => ({ ...prev, barcode }));
                            setIsDialogOpen(true);
                        },
                    },
                });
            }
        }
    };

    // Check if category requires barcode (Sembako) or image (Visual items)
    const showBarcode = ['Sembako', 'Daging', 'Canang', 'Sayur', 'Buah', 'Jajan', 'Minuman'].includes(formData.category);
    const showImage = ['Sembako', 'Daging', 'Canang', 'Sayur', 'Buah', 'Jajan'].includes(formData.category);
    const showWeightUnit = ['Sembako', 'Daging', 'Sayur', 'Buah'].includes(formData.category);

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster richColors position="top-right" closeButton />

            {/* Header */}
            <header className="border-b border-gray-200 bg-white shadow-sm">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">ADMIN - Merthanaya</h1>
                            <p className="text-sm text-gray-500">Store and Inventory Management Tools</p>
                        </div>
                        <nav className="flex gap-4">
                            <a href="/runner" className="px-4 py-2 text-gray-600 hover:text-gray-900 transition">Runner</a>
                            <a href="/cashier" className="px-4 py-2 text-gray-600 hover:text-gray-900 transition">Cashier</a>
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
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                        />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {PRODUCT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={() => openScanner('lookup')}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        <ScanLine className="h-4 w-4 mr-2" />
                        Scan Product
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => openDialog()} className="bg-purple-600 hover:bg-purple-700 text-white">
                                + Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-white border-gray-200 text-gray-900">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle className="text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                                    <DialogDescription className="text-gray-500">
                                        {showBarcode ? 'Barcoded product (Sembako)' : 'Visual product with image'}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    {/* Barcode - Only for Sembako */}
                                    {showBarcode && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="barcode" className="text-right">Barcode/Code</Label>
                                            <div className="col-span-3 flex gap-2">
                                                <Input
                                                    id="barcode"
                                                    value={formData.barcode || ''}
                                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })}
                                                    className="flex-1 bg-white border-gray-300 text-gray-900"
                                                    placeholder="Enter Code or Scan barcode"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => openScanner('input')}
                                                    className="border-gray-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                                    title="Scan barcode"
                                                >
                                                    <ScanLine className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Name */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="col-span-3 bg-white border-gray-300 text-gray-900"
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
                                            <SelectTrigger className="col-span-3 bg-white border-gray-300 text-gray-900">
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
                                            value={formData.price || ''}
                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            placeholder="0"
                                            className="col-span-3 bg-white border-gray-300 text-gray-900"
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
                                            value={formData.stock || ''}
                                            onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            placeholder="0"
                                            className="col-span-3 bg-white border-gray-300 text-gray-900"
                                        />
                                    </div>

                                    {/* Image URL - Only for Visual items */}
                                    {showImage && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="image_url" className="text-right">Image URL</Label>
                                            <Input
                                                id="image_url"
                                                value={formData.image_url || ''}
                                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value || null })}
                                                className="col-span-3 bg-white border-gray-300 text-gray-900"
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
                                                <SelectTrigger className="col-span-3 bg-white border-gray-300 text-gray-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="item">Per Item</SelectItem>
                                                    <SelectItem value="weight">Per Kg</SelectItem>
                                                    <SelectItem value="pcs">Per Pcs</SelectItem>
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
                                            <span className="ml-2 text-sm text-gray-600">
                                                {formData.is_active ? 'Available for sale' : 'Hidden from runners'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                                        {editingProduct ? 'Save Changes' : 'Create Product'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Products Table */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-100">
                                <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Category</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Price</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Stock</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        Loading products...
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No products found. Add your first product!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedProducts.map((product) => (
                                    <TableRow key={product.id} className="border-gray-200 hover:bg-gray-50">
                                        <TableCell className="text-gray-500 font-mono text-sm">
                                            {product.barcode || '—'}
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">
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
                                            <Badge variant="outline" className="border-purple-500 text-purple-600">
                                                {product.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-green-600 font-mono">
                                            {formatPrice(product.price)}
                                            {product.unit_type === 'weight' ? (
                                                <span className="text-gray-500">/kg</span>
                                            ) : product.unit_type === 'pcs' ? (
                                                <span className="text-gray-500">/pcs</span>
                                            ) : (
                                                <span className="text-gray-500">/item</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-700">
                                            {product.stock}
                                            {product.unit_type === 'weight' ? (
                                                <span className="text-gray-500"> kg</span>
                                            ) : product.unit_type === 'pcs' ? (
                                                <span className="text-gray-500"> pcs</span>
                                            ) : (
                                                <span className="text-gray-500"> item</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={product.is_active ? 'default' : 'secondary'}
                                                className={product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                                            >
                                                {product.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openDialog(product)}
                                                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {product.is_active ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeactivate(product)}
                                                    className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                                    title="Deactivate"
                                                >
                                                    <PowerOff className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReactivate(product)}
                                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                    title="Activate"
                                                >
                                                    <Power className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeletePerm(product)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing {products.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, products.length)} of {products.length} product{products.length !== 1 ? 's' : ''}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className={currentPage === page
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white min-w-8'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100 min-w-8'
                                        }
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* Barcode Scanner Dialog */}
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent className="sm:max-w-[450px] bg-white border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            <ScanLine className="h-5 w-5 text-purple-600" />
                            {scanMode === 'input' ? 'Scan Barcode' : 'Find Product by Barcode'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {scanMode === 'input'
                                ? 'Scan a barcode to fill the barcode field'
                                : 'Scan a product barcode to find and edit it'}
                        </DialogDescription>
                    </DialogHeader>
                    <BarcodeScanner
                        onScanSuccess={handleBarcodeScan}
                        onClose={() => setIsScannerOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
