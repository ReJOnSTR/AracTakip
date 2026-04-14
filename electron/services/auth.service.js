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
        const safeUser = { id: result.id, username: result.username, email: result.email };
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

async function updateUser(data) {
    try {
        const { userId, username, email, newPassword, currentPassword } = data;

        const user = await prisma.users.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        const updateData = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;

        if (newPassword) {
            if (!currentPassword) {
                return { success: false, error: 'Şifre değiştirmek için mevcut şifreniz gereklidir' };
            }

            const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
            if (!isValid) {
                return { success: false, error: 'Mevcut şifre hatalı' };
            }

            updateData.password_hash = bcrypt.hashSync(newPassword, 10);
            updateData.must_change_password = 0;
        }

        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: updateData
        });

        // Strip hash before returning
        const safeUser = {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            mustChangePassword: updatedUser.must_change_password === 1
        };

        return { success: true, user: safeUser };

    } catch (error) {
        console.error('Update user error:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Bu kullanıcı adı veya e-posta zaten kullanımda' };
        }
        return { success: false, error: 'Profil güncelleme başarısız: ' + error.message };
    }
}

module.exports = {
    registerUser,
    loginUser,
    changePassword,
    updateUser,
    getUserPasswordHash
};
