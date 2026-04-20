const { getPrismaClient } = require('../prismaClient');
const bcrypt = require('bcryptjs');

const prisma = getPrismaClient();

async function registerUser(userData) {
    try {
        const { username, password, email } = userData;

        if (!username || !password || !email) {
            return { success: false, error: 'Kullanıcı adı, e-posta ve şifre zorunludur' };
        }

        const existingUser = await prisma.users.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return { success: false, error: 'Bu kullanıcı adı veya e-posta zaten kullanımda' };
        }

        const password_hash = bcrypt.hashSync(password, 10);

        const result = await prisma.users.create({
            data: {
                username,
                email,
                password_hash,
                must_change_password: 0
            }
        });

        // Strip hash before returning
        const safeUser = { 
            id: result.id, 
            username: result.username, 
            email: result.email,
            full_name: result.full_name
        };
        return { success: true, user: safeUser };

    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Kayıt işlemi başarısız: ' + error.message };
    }
}

async function loginUser(credentials) {
    try {
        const { username, email, password } = credentials;

        const lookupValue = email || username;

        if (!lookupValue || !password) {
            return { success: false, error: 'Kullanıcı adı/e-posta ve şifre zorunludur' };
        }

        const user = await prisma.users.findFirst({
            where: {
                OR: [
                    { email: lookupValue },
                    { username: lookupValue }
                ]
            }
        });

        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        const isValid = bcrypt.compareSync(password, user.password_hash);

        if (!isValid) {
            return { success: false, error: 'Hatalı şifre' };
        }

        const safeUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            mustChangePassword: user.must_change_password === 1
        };

        return { success: true, user: safeUser };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Giriş başarısız: ' + error.message };
    }
}

async function changePassword(data) {
    try {
        const { userId, currentPassword, newPassword } = data;

        const user = await prisma.users.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        if (currentPassword) {
            const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
            if (!isValid) {
                return { success: false, error: 'Mevcut şifre hatalı' };
            }
        }

        const password_hash = bcrypt.hashSync(newPassword, 10);

        await prisma.users.update({
            where: { id: userId },
            data: {
                password_hash,
                must_change_password: 0
            }
        });

        return { success: true };

    } catch (error) {
        console.error('Change password error:', error);
        return { success: false, error: 'Şifre değiştirme başarısız: ' + error.message };
    }
}

async function updateProfile(data) {
    try {
        const { userId, username, email, full_name } = data;

        // Check if username/email is taken by another user
        if (username || email) {
            const existingUser = await prisma.users.findFirst({
                where: {
                    AND: [
                        { id: { not: userId } },
                        {
                            OR: [
                                username ? { username } : null,
                                email ? { email } : null
                            ].filter(Boolean)
                        }
                    ]
                }
            });

            if (existingUser) {
                return { 
                    success: false, 
                    error: existingUser.username === username ? 'Bu kullanıcı adı zaten alınmış' : 'Bu e-posta adresi zaten kullanımda' 
                };
            }
        }

        const updated = await prisma.users.update({
            where: { id: userId },
            data: {
                username,
                email,
                full_name
            }
        });

        const safeUser = {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            full_name: updated.full_name,
            mustChangePassword: updated.must_change_password === 1
        };

        return { success: true, user: safeUser };

    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: 'Profil güncelleme başarısız: ' + error.message };
    }
}

async function getUserPasswordHash(userId) {
    try {
        const user = await prisma.users.findUnique({
            where: { id: userId }
        });
        return user ? user.password_hash : null;
    } catch {
        return null;
    }
}

module.exports = {
    registerUser,
    loginUser,
    changePassword,
    updateProfile,
    getUserPasswordHash
};
