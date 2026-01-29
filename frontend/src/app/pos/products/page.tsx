'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Pencil, PowerOff, Power, Trash2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Product, PRODUCT_CATEGORIES } from '@/types';
import { productApi } from '@/lib/api';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { POSLayout, usePOS } from '@/components/pos';
import { toast } from 'sonner';

const MANAGE_PAGE_SIZE = 10;

export default function ManageProductsPage() {
    const {
        formatPrice,
        productDialogOpen, setProductDialogOpen,
        editingProduct,
        formData, setFormData,
        productScannerOpen, setProductScannerOpen,
        openProductDialog,
        handleProductSubmit,
        handleDeactivateProduct,
        handleReactivateProduct,
        handleDeleteProduct,
        setRefreshProducts,
    } = usePOS();

    const [managedProducts, setManagedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [manageSearch, setManageSearch] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [totalManagedProducts, setTotalManagedProducts] = useState(0);
    const [showBarcode, setShowBarcode] = useState(false);

    const fetchManagedProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page: productPage, page_size: MANAGE_PAGE_SIZE, search: manageSearch || undefined, include_inactive: true };
            const response = await productApi.list(params);
            setManagedProducts(response.products);
            setTotalManagedProducts(response.total);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [productPage, manageSearch]);

    useEffect(() => {
        fetchManagedProducts();
        setRefreshProducts(fetchManagedProducts);
    }, [fetchManagedProducts, setRefreshProducts]);

    const managedTotalPages = Math.ceil(totalManagedProducts / MANAGE_PAGE_SIZE);

    return (
        <POSLayout title="📦 Manage Products" description={`${totalManagedProducts} product${totalManagedProducts !== 1 ? 's' : ''}`} showCart={false}>
            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="hidden sm:block" /> {/* Spacer */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Search products..."
                        value={manageSearch}
                        onChange={(e) => { setManageSearch(e.target.value); setProductPage(1); }}
                        className="w-full sm:w-48 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                    />
                    <Button onClick={() => openProductDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                        <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Add</span>
                    </Button>
                </div>
            </div>

            {/* Products Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
                <Table className="min-w-[600px]">
                    <TableHeader>
                        <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-100">
                            <TableHead className="text-slate-700 font-semibold">Code</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Name</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Category</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Price</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Stock</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                            <TableHead className="text-slate-700 font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading products...</TableCell>
                            </TableRow>
                        ) : managedProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No products found. Add your first product!</TableCell>
                            </TableRow>
                        ) : (
                            managedProducts.map((product) => (
                                <TableRow key={product.id} className="border-slate-200 hover:bg-slate-50">
                                    <TableCell className="text-slate-500 font-mono text-sm">{product.barcode || '—'}</TableCell>
                                    <TableCell className="font-medium text-slate-900 whitespace-normal min-w-[150px] px-4">
                                        <p className="font-medium">{product.name}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-indigo-500 text-indigo-600">{product.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-green-600 font-mono">
                                        {formatPrice(product.price)}
                                        {product.unit_type === 'weight' ? <span className="text-slate-500">/kg</span> : product.unit_type === 'pcs' ? <span className="text-slate-500">/pcs</span> : <span className="text-slate-500">/item</span>}
                                    </TableCell>
                                    <TableCell className="text-slate-700">
                                        {product.stock}
                                        {product.unit_type === 'weight' ? <span className="text-slate-500"> kg</span> : product.unit_type === 'pcs' ? <span className="text-slate-500"> pcs</span> : <span className="text-slate-500"> item</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={product.is_active ? 'default' : 'secondary'} className={product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                                            {product.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openProductDialog(product)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100" title="Edit">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {product.is_active ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleDeactivateProduct(product)} className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50" title="Deactivate">
                                                <PowerOff className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleReactivateProduct(product)} className="text-green-500 hover:text-green-600 hover:bg-green-50" title="Activate">
                                                <Power className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {managedTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                    <Button variant="outline" size="sm" onClick={() => setProductPage(prev => Math.max(1, prev - 1))} disabled={productPage === 1} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                        <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <span className="text-sm text-slate-600">{productPage} / {managedTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setProductPage(prev => Math.min(managedTotalPages, prev + 1))} disabled={productPage >= managedTotalPages} className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                        <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Product Form Dialog */}
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 text-slate-900">
                    <form onSubmit={handleProductSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                {showBarcode ? 'Barcoded product' : 'Product information'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Barcode Toggle */}
                            <div className="flex items-center gap-2">
                                <Switch checked={showBarcode} onCheckedChange={setShowBarcode} />
                                <Label className="text-slate-600">Has Barcode</Label>
                            </div>
                            {/* Barcode */}
                            {showBarcode && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="barcode" className="text-right">Code</Label>
                                    <div className="col-span-3 flex gap-2">
                                        <Input
                                            id="barcode"
                                            value={formData.barcode || ''}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })}
                                            className="flex-1 bg-white border-slate-300 text-slate-900"
                                            placeholder="Enter barcode or code"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setProductScannerOpen(true)}
                                            className="border-slate-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
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
                                    className="col-span-3 bg-white border-slate-300 text-slate-900"
                                    required
                                />
                            </div>
                            {/* Category */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                    <SelectTrigger className="col-span-3 bg-white border-slate-300 text-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRODUCT_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Unit Type */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit_type" className="text-right">Unit</Label>
                                <Select value={formData.unit_type || 'item'} onValueChange={(value) => setFormData({ ...formData, unit_type: value as 'item' | 'weight' | 'pcs' })}>
                                    <SelectTrigger className="col-span-3 bg-white border-slate-300 text-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="item">Item</SelectItem>
                                        <SelectItem value="weight">Weight (kg)</SelectItem>
                                        <SelectItem value="pcs">Pieces</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Price */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Price (Rp)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.price || ''}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                    className="col-span-3 bg-white border-slate-300 text-slate-900"
                                    required
                                />
                            </div>
                            {/* Stock */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">Stock</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    value={formData.stock || ''}
                                    onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                                    onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                    className="col-span-3 bg-white border-slate-300 text-slate-900"
                                    step={formData.unit_type === 'weight' ? '0.1' : '1'}
                                />
                            </div>
                            {/* Active Toggle */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Status</Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <span className="text-slate-700">{formData.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{editingProduct ? 'Update' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Product Scanner Dialog */}
            <Dialog open={productScannerOpen} onOpenChange={setProductScannerOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[450px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 flex items-center gap-2">
                            <ScanLine className="h-5 w-5 text-indigo-600" />Scan Product Barcode
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">Point your camera at a barcode</DialogDescription>
                    </DialogHeader>
                    {productScannerOpen && (
                        <BarcodeScanner
                            onScanSuccess={(code) => {
                                setFormData({ ...formData, barcode: code });
                                setProductScannerOpen(false);
                            }}
                            onClose={() => setProductScannerOpen(false)}
                            autoStart
                        />
                    )}
                </DialogContent>
            </Dialog>
        </POSLayout>
    );
}
