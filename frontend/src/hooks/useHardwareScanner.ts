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

            const now = Date.now();
            const gap = now - lastKeyTimeRef.current;

            // Optional skip when user is focused on an input — UNLESS typing is inhumanly fast
            // This allows the scanner to work even if the user accidentally clicked an input box.
            const target = e.target as HTMLElement;
            const isInput = target?.tagName?.toLowerCase() === 'input' || target?.tagName?.toLowerCase() === 'textarea' || target?.isContentEditable;

            // Hardware scanners typically fire chars < 50ms apart. 
            // If the gap is small, we treat it as scanner input regardless of focus.
            const isFastTyping = gap > 0 && gap < scanTimeout;

            if (ignoreWhenInputFocused && isInput && !isFastTyping && e.key !== 'Enter') {
                // Regular human typing in a focused field — clear buffer and ignore
                bufferRef.current = '';
                lastKeyTimeRef.current = now;
                return;
            }

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
                    // Prevent the Enter from submitting forms or adding newline to inputs
                    e.preventDefault();
                    e.stopPropagation();
                    onScanRef.current(barcode);
                }
            } else if (e.key.length === 1) {
                // Single printable character
                bufferRef.current += e.key;

                // If it's fast typing (scanner) in a focused input, we might want to prevent 
                // the characters from appearing in the input field to avoid dual-entry logic lag.
                if (isInput && isFastTyping) {
                    // e.preventDefault(); // This is risky but helps performance on slow devices
                }
            }
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
