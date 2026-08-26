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

            if (prop === 'focusWindow' || prop === 'setFullScreen') {
                return async () => ({ success: true });
            }

            if (prop === 'openFolder') {
                return async () => ({ success: true });
            }

            // Web file picker & auto-upload
            if (prop === 'selectFile') {
                return () => new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '*/*';
                    input.style.display = 'none';
                    document.body.appendChild(input);

                    input.onchange = async () => {
                        const files = Array.from(input.files || []);
                        document.body.removeChild(input);
                        if (files.length === 0) {
                            resolve({ canceled: true, filePaths: [] });
                            return;
                        }

                        const filePaths = [];
                        for (const file of files) {
                            try {
                                const base64 = await new Promise((res, rej) => {
                                    const reader = new FileReader();
                                    reader.onload = () => res(reader.result);
                                    reader.onerror = rej;
                                    reader.readAsDataURL(file);
                                });

                                const token = localStorage.getItem('token') || localStorage.getItem('aractakip_token') || sessionStorage.getItem('token');
                                const uploadRes = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                    },
                                    body: JSON.stringify({
                                        fileName: file.name,
                                        fileData: base64,
                                        mimeType: file.type
                                    })
                                });

                                const data = await uploadRes.json();
                                if (data.success && data.fileName) {
                                    filePaths.push(data.fileName);
                                }
                            } catch (e) {
                                console.error('[Web File Upload Error]:', e);
                            }
                        }

                        if (filePaths.length > 0) {
                            resolve({ canceled: false, filePaths });
                        } else {
                            resolve({ canceled: true, filePaths: [] });
                        }
                    };

                    input.oncancel = () => {
                        document.body.removeChild(input);
                        resolve({ canceled: true, filePaths: [] });
                    };

                    input.click();
                });
            }

            // Web saveFile polyfill (returns the filename)
            if (prop === 'saveFile') {
                return async (filePathOrName) => {
                    if (!filePathOrName) return null;
                    if (typeof filePathOrName === 'string') return filePathOrName;
                    if (typeof filePathOrName === 'object' && (filePathOrName.path || filePathOrName.name)) {
                        return filePathOrName.path || filePathOrName.name;
                    }
                    return null;
                };
            }

            // Web openFile & openDocument polyfill (opens in new tab)
            if (prop === 'openFile' || prop === 'openDocument') {
                return async (fileNameOrPath) => {
                    if (!fileNameOrPath) return { success: false, error: 'No file specified' };
                    const cleanName = String(fileNameOrPath).split(/[\\/]/).pop();
                    window.open(`/uploads/${cleanName}`, '_blank', 'noopener,noreferrer');
                    return { success: true };
                };
            }

            // Web saveAsPdf / print
            if (prop === 'saveAsPdf' || prop === 'saveReportPdf') {
                return async () => {
                    window.print();
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
