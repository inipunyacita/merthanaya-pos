import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CameraCaptureProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCapture: (file: File) => void;
    isUploading?: boolean;
}

export function CameraCapture({ open, onOpenChange, onCapture, isUploading }: CameraCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const capture = useCallback(() => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        // Convert base64 data url to a File object
        fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
            });
    }, [webcamRef, onCapture]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-xl overflow-hidden p-0">
                <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100 relative">
                    <DialogTitle className="text-slate-900 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600" />
                        Take Photo
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Capture a clear photo of the product.
                    </DialogDescription>
                    {/* Radix Dialog comes with its own close button, but we add custom styling below if needed */}
                </DialogHeader>

                <div className="relative bg-black w-full" style={{ minHeight: '300px' }}>
                    {open && (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: facingMode }}
                            className="w-full h-auto object-contain"
                            style={{ maxHeight: '60vh' }}
                        />
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6 px-4">
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={toggleCamera}
                            className="rounded-full bg-slate-800/60 text-white hover:bg-slate-700 backdrop-blur"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </Button>

                        <Button
                            type="button"
                            size="icon"
                            disabled={isUploading}
                            className={`h-16 w-16 rounded-full bg-white text-black hover:bg-slate-100 border-4 border-slate-300 shadow-xl flex items-center justify-center ${isUploading ? 'opacity-50' : ''}`}
                            onClick={capture}
                        >
                            {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            ) : (
                                <div className="h-12 w-12 rounded-full border border-slate-300 bg-white shadow-inner" />
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="rounded-full bg-slate-800/60 text-white hover:bg-slate-700 backdrop-blur"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
