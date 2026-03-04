'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseHardwareScannerOptions {
    /** Called when a valid barcode is detected */
    onScan: (barcode: string) => void;
    /** Whether the listener is active. Set to false to pause listening. Default: true */
    enabled?: boolean;
    /**
     * Max ms between keystrokes to be considered scanner input (not human typing).
     * Hardware scanners typically fire chars < 50ms apart. Default: 100ms
     */
    scanTimeout?: number;
    /** Minimum barcode length to trigger onScan. Default: 4 */
    minLength?: number;
    /**
     * If true, scanner will NOT fire when the currently focused element is an input,
     * textarea, or contenteditable. Default: false (scanner fires globally)
     */
    ignoreWhenInputFocused?: boolean;
}

/**
 * Listens globally for hardware barcode scanner input.
 *
 * Hardware scanners (USB/Bluetooth HID) act like keyboards:
 * - They type each digit very fast (< 50ms per char)
 * - They send Enter at the end
 *
 * This hook collects keystrokes into a buffer and fires `onScan`
 * when Enter is pressed after a rapid sequence of characters.
 */
export function useHardwareScanner({
    onScan,
    enabled = true,
    scanTimeout = 100,
    minLength = 4,
    ignoreWhenInputFocused = false,
}: UseHardwareScannerOptions) {
    const bufferRef = useRef<string>('');
    const lastKeyTimeRef = useRef<number>(0);
    const onScanRef = useRef(onScan);

    // Keep onScan ref updated so we don't need to re-register the listener
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;

            // Optionally skip when user is focused on an input
            if (ignoreWhenInputFocused) {
                const target = e.target as HTMLElement;
                const tagName = target?.tagName?.toLowerCase();
                const isEditable =
                    tagName === 'input' ||
                    tagName === 'textarea' ||
                    target?.isContentEditable;
                if (isEditable) {
                    // Still clear buffer to avoid stale chars bleeding out
                    bufferRef.current = '';
                    lastKeyTimeRef.current = 0;
                    return;
                }
            }

            const now = Date.now();
            const gap = now - lastKeyTimeRef.current;

            // If gap is too large, this isn't a continuation — reset buffer
            if (gap > scanTimeout) {
                bufferRef.current = '';
            }

            lastKeyTimeRef.current = now;

            if (e.key === 'Enter') {
                const barcode = bufferRef.current.trim();
                bufferRef.current = '';
                lastKeyTimeRef.current = 0;

                if (barcode.length >= minLength) {
                    // Prevent the Enter from submitting forms etc.
                    e.preventDefault();
                    e.stopPropagation();
                    onScanRef.current(barcode);
                }
            } else if (e.key.length === 1) {
                // Single printable character
                bufferRef.current += e.key;
            }
            // Ignore modifier keys, arrows, etc.
        },
        [enabled, scanTimeout, minLength, ignoreWhenInputFocused]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [enabled, handleKeyDown]);
}
