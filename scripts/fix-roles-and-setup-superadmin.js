const { getPrismaClient } = require('../electron/prismaClient');
const bcrypt = require('bcryptjs');
const { generateSecurePassword } = require('../electron/utils/security');

async function fixRolesAndSetupSuperadmin() {
    const prisma = getPrismaClient();
    try {
        console.log('🔧 Veritabanı Rol Ayrımı ve Bağımsız Süper Yönetici Kurulumu...');

        // 1. Update admin@muayen.com to company_admin
        const adminMuayen = await prisma.users.findFirst({
            where: { email: 'admin@muayen.com' }
        });
        if (adminMuayen) {
            await prisma.users.update({
                where: { id: adminMuayen.id },
                data: {
                    role: 'company_admin',
                    is_active: 1
                }
            });
            console.log('✅ admin@muayen.com -> SAK PETROL Şirket Yöneticisi (company_admin) yapıldı.');
        }

        // 2. Create or update dedicated superadmin account
        const randomPassword = generateSecurePassword(16);
        const password_hash = bcrypt.hashSync(randomPassword, 10);

        let superAdmin = await prisma.users.findFirst({
            where: { username: 'superadmin' }
        });

        if (superAdmin) {
            superAdmin = await prisma.users.update({
                where: { id: superAdmin.id },
                data: {
                    email: 'superadmin@kontrolapp.com',
                    password_hash,
                    role: 'superadmin',
                    is_active: 1
                }
            });
        } else {
            superAdmin = await prisma.users.create({
                data: {
                    username: 'superadmin',
                    email: 'superadmin@kontrolapp.com',
                    full_name: 'Platform Sistem Yöneticisi',
                    password_hash,
                    role: 'superadmin',
                    is_active: 1,
                    must_change_password: 0
                }
            });
        }

        const box = `
╔══════════════════════════════════════════════════════════════════════╗
║             👑 KONTROL SAAS - SİSTEM YÖNETİCİSİ OLUŞTURULDU         ║
╠══════════════════════════════════════════════════════════════════════╣
║ Kullanıcı Adı : ${superAdmin.username.padEnd(52)}║
║ E-Posta       : ${superAdmin.email.padEnd(52)}║
║ Yeni Şifre    : ${randomPassword.padEnd(52)}║
║ Rol           : superadmin (Bağımsız Platform Yöneticisi)           ║
║                                                                      ║
║ ⚠️  Bu şifre rastgele üretilmiştir. Güvenli bir yere kaydediniz.     ║
╚══════════════════════════════════════════════════════════════════════╝`;

        console.log(box);

        // List all users to verify
        const allUsers = await prisma.users.findMany({
            select: { id: true, username: true, email: true, role: true, is_active: true }
        });
        console.log('\n--- GÜNCEL KULLANICI LİSTESİ ---');
        console.table(allUsers);

    } catch (err) {
        console.error('Hata:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixRolesAndSetupSuperadmin();
