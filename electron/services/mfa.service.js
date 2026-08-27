const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

// Configure TOTP window tolerance (1 step before/after = ±30 seconds tolerance for clock skew)
authenticator.options = {
    window: 1,
    step: 30
};

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

        const secret = authenticator.generateSecret();
        const accountName = `${user.username} (${user.email || 'KONTROL'})`;
        const otpauth = authenticator.keyuri(accountName, 'KONTROL App', secret);
        
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
        const isValid = authenticator.check(cleanToken, secret);
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
 * Disable 2FA for a user (requires user confirmation)
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
            return { success: true, verified: true };
        }

        const inputCode = String(tokenOrBackupCode).replace(/\s+/g, '').trim().toUpperCase();

        // 1. Try 6-digit TOTP verification
        if (/^\d{6}$/.test(inputCode)) {
            const isValid = authenticator.check(inputCode, user.two_factor_secret);
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
