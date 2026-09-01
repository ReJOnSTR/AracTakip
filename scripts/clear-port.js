const { execSync } = require('child_process');

function clearPort(port) {
    try {
        const currentPid = process.pid;
        const parentPid = process.ppid;

        if (process.platform === 'win32') {
            execSync(`FOR /F "tokens=5" %P IN ('netstat -a -n -o ^| findstr :${port}') DO taskkill /F /PID %P 2>NUL`, { stdio: 'ignore' });
        } else {
            const pids = execSync(`lsof -n -P -ti:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).trim();
            if (pids) {
                const pidList = pids.split(/\s+/)
                    .map(p => parseInt(p, 10))
                    .filter(p => Boolean(p) && p !== currentPid && p !== parentPid)
                    .join(' ');
                if (pidList) {
                    execSync(`kill -9 ${pidList}`, { stdio: 'ignore' });
                }
            }
        }
    } catch (e) {
        // Port was already free or no process found - continue silently
    }
}

clearPort(5173);
clearPort(9999);
