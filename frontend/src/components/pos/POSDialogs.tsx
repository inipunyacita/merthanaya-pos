'use client';

import { Printer, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { usePOS } from './POSContext';

export function POSDialogs() {
    const {
        // Quantity Dialog
        quantityDialogOpen, setQuantityDialogOpen,
        selectedProduct,
        quantity, setQuantity,
        unit, setUnit,
        quantityInputMode, setQuantityInputMode,
        nominalAmount, setNominalAmount,
        handleQuantitySubmit,

        // Scanner Dialog
        scannerDialogOpen, setScannerDialogOpen,
        handleBarcodeScan,

        // Ticket Dialog
        ticketDialogOpen, setTicketDialogOpen,
        lastTicket,

        // Order Details Dialog
        selectedOrder,
        detailsDialogOpen, setDetailsDialogOpen,
        processing,
        handlePayOrder, handleCancelOrder,

        // Invoice Dialog
        invoiceDialogOpen, setInvoiceDialogOpen,
        store,

        // Helpers
        formatPrice, formatDateTime,
    } = usePOS();

    return (
        <>
            {/* Quantity Dialog */}
            <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
                <DialogContent className="max-w-[360px] lg:max-w-[420px] xl:max-w-[500px] border-slate-200 shadow-xl">
                    <DialogHeader className='max-w-[420px] xl:max-w-[500px]'>
                        <DialogTitle className="text-slate-800 text-center">Enter Quantity</DialogTitle>
                        <DialogDescription className="text-slate-500 text-center">
                            {selectedProduct?.name} - {formatPrice(selectedProduct?.price || 0)}/kg
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full xl:max-w-[500px] py-4 space-y-4 flex flex-col mx-auto">
                        {/* Mode Toggle */}
                        <div className="flex justify-end gap-1">
                            <Button
                                variant={quantityInputMode === 'weight' ? 'default' : 'outline'}
                                onClick={() => setQuantityInputMode('weight')}
                                className={`flex-1 ${quantityInputMode === 'weight' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Dari Berat
                            </Button>
                            <Button
                                variant={quantityInputMode === 'nominal' ? 'default' : 'outline'}
                                onClick={() => setQuantityInputMode('nominal')}
                                className={`flex-1 ${quantityInputMode === 'nominal' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Dari Nominal
                            </Button>
                        </div>

                        {/* Conditional Input */}
                        {quantityInputMode === 'weight' ? (
                            <div>
                                <Label htmlFor="quantity" className="text-slate-700">Berat (kg)</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder='Masukan dengan contoh format 0.5, 0.6 Dst'
                                    className="mt-2 bg-white border-slate-300 text-slate-800 text-center text-md focus:border-indigo-500 focus:ring-indigo-500 w-full"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div>
                                <Label htmlFor="nominal" className="text-slate-700">Nominal (Rp)</Label>
                                <Input
                                    id="nominal"
                                    type="number"
                                    min="100"
                                    step="100"
                                    value={nominalAmount}
                                    onChange={(e) => setNominalAmount(e.target.value)}
                                    placeholder="Masukkan jumlah uang"
                                    className="mt-2 bg-white border-slate-300 text-slate-800 text-center text-md focus:border-indigo-500 focus:ring-indigo-500"
                                    autoFocus
                                />
                                {nominalAmount && parseFloat(nominalAmount) > 0 && selectedProduct && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="text-sm text-slate-600">Estimasi berat:</div>
                                        <div className="text-xl font-bold text-indigo-600">
                                            {(parseFloat(nominalAmount) / selectedProduct.price).toFixed(2)} kg
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="w-full xl:max-w-[500px] flex justify-end sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setQuantityDialogOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100 flex-1">Cancel</Button>
                        <Button onClick={handleQuantitySubmit} className="bg-linear-to-r from-green-500 to-emerald-500 flex-1">Add to Cart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket Success Dialog */}
            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[400px] bg-white border-slate-200 shadow-xl p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Order Ticket {lastTicket?.shortId}</DialogTitle>
                    <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white p-4 text-center">
                        <div className="text-xs uppercase tracking-wider opacity-80">Order Ticket</div>
                        <div className="text-4xl font-bold mt-1">{lastTicket?.shortId}</div>
                        <div className="text-sm font-mono mt-1 opacity-90">{lastTicket?.invoiceId}</div>
                        <div className="text-xs opacity-70 mt-2">{lastTicket?.createdAt?.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </div>
                    <div className="p-4">
                        <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Order Details</div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {lastTicket?.items.map((item) => (
                                <div key={item.product.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-800">{item.product.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {item.quantity} {item.product.unit_type === 'weight' ? 'kg' : item.product.unit_type === 'pcs' ? 'pcs' : 'item'} × {formatPrice(item.product.price)}
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800">{formatPrice(item.product.price * item.quantity)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total ({lastTicket?.items.length || 0} items)</span>
                            <span className="text-2xl font-bold text-green-600">{formatPrice(lastTicket?.total || 0)}</span>
                        </div>
                    </div>
                    <div className="p-4 pt-0 space-y-2">
                        <Button onClick={() => window.print()} variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100">
                            <Printer className="h-4 w-4 mr-2" />Print Ticket
                        </Button>
                        <Button onClick={() => setTicketDialogOpen(false)} className="w-full bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                            ✓ Done - New Order
                        </Button>
                        <p className="text-center text-xs text-slate-400">Present this ticket to cashier for payment</p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Scanner Dialog */}
            <Dialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[450px] bg-white border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 flex items-center gap-2">
                            <ScanLine className="h-5 w-5 text-indigo-600" />Scan Product Barcode
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">Point your camera at a product barcode to add it to cart</DialogDescription>
                    </DialogHeader>
                    {scannerDialogOpen && (
                        <BarcodeScanner onScanSuccess={handleBarcodeScan} onClose={() => setScannerDialogOpen(false)} autoStart />
                    )}
                </DialogContent>
            </Dialog>

            {/* Order Details Dialog (for pending orders) */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[500px] max-h-[85vh] flex flex-col bg-white border-slate-200 shadow-xl">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-3xl text-yellow-600">{selectedOrder?.short_id}</DialogTitle>
                        <DialogDescription className="text-slate-500">Order details and payment</DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="flex-1 overflow-hidden flex flex-col py-2">
                            <ScrollArea className="flex-1 max-h-[40vh] pr-2">
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <div>
                                                <div className="text-slate-800">{item.product_name}</div>
                                                <div className="text-sm text-slate-500">{item.quantity} × {formatPrice(item.price_at_purchase)}</div>
                                            </div>
                                            <div className="text-green-600 font-mono font-semibold">{formatPrice(item.subtotal)}</div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <Separator className="bg-slate-200 my-4 shrink-0" />
                            <div className="flex justify-between items-center shrink-0">
                                <span className="text-xl text-slate-600">Total</span>
                                <span className="text-3xl font-bold text-slate-800">{formatPrice(selectedOrder.total_amount)}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0 pt-2">
                        <Button variant="outline" onClick={() => selectedOrder && handleCancelOrder(selectedOrder.id)} disabled={processing} className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400">Cancel Order</Button>
                        <Button onClick={() => selectedOrder && handlePayOrder(selectedOrder.id)} disabled={processing} className="flex-1 h-12 text-lg bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">{processing ? 'Processing...' : '✅ Confirm Payment'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invoice Dialog (for printing) */}
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                <DialogContent showCloseButton={false} className="max-w-[90vw] sm:max-w-[400px] bg-white border-slate-200 shadow-xl p-0 overflow-hidden print:shadow-none print:border-none">
                    <DialogTitle className="sr-only">Invoice {selectedOrder?.short_id}</DialogTitle>
                    <div className="flex justify-between">
                        <div className="flex flex-col items-center justify-center p-6 border-b border-slate-100 print:pb-4">
                            {store?.logo_url ? (
                                <img src={store.logo_url} alt={store.name} className="h-8 w-auto mb-3 object-contain" />
                            ) : (
                                <img src="/merthanayafix.svg" alt="Default Logo" className="h-12 w-auto mb-3 object-contain" />
                            )}
                            <h2 className="text-xl font-bold text-slate-800">{store?.name}</h2>
                            {store?.address && <p className="text-xs text-slate-500 mt-1">{store.address}</p>}
                            {store?.phone && <p className="text-xs text-slate-500">{store.phone}</p>}
                        </div>

                        <div className="bg-white text-black p-3 text-center print:bg-white print:text-black print:border-y print:border-slate-200">
                            <div className="text-xs uppercase tracking-wider opacity-80 print:opacity-100">Invoice</div>
                            <div className="text-2xl font-bold mt-1">{selectedOrder?.short_id}</div>
                            <div className="text-xs font-mono mt-1 opacity-90">{selectedOrder?.invoice_id}</div>
                            <div className="text-[10px] opacity-70 mt-1 print:opacity-100">{selectedOrder && formatDateTime(selectedOrder.created_at)}</div>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Order Details</div>
                        <ScrollArea className="max-h-48">
                            <div className="space-y-2">
                                {selectedOrder?.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-800">{item.product_name}</div>
                                            <div className="text-xs text-slate-500">{item.quantity} {item.unit === 'kg' ? 'Kg' : item.unit === 'pcs' ? 'Pcs' : item.unit === 'item' ? 'Item' : item.unit} × {formatPrice(item.price_at_purchase)}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-800">{formatPrice(item.subtotal)}</div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-slate-600">Total ({selectedOrder?.items.length || 0} items)</span>
                            <span className="text-xl font-bold text-green-600">{formatPrice(selectedOrder?.total_amount || 0)}</span>
                        </div>
                        {store?.receipt_footer && (
                            <div className="pt-4 border-t border-dashed border-slate-300">
                                <p className="text-xs text-slate-500 italic font-medium">{store.receipt_footer}</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 pt-0 flex gap-2 print:hidden">
                        <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100">Close</Button>
                        <Button onClick={() => window.print()} className="flex-1 bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                            <Printer className="h-4 w-4 mr-2" />Print
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
