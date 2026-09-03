const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
    try {
        const companies = await prisma.companies.findMany();
        console.log('--- COMPANIES ---');
        console.table(companies.map(c => ({ id: c.id, name: c.name })));

        const vehicles = await prisma.vehicles.findMany({
            where: { is_archived: 0 }
        });
        console.log('\n--- ACTIVE VEHICLES ---');
        console.table(vehicles.map(v => ({ id: v.id, plate: v.plate, company_id: v.company_id })));

        if (vehicles.length === 0) {
            console.log('!!! NO ACTIVE VEHICLES FOUND IN DB !!!');
        } else {
            console.log(`\nFound ${vehicles.length} active vehicles.`);
        }

    } catch (err) {
        console.error('Check DB Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
