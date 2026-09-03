const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// 1. Clear any old zombie processes holding the ports (without killing current/parent PIDs)
require('./clear-port');

const rootDir = path.resolve(__dirname, '..');
const viteEntry = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const electronBinary = require('electron');

// 2. Spawn Vite directly with active Node runtime
console.log('🚀 Starting Vite dev server...');
const vite = spawn(process.execPath, [viteEntry], {
    stdio: 'inherit',
    cwd: rootDir
});

// 3. Launch Electron immediately upon Vite's readiness
let electronLaunched = false;
let electronProcess = null;

function waitForVite() {
    if (electronLaunched) return;

    const req = http.get('http://127.0.0.1:5173/', (res) => {
        res.resume();
        if (!electronLaunched) {
            electronLaunched = true;
            console.log('⚡ Vite dev server is ready! Launching Electron desktop window...');
            launchElectron();
        }
    });

    req.on('error', () => {
        if (!electronLaunched) {
            setTimeout(waitForVite, 40);
        }
    });
}

function launchElectron() {
    electronProcess = spawn(electronBinary, ['.'], {
        stdio: 'inherit',
        cwd: rootDir
    });

    electronProcess.on('close', (code) => {
        try { vite.kill(); } catch (e) { }
        process.exit(code || 0);
    });
}

vite.on('close', (code) => {
    if (electronProcess) {
        try { electronProcess.kill(); } catch (e) { }
    }
    process.exit(code || 0);
});

process.on('SIGINT', () => {
    try { if (electronProcess) electronProcess.kill(); } catch (e) { }
    try { vite.kill(); } catch (e) { }
    process.exit(0);
});

process.on('SIGTERM', () => {
    try { if (electronProcess) electronProcess.kill(); } catch (e) { }
    try { vite.kill(); } catch (e) { }
    process.exit(0);
});

// Start polling for Vite immediately
setTimeout(waitForVite, 20);
