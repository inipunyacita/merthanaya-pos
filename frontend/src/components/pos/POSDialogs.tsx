'use client';

import React, { memo } from 'react';
import { Printer, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { usePOS } from './POSContext';

// --- SUB-COMPONENTS (MEMOIZED) ---

const QuantityDialog = memo(({
    open, setOpen, product, quantity, setQuantity,
    inputMode, setInputMode, nominal, setNominal,
    onSubmit, formatPrice
}: any) => (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[360px] lg:max-w-[420px] xl:max-w-[500px] border-slate-200 shadow-xl">
            <DialogHeader>
                <DialogTitle className="text-slate-800 text-center">Enter Quantity</DialogTitle>
                <DialogDescription className="text-slate-500 text-center">
                    {product?.name} - {formatPrice(product?.price || 0)}/kg
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 flex flex-col">
                <div className="flex justify-end gap-1">
                    <Button
                        variant={inputMode === 'weight' ? 'default' : 'outline'}
                        onClick={() => setInputMode('weight')}
                        className={`flex-1 ${inputMode === 'weight' ? 'bg-indigo-600' : ''}`}
                    >
                        Dari Berat
                    </Button>
                    <Button
                        variant={inputMode === 'nominal' ? 'default' : 'outline'}
                        onClick={() => setInputMode('nominal')}
                        className={`flex-1 ${inputMode === 'nominal' ? 'bg-indigo-600' : ''}`}
                    >
                        Dari Nominal
                    </Button>
                </div>
                {inputMode === 'weight' ? (
                    <div>
                        <Label>Berat (kg)</Label>
                        <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="text-center"
                            autoFocus
                        />
                    </div>
                ) : (
                    <div>
                        <Label>Nominal (Rp)</Label>
                        <Input
                            type="number"
                            value={nominal}
                            onChange={(e) => setNominal(e.target.value)}
                            className="text-center"
                            autoFocus
                        />
                    </div>
                )}
            </div>
            <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={onSubmit} className="bg-green-600 flex-1">Add to Cart</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
));

const TicketDialog = memo(({ open, setOpen, ticket, formatPrice }: any) => (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden">
            <DialogTitle className="sr-only">Order Ticket {ticket?.shortId}</DialogTitle>
            <div className="bg-indigo-600 text-white p-4 text-center">
                <div className="text-4xl font-bold">{ticket?.shortId}</div>
                <div className="text-sm font-mono opacity-80">{ticket?.invoiceId}</div>
            </div>
            <div className="p-4">
                <ScrollArea className="max-h-48">
                    {ticket?.items.map((item: any) => (
                        <div key={item.product.id} className="flex justify-between py-2 border-b">
                            <span className="text-sm">{item.product.name} x{item.quantity}</span>
                            <span className="font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
                        </div>
                    ))}
                </ScrollArea>
            </div>
            <div className="bg-slate-50 p-4 border-t flex justify-between items-center">
                <span className="text-sm">Total</span>
                <span className="text-2xl font-bold text-green-600">{formatPrice(ticket?.total || 0)}</span>
            </div>
            <div className="p-4 pt-0 space-y-2">
                <Button onClick={() => window.print()} variant="outline" className="w-full">Print</Button>
                <Button onClick={() => setOpen(false)} className="w-full bg-indigo-600">Done</Button>
            </div>
        </DialogContent>
    </Dialog>
));

const ScannerDialog = memo(({ open, setOpen, onScan }: any) => (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[420px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ScanLine className="text-indigo-600" />Scan Barcode</DialogTitle>
            </DialogHeader>
            {open && <BarcodeScanner mode="hardware" onScanSuccess={onScan} onClose={() => setOpen(false)} />}
        </DialogContent>
    </Dialog>
));

const OrderDetailsDialog = memo(({ open, setOpen, order, processing, onPay, onCancel, formatPrice }: any) => (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
            <DialogHeader><DialogTitle className="text-yellow-600">{order?.short_id}</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[40vh]">
                {order?.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-2 border-b">
                        <span>{item.product_name} x{item.quantity}</span>
                        <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                    </div>
                ))}
            </ScrollArea>
            <Separator className="my-4" />
            <div className="flex justify-between items-center">
                <span>Total</span>
                <span className="text-2xl font-bold">{formatPrice(order?.total_amount || 0)}</span>
            </div>
            <DialogFooter className="gap-2 shrink-0">
                <Button variant="outline" onClick={() => onCancel(order.id)} disabled={processing} className="text-red-500">Cancel</Button>
                <Button onClick={() => onPay(order.id)} disabled={processing} className="flex-1 bg-green-600">{processing ? '...' : 'Confirm Payment'}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
));

