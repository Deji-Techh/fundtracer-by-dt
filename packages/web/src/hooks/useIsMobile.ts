import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile devices based on screen width.
 * Returns true if viewport width < 640px.
 */
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() => {
        // Initialize with actual check instead of false to prevent mobile flash
        return typeof window !== 'undefined' && window.innerWidth < 640;
    });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

/**
 * Hook to detect tablet devices.
 * Returns true if viewport width >= 768px and < 1024px.
 */
export function useIsTablet(): boolean {
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        const checkTablet = () => {
            const width = window.innerWidth;
            setIsTablet(width >= 768 && width < 1024);
        };

        checkTablet();
        window.addEventListener('resize', checkTablet);
        return () => window.removeEventListener('resize', checkTablet);
    }, []);

    return isTablet;
}
