'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Camera, X, Loader2, ScanBarcode, Wifi } from 'lucide-react';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';

interface CameraDevice {
    id: string;
    label: string;
}

interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError?: (error: string) => void;
    onClose?: () => void;
    autoStart?: boolean;
    /** 'hardware' uses USB/Bluetooth HID scanner input. 'camera' uses the device camera. Default: 'hardware' */
    mode?: 'hardware' | 'camera';
}

const SUPPORTED_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.QR_CODE,
];

// ─── Hardware Mode UI ────────────────────────────────────────────────────────

function HardwareScannerUI({
    onScanSuccess,
    onClose,
}: {
    onScanSuccess: (barcode: string) => void;
    onClose?: () => void;
}) {
    const [lastScanned, setLastScanned] = useState<string>('');
    const [flash, setFlash] = useState(false);

    const handleScan = useCallback(
        (barcode: string) => {
            setLastScanned(barcode);
            setFlash(true);
            setTimeout(() => setFlash(false), 600);
            onScanSuccess(barcode);
        },
        [onScanSuccess]
    );

    useHardwareScanner({ onScan: handleScan, enabled: true });

    return (
        <div className="flex flex-col gap-5">
            {/* Status Indicator */}
            <div
                className={`flex flex-col items-center justify-center rounded-xl py-10 transition-all duration-300 ${flash
                        ? 'bg-green-50 border-2 border-green-400'
                        : 'bg-slate-50 border-2 border-dashed border-slate-300'
                    }`}
            >
                <div
                    className={`rounded-full p-4 transition-all duration-300 ${flash ? 'bg-green-100' : 'bg-indigo-100'
                        }`}
                >
                    <ScanBarcode
                        className={`h-12 w-12 transition-colors duration-300 ${flash ? 'text-green-600' : 'text-indigo-500'
                            }`}
                    />
                </div>

                <div className="mt-4 text-center">
                    {flash ? (
                        <>
                            <p className="font-semibold text-green-700 text-lg">Barcode Detected!</p>
                            <p className="font-mono text-green-600 text-sm mt-1">{lastScanned}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-slate-700">Scanner Ready</p>
                            <p className="text-slate-500 text-sm mt-1">
                                Scan a product barcode with your scanner
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Connected badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <Wifi className="h-3.5 w-3.5" />
                Hardware scanner connected
            </div>

            {/* Close */}
            <Button
                variant="outline"
                onClick={onClose}
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
            >
                <X className="h-4 w-4 mr-2" />
                Close
            </Button>
        </div>
    );
}

// ─── Camera Mode UI ──────────────────────────────────────────────────────────

function CameraScannerUI({
    onScanSuccess,
    onScanError,
    onClose,
    autoStart = false,
}: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const getCameras = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                    const cameraList = devices.map((device) => ({
                        id: device.id,
                        label: device.label || `Camera ${device.id}`,
                    }));
                    setCameras(cameraList);
                    const backCamera = cameraList.find(
                        (c) =>
                            c.label.toLowerCase().includes('back') ||
                            c.label.toLowerCase().includes('rear')
                    );
                    setSelectedCamera(backCamera?.id || cameraList[0].id);
                } else {
                    setError('No cameras found on this device');
                }
            } catch (err) {
                console.error('Failed to get cameras:', err);
                setError('Camera access denied. Please allow camera permissions.');
            } finally {
                setIsLoading(false);
            }
        };
        getCameras();
    }, [isMounted]);

    useEffect(() => {
        if (autoStart && selectedCamera && !isScanning && !isLoading && !error) {
            startScanning();
        }
    }, [autoStart, selectedCamera, isLoading, error]);

    useEffect(() => {
        return () => {
            const cleanup = async () => {
                if (scannerRef.current) {
                    try {
                        if (scannerRef.current.isScanning) {
                            await scannerRef.current.stop();
                        }
                        scannerRef.current.clear();
                    } catch (err) {
                        console.error('Error during scanner cleanup:', err);
                    }
                    scannerRef.current = null;
                }
            };
            cleanup();
        };
    }, []);

    const startScanning = useCallback(async () => {
        if (!selectedCamera || !containerRef.current) return;
        try {
            setError(null);
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode('barcode-scanner-reader', {
                    formatsToSupport: SUPPORTED_FORMATS,
                    verbose: false,
                });
            }
            setIsScanning(true);
            await scannerRef.current.start(
                selectedCamera,
                { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.777778 },
                (decodedText) => {
                    if (decodedText !== lastScanned) {
                        setLastScanned(decodedText);
                        onScanSuccess?.(decodedText);
                        stopScanning();
                    }
                },
                (errorMessage) => {
                    if (onScanError && !errorMessage.includes('No MultiFormat Readers')) {
                        onScanError(errorMessage);
                    }
                }
            );
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError('Failed to start camera. Please try again.');
            setIsScanning(false);
        }
    }, [selectedCamera, lastScanned, onScanSuccess, onScanError]);

    const stopScanning = useCallback(async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (err) {
                console.error('Failed to stop scanner:', err);
            }
        }
        setIsScanning(false);
    }, []);

    const handleCameraChange = async (cameraId: string) => {
        if (isScanning) await stopScanning();
        setSelectedCamera(cameraId);
    };

    const handleClose = async () => {
        await stopScanning();
        onClose?.();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="mt-4 text-gray-500">Initializing camera...</p>
            </div>
        );
    }

    if (error && cameras.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Camera className="h-12 w-12 text-gray-400" />
                <p className="mt-4 text-red-500 text-center">{error}</p>
                <Button variant="outline" onClick={handleClose} className="mt-4">
                    Close
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4" ref={containerRef}>
            <div className="flex items-center gap-2">
                <Select value={selectedCamera} onValueChange={handleCameraChange} disabled={isScanning}>
                    <SelectTrigger className="flex-1 bg-white border-gray-300">
                        <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                        {cameras.map((camera) => (
                            <SelectItem key={camera.id} value={camera.id}>
                                {camera.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                <div id="barcode-scanner-reader" className="w-full" />
                {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                        <div className="text-center">
                            <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                            <p className="text-gray-300 mt-2">Camera preview will appear here</p>
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <p className="text-gray-500 text-sm text-center">
                {isScanning
                    ? 'Point the camera at a barcode to scan'
                    : autoStart
                        ? 'Starting camera...'
                        : 'Click "Start Scanning" to begin'}
            </p>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={handleClose}
                    className={
                        autoStart
                            ? 'w-full border-gray-300 text-gray-700 hover:bg-gray-100'
                            : 'flex-1 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }
                >
                    Cancel
                </Button>
                {!autoStart &&
                    (isScanning ? (
                        <Button
                            onClick={stopScanning}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            Stop Scanning
                        </Button>
                    ) : (
                        <Button
                            onClick={startScanning}
                            disabled={!selectedCamera}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Start Scanning
                        </Button>
                    ))}
            </div>
        </div>
    );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function BarcodeScanner({
    onScanSuccess,
    onScanError,
    onClose,
    autoStart = false,
    mode = 'hardware',
}: BarcodeScannerProps) {
    if (mode === 'hardware') {
        return <HardwareScannerUI onScanSuccess={onScanSuccess} onClose={onClose} />;
    }

    return (
        <CameraScannerUI
            onScanSuccess={onScanSuccess}
            onScanError={onScanError}
            onClose={onClose}
            autoStart={autoStart}
            mode={mode}
        />
    );
}
