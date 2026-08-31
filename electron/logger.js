const log = require('electron-log');
const path = require('path');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Custom format
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Ensure logs are written to userData directory
// electron-log does this by default, but we can be explicit if needed.
// By default it writes to:
// on Linux: ~/.config/<app name>/logs/main.log
// on macOS: ~/Library/Logs/<app name>/main.log
// on Windows: %USERPROFILE%\AppData\Roaming\<app name>\logs\main.log

// Handle unhandled errors
log.errorHandler.startCatching();

module.exports = log;
