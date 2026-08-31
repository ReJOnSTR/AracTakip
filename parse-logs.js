const fs = require('fs');
const path = require('path');
const os = require('os');
const logPath = path.join(os.homedir(), 'Library', 'Logs', 'muayen', 'main.log');
if (fs.existsSync(logPath)) {
    console.log(fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.includes('error') || l.includes('Migration') || l.includes('Error')).slice(-50).join('\n'));
} else {
    console.log("No log file found at", logPath);
}
