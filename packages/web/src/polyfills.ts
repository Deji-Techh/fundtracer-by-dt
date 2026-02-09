import { Buffer } from 'buffer';

// Polyfill Buffer
if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}

// Polyfill Global
if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
    window.global = window;
}

// Polyfill process
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
    window.process = {
        env: {},
        version: '',
        nextTick: (cb: () => void) => setTimeout(cb, 0),
    } as any;
}

// WebSocket polyfill and mobile compatibility fixes
if (typeof window !== 'undefined') {
    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket;
    
    // Enhanced WebSocket with reconnection and better error handling for mobile
    class MobileCompatibleWebSocket extends OriginalWebSocket {
        private reconnectAttempts = 0;
        private maxReconnectAttempts = 3;
        private reconnectDelay = 1000;
        private url: string;
        private protocols?: string | string[];
        
        constructor(url: string | URL, protocols?: string | string[]) {
            const urlString = url.toString();
            console.log('[WebSocket] Creating connection to:', urlString);
            super(urlString, protocols);
            this.url = urlString;
            this.protocols = protocols;
            
            // Add connection timeout for mobile
            const connectionTimeout = setTimeout(() => {
                if (this.readyState === WebSocket.CONNECTING) {
                    console.warn('[WebSocket] Connection timeout, closing...');
                    this.close();
                }
            }, 15000); // 15 second timeout
            
            this.addEventListener('open', () => {
                console.log('[WebSocket] Connected successfully');
                this.reconnectAttempts = 0;
                clearTimeout(connectionTimeout);
            });
            
            this.addEventListener('error', (error) => {
                console.error('[WebSocket] Error:', error);
                clearTimeout(connectionTimeout);
            });
            
            this.addEventListener('close', (event) => {
                clearTimeout(connectionTimeout);
                if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[WebSocket] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    setTimeout(() => {
                        try {
                            new MobileCompatibleWebSocket(this.url, this.protocols);
                        } catch (e) {
                            console.error('[WebSocket] Reconnect failed:', e);
                        }
                    }, this.reconnectDelay * this.reconnectAttempts);
                }
            });
        }
    }
    
    // Replace native WebSocket with enhanced version
    window.WebSocket = MobileCompatibleWebSocket as any;
    
    // Force native WebSocket for specific domains that need it
    const originalWebSocketConnect = window.WebSocket.prototype;
}

// Mobile viewport fix
if (typeof window !== 'undefined') {
    // Fix for iOS Safari viewport height issues
    const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    setViewportHeight();
}

// Console log for debugging
console.log('[Polyfills] Loaded - Buffer, Global, Process, WebSocket mobile fixes');
