const crypto = require('crypto');

/**
 * Generate a cryptographically secure random password
 * Contains upper, lower, digits, and special characters
 */
function generateSecurePassword(length = 16) {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*+=?';
    const allChars = upper + lower + digits + symbols;

    const chars = [
        upper[crypto.randomInt(0, upper.length)],
        lower[crypto.randomInt(0, lower.length)],
        digits[crypto.randomInt(0, digits.length)],
        symbols[crypto.randomInt(0, symbols.length)]
    ];

    for (let i = 4; i < length; i++) {
        chars.push(allChars[crypto.randomInt(0, allChars.length)]);
    }

    // Modern Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

module.exports = {
    generateSecurePassword
};
