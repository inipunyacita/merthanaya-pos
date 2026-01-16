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
import { Camera, X, Loader2 } from 'lucide-react';

interface CameraDevice {
    id: string;
    label: string;
}

interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError?: (error: string) => void;
    onClose?: () => void;
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

export function BarcodeScanner({ onScanSuccess, onScanError, onClose }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);

    // Track component mount state
    useEffect(() => {
        setIsMounted(true);
        return () => {
            setIsMounted(false);
        };
    }, []);

    // Get available cameras
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
                    // Prefer back camera if available
                    const backCamera = cameraList.find(
                        (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        };
    }, []);

    const startScanning = useCallback(async () => {
        if (!selectedCamera || !containerRef.current) return;

        try {
            setError(null);

            // Create scanner instance if it doesn't exist
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode('barcode-scanner-reader', {
                    formatsToSupport: SUPPORTED_FORMATS,
                    verbose: false,
                });
            }

            setIsScanning(true);

            await scannerRef.current.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.777778,
                },
                (decodedText) => {
                    // Prevent duplicate scans
                    if (decodedText !== lastScanned) {
                        setLastScanned(decodedText);
                        onScanSuccess(decodedText);
                        // Auto-stop after successful scan
                        stopScanning();
                    }
                },
                (errorMessage) => {
                    // This fires frequently when no code is detected - ignore these
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
        if (isScanning) {
            await stopScanning();
        }
        setSelectedCamera(cameraId);
    };

    const handleClose = () => {
        stopScanning();
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
            {/* Camera Selection */}
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

            {/* Scanner Preview Area */}
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

            {/* Error Message */}
            {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Instructions */}
            <p className="text-gray-500 text-sm text-center">
                {isScanning
                    ? 'Point the camera at a barcode to scan'
                    : 'Click "Start Scanning" to begin'}
            </p>

            {/* Controls */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                    Cancel
                </Button>
                {isScanning ? (
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
                )}
            </div>
        </div>
    );
}
