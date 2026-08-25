/**
 * apiBridge.js
 * Automatically bridges window.electronAPI calls over HTTP RPC when running in a web browser.
 * In Electron desktop mode, this is a no-op as window.electronAPI is already provided by preload.js.
 */

if (typeof window !== 'undefined' && !window.electronAPI) {
    console.info('[API Bridge] Running in Web mode. Polyfilling window.electronAPI via HTTP RPC.');

    window.electronAPI = new Proxy({}, {
        get(target, prop) {
            // Event listener mocks
            if (prop === 'on' || prop === 'onDbUpdate' || prop === 'onContextAction' || prop === 'onUpdateDownloaded' || prop === 'onUpdateAvailable') {
                return (callback) => {
                    const handler = (e) => callback(e.detail);
                    window.addEventListener(`electron:${String(prop)}`, handler);
                    return () => window.removeEventListener(`electron:${String(prop)}`, handler);
                };
            }

            if (prop === 'removeListener' || prop === 'removePCListeners') {
                return () => {};
            }

            if (prop === 'getPlatform') {
                return async () => (navigator.platform || 'web').toLowerCase();
            }

            if (prop === 'getAppVersion') {
                return async () => '1.13.8-web';
            }

            if (prop === 'openExternal') {
                return async (url) => {
                    window.open(url, '_blank', 'noopener,noreferrer');
                    return { success: true };
                };
            }

            if (prop === 'showNotification') {
                return async (title, body) => {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, { body });
                    }
                    return { success: true };
                };
            }

            // Standard RPC method call
            return async (...args) => {
                const token = localStorage.getItem('token') || localStorage.getItem('aractakip_token') || sessionStorage.getItem('token');
                try {
                    const res = await fetch(`/api/rpc/${String(prop)}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ args })
                    });

                    if (!res.ok) {
                        const errBody = await res.json().catch(() => ({}));
                        return { success: false, error: errBody.error || `HTTP ${res.status}: ${res.statusText}` };
                    }

                    const data = await res.json();
                    return data;
                } catch (err) {
                    console.error(`[API Bridge Error] Method "${String(prop)}" failed:`, err);
                    return { success: false, error: err.message };
                }
            };
        }
    });
}
