const { getPrismaClient } = require('../electron/prismaClient');
const bcrypt = require('bcryptjs');
const { generateSecurePassword } = require('../electron/utils/security');

async function resetSuperAdmin() {
    const prisma = getPrismaClient();
    try {
        const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
        const email = process.env.SUPERADMIN_EMAIL || 'superadmin@kontrolapp.com';
        const newPassword = process.env.NEW_PASSWORD || generateSecurePassword(16);
        const password_hash = bcrypt.hashSync(newPassword, 10);

        let superAdmin = await prisma.users.findFirst({
            where: { role: 'superadmin' }
        });

        if (superAdmin) {
            superAdmin = await prisma.users.update({
                where: { id: superAdmin.id },
                data: {
                    password_hash,
                    is_active: 1
                }
            });
        } else {
            superAdmin = await prisma.users.create({
                data: {
                    username,
                    email,
                    full_name: 'SaaS Sistem Yöneticisi',
                    password_hash,
                    role: 'superadmin',
                    is_active: 1,
                    must_change_password: 0
                }
            });
        }

        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║             👑 KONTROL SAAS - SİSTEM YÖNETİCİSİ OLUŞTURULDU         ║');
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        console.log(`║ Kullanıcı Adı : ${superAdmin.username.padEnd(52)}║`);
        console.log(`║ E-Posta       : ${superAdmin.email.padEnd(52)}║`);
        console.log(`║ Yeni Şifre    : ${newPassword.padEnd(52)}║`);
        console.log('║                                                                      ║');
        console.log('║ ⚠️  Bu şifre rastgele üretilmiştir. Güvenli bir yere kaydediniz.     ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        console.log('\n');

    } catch (err) {
        console.error('Süper Yönetici oluşturma / sıfırlama hatası:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

resetSuperAdmin();
