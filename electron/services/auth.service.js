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

        const rawLookup = (email || username || '').trim();

        if (!rawLookup || !password) {
            return { success: false, error: 'Kullanıcı adı/e-posta ve şifre zorunludur' };
        }

        const lowerLookup = rawLookup.toLowerCase();

        let user = await prisma.users.findFirst({
            where: {
                OR: [
                    { email: rawLookup },
                    { username: rawLookup },
                    { email: lowerLookup },
                    { username: lowerLookup }
                ]
            },
            include: {
                employee: true,
                custom_role: {
                    include: {
                        permissions: true
                    }
                }
            }
        });

        // Fallback: If no user found and attempting 'admin', auto-create or reset admin user
        if (!user && (lowerLookup === 'admin' || lowerLookup === 'admin@kontrol.app')) {
            let company = await prisma.companies.findFirst();
            if (!company) {
                company = await prisma.companies.create({
                    data: { name: 'Varsayılan Şirket' }
                });
            }

            const defaultPasswordHash = bcrypt.hashSync(password || 'admin', 10);
            user = await prisma.users.upsert({
                where: { username: 'admin' },
                update: {
                    password_hash: defaultPasswordHash,
                    is_active: 1
                },
                create: {
                    username: 'admin',
                    email: 'admin@kontrol.app',
                    password_hash: defaultPasswordHash,
                    full_name: 'Yönetici',
                    role: 'admin',
                    company_id: company.id,
                    is_active: 1,
                    must_change_password: 0
                },
                include: {
                    employee: true,
                    custom_role: {
                        include: {
                            permissions: true
                        }
                    }
                }
            });
        }

        if (!user) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }

        if (user.is_active === 0) {
            return { success: false, error: 'Hesabınız pasif duruma getirilmiştir. Yönetici ile iletişime geçiniz.' };
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
            role: user.role || 'personnel',
            role_id: user.role_id,
            employee_id: user.employee_id,
            mustChangePassword: user.must_change_password === 1,
            employee: user.employee ? {
                id: user.employee.id,
                company_id: user.employee.company_id,
                first_name: user.employee.first_name,
                last_name: user.employee.last_name,
                email: user.employee.email,
                department: user.employee.department,
                position: user.employee.position
            } : null,
            permissions: user.custom_role ? user.custom_role.permissions : []
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
        const targetId = Number(userId);

        if (!targetId || isNaN(targetId)) {
            return { success: false, error: 'Geçersiz kullanıcı ID' };
        }

        const user = await prisma.users.findUnique({
            where: { id: targetId }
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
            where: { id: targetId },
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

async function createEmployeeUser(data) {
    try {
        const { employeeId, username, email, password, role, roleId } = data;

        if (!employeeId || !username || !password || !email) {
            return { success: false, error: 'Personel, kullanıcı adı, e-posta ve şifre zorunludur' };
        }

        const employee = await prisma.employees.findUnique({
            where: { id: Number(employeeId) }
        });

        if (!employee) {
            return { success: false, error: 'Personel kaydı bulunamadı' };
        }

        const existingUser = await prisma.users.findFirst({
            where: {
                OR: [
                    { username },
                    { email },
                    { employee_id: Number(employeeId) }
                ]
            }
        });

        if (existingUser) {
            return { success: false, error: 'Bu kullanıcı adı, e-posta veya personel zaten bir kullanıcı hesabına sahip' };
        }

        const password_hash = bcrypt.hashSync(password, 10);

        const newUser = await prisma.users.create({
            data: {
                username,
                email,
                full_name: `${employee.first_name} ${employee.last_name}`,
                password_hash,
                role: role || 'personnel',
                role_id: roleId ? Number(roleId) : null,
                employee_id: Number(employeeId),
                must_change_password: 1,
                is_active: 1,
                companies: {
                    connect: { id: Number(employee.company_id) }
                }
            }
        });

        return { success: true, user: { id: newUser.id, username: newUser.username, email: newUser.email } };
    } catch (error) {
        console.error('createEmployeeUser error:', error);
        return { success: false, error: 'Personel kullanıcı hesabı oluşturulamadı: ' + error.message };
    }
}

module.exports = {
    registerUser,
    loginUser,
    changePassword,
    updateProfile,
    getUserPasswordHash,
    createEmployeeUser
};
