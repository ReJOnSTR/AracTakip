const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

// RFC 4648 Base32 Alphabet
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_CHARS[(value << (5 - bits)) & 31];
    }

    return output;
}

function base32Decode(input) {
    const clean = String(input || '').toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = Buffer.alloc(Math.floor((clean.length * 5) / 8));

    for (let i = 0; i < clean.length; i++) {
        const val = BASE32_CHARS.indexOf(clean[i]);
        if (val === -1) continue;

        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }

    return output;
}

function generateSecret(length = 20) {
    return base32Encode(crypto.randomBytes(length));
}

function generateHOTP(secret, counter) {
    const key = base32Decode(secret);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;

    return code.toString().padStart(6, '0');
}

function verifyTOTP(token, secret, timeStep = 30, window = 1) {
    if (!token || !secret) return false;
    const cleanToken = String(token).replace(/\s+/g, '').trim();
    if (cleanToken.length !== 6) return false;

    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
    for (let i = -window; i <= window; i++) {
        if (generateHOTP(secret, currentCounter + i) === cleanToken) {
            return true;
        }
    }
    return false;
}

/**
 * Generate 8 random backup recovery codes
 */
function generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
    }
    return codes;
}

/**
 * Initiate 2FA Setup: generates secret, otpauth URI, QR Code and backup codes
 */
async function generateMfaSetup(userId) {
    try {
        const uid = parseInt(userId, 10);
        const user = await prisma.users.findUnique({ where: { id: uid } });
        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        const secret = generateSecret(20);
        const issuer = 'KONTROL App';
        const accountName = encodeURIComponent(`${user.username} (${user.email || 'KONTROL'})`);
        const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${accountName}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        
        // Generate high-resolution dark-themed QR Code Data URL
        const qrCodeUrl = await QRCode.toDataURL(otpauth, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 6,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });

        const backupCodes = generateBackupCodes(8);

        return {
            success: true,
            secret,
            qrCodeUrl,
            otpauth,
            backupCodes
        };
    } catch (error) {
        console.error('generateMfaSetup error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enable 2FA after user confirms with the first 6-digit TOTP code
 */
async function enableMfa(userId, secret, token, backupCodes) {
    try {
        const uid = parseInt(userId, 10);
        const user = await prisma.users.findUnique({ where: { id: uid } });
        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        // Clean token
        const cleanToken = String(token).replace(/\s+/g, '').trim();

        // Verify the token with the provided secret
        const isValid = verifyTOTP(cleanToken, secret);
        if (!isValid) {
            return { success: false, error: 'Girdiğiniz 6 haneli doğrulama kodu geçersiz. Lütfen Authenticator uygulamanızdaki güncel kodu girin.' };
        }

        // Save 2FA to DB
        await prisma.users.update({
            where: { id: uid },
            data: {
                two_factor_secret: secret,
                two_factor_enabled: 1,
                two_factor_backup_codes: JSON.stringify(backupCodes || [])
            }
        });

        return {
            success: true,
            message: 'İki Adımlı Doğrulama (2FA) başarıyla etkinleştirildi.',
            backupCodes: backupCodes || []
        };
    } catch (error) {
        console.error('enableMfa error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Disable 2FA for a user
 */
async function disableMfa(userId) {
    try {
        const uid = parseInt(userId, 10);
        await prisma.users.update({
            where: { id: uid },
            data: {
                two_factor_secret: null,
                two_factor_enabled: 0,
                two_factor_backup_codes: null
            }
        });

        return { success: true, message: 'İki Adımlı Doğrulama (2FA) devre dışı bırakıldı.' };
    } catch (error) {
        console.error('disableMfa error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify 2FA code during login challenge (supports 6-digit TOTP and 8-char backup codes)
 */
async function verifyMfaLogin(userId, tokenOrBackupCode) {
    try {
        const uid = parseInt(userId, 10);
        const user = await prisma.users.findUnique({
            where: { id: uid },
            include: {
                companies: true,
                employee: { include: { companies: true } },
                custom_role: true
            }
        });

        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        if (user.two_factor_enabled !== 1 || !user.two_factor_secret) {
            return { success: true, verified: true, user: sanitizeUser(user) };
        }

        const inputCode = String(tokenOrBackupCode).replace(/\s+/g, '').trim().toUpperCase();

        // 1. Try 6-digit TOTP verification
        if (/^\d{6}$/.test(inputCode)) {
            const isValid = verifyTOTP(inputCode, user.two_factor_secret);
            if (isValid) {
                return {
                    success: true,
                    verified: true,
                    user: sanitizeUser(user)
                };
            }
        }

        // 2. Try Backup Recovery Codes verification
        let backupCodes = [];
        try {
            backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');
        } catch {
            backupCodes = [];
        }

        const normalizedInput = inputCode.includes('-') ? inputCode : `${inputCode.slice(0, 4)}-${inputCode.slice(4)}`;
        const matchedIndex = backupCodes.findIndex(c => c.toUpperCase() === normalizedInput);

        if (matchedIndex !== -1) {
            // Consume backup code
            backupCodes.splice(matchedIndex, 1);
            await prisma.users.update({
                where: { id: uid },
                data: { two_factor_backup_codes: JSON.stringify(backupCodes) }
            });

            return {
                success: true,
                verified: true,
                backupCodeUsed: true,
                remainingBackupCodes: backupCodes.length,
                user: sanitizeUser(user)
            };
        }

        return {
            success: false,
            error: 'Geçersiz 6 haneli güvenlik kodu veya kurtarma kodu. Lütfen tekrar deneyin.'
        };
    } catch (error) {
        console.error('verifyMfaLogin error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get 2FA Status for current user
 */
async function getMfaStatus(userId) {
    try {
        const uid = parseInt(userId, 10);
        const user = await prisma.users.findUnique({
            where: { id: uid },
            select: {
                id: true,
                username: true,
                two_factor_enabled: true,
                two_factor_backup_codes: true
            }
        });

        if (!user) return { success: false, error: 'Kullanıcı bulunamadı' };

        let backupCodesCount = 0;
        try {
            backupCodesCount = JSON.parse(user.two_factor_backup_codes || '[]').length;
        } catch {}

        return {
            success: true,
            enabled: user.two_factor_enabled === 1,
            remainingBackupCodes: backupCodesCount
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        role_id: user.role_id,
        employee_id: user.employee_id,
        two_factor_enabled: user.two_factor_enabled === 1,
        mustChangePassword: user.must_change_password === 1
    };
}

module.exports = {
    generateMfaSetup,
    enableMfa,
    disableMfa,
    verifyMfaLogin,
    getMfaStatus
};
