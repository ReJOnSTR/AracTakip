const { PrismaClient } = require('./electron/prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');

async function test() {
    const dbPath = '/Users/halilsak/Library/Application Support/muayen/data/aractakip.db'; // Mac path just to rest, assuming we are on mac but simulating the bug
    const sqlite = new Database(dbPath);
    const adapter = new PrismaBetterSqlite3(sqlite);
    const prisma = new PrismaClient({ adapter });

    try {
        BigInt.prototype.toJSON = function () { return Number(this); };

        console.log("Testing Finance queries...");
        const companyId = 1; // Assuming company 1 exists

        const data = await prisma.transactions.findMany({
            where: { company_id: companyId },
            orderBy: { date: 'desc' }
        });

        console.log("Transactions count:", data.length);
        console.log("Sample:", data[0]);

        // Dashboard stats
        console.log("\nTesting Dashboard queries...");
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const maints = await prisma.maintenances.aggregate({
            _sum: { cost: true },
            where: { vehicles: { company_id: companyId }, date: { gte: startOfMonth } }
        });

        console.log("Current month cost:", maints._sum.cost);

    } catch (err) {
        console.error("Prisma Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}
test();
