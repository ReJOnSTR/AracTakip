require('dotenv').config();
const { getPrismaClient } = require('./electron/prismaClient');

const prisma = getPrismaClient();

async function checkSuperAdmin() {
    try {
        const superAdmins = await prisma.users.findMany({
            where: {
                OR: [
                    { role: 'superadmin' },
                    { username: 'superadmin' }
                ]
            }
        });

        console.log('SuperAdmins found:', superAdmins.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
            must_change_password: u.must_change_password
        })));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkSuperAdmin();