const InvoiceDialog = memo(({ open, setOpen, order, store, formatPrice, formatDateTime }: any) => (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden print:shadow-none">
            <DialogTitle className="sr-only">Invoice {order?.short_id}</DialogTitle>
            <div className="p-6 border-b text-center">
                <h2 className="text-lg font-bold">{store?.name}</h2>
                <p className="text-xs text-slate-500">{store?.address}</p>
                <div className="mt-4 text-2xl font-bold">{order?.short_id}</div>
                <div className="text-xs opacity-70">{order && formatDateTime(order.created_at)}</div>
            </div>
            <div className="p-4">
                {order?.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-1 text-sm">
                        <span>{item.product_name} x{item.quantity}</span>
                        <span>{formatPrice(item.subtotal)}</span>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-between items-center font-bold">
                <span>TOTAL</span>
                <span>{formatPrice(order?.total_amount || 0)}</span>
            </div>
            <div className="p-4 pt-0 flex gap-2 print:hidden">
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Close</Button>
                <Button onClick={() => window.print()} className="flex-1 bg-indigo-600">Print</Button>
            </div>
        </DialogContent>
    </Dialog>
));

// --- MAIN WRAPPER ---
// Only destructures what it needs, and passes strictly necessary props to memoized children.
export function POSDialogs() {
    const {
        quantityDialogOpen, setQuantityDialogOpen, selectedProduct,
        quantity, setQuantity, quantityInputMode, setQuantityInputMode,
        nominalAmount, setNominalAmount, handleQuantitySubmit,
        scannerDialogOpen, setScannerDialogOpen, handleBarcodeScan,
        ticketDialogOpen, setTicketDialogOpen, lastTicket,
        selectedOrder, detailsDialogOpen, setDetailsDialogOpen,
        processing, handlePayOrder, handleCancelOrder,
        invoiceDialogOpen, setInvoiceDialogOpen, store,
        formatPrice, formatDateTime,
    } = usePOS();

    return (
        <>
            <QuantityDialog
                open={quantityDialogOpen} setOpen={setQuantityDialogOpen}
                product={selectedProduct} quantity={quantity} setQuantity={setQuantity}
                inputMode={quantityInputMode} setInputMode={setQuantityInputMode}
                nominal={nominalAmount} setNominal={setNominalAmount}
                onSubmit={handleQuantitySubmit} formatPrice={formatPrice}
            />
            <TicketDialog open={ticketDialogOpen} setOpen={setTicketDialogOpen} ticket={lastTicket} formatPrice={formatPrice} />
            <ScannerDialog open={scannerDialogOpen} setOpen={setScannerDialogOpen} onScan={handleBarcodeScan} />
            <OrderDetailsDialog
                open={detailsDialogOpen} setOpen={setDetailsDialogOpen}
                order={selectedOrder} processing={processing}
                onPay={handlePayOrder} onCancel={handleCancelOrder} formatPrice={formatPrice}
            />
            <InvoiceDialog
                open={invoiceDialogOpen} setOpen={setInvoiceDialogOpen}
                order={selectedOrder} store={store} formatPrice={formatPrice} formatDateTime={formatDateTime}
            />
        </>
    );
}
