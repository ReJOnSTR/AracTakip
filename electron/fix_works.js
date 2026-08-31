const { getPrismaClient, initPrisma } = require('./prismaClient');

async function main() {
    await initPrisma();
    const prisma = getPrismaClient();
    console.log("Looking for works with status 'paid' and customer_id null...");
    
    // Check if there are any
    const works = await prisma.works.findMany({
        where: {
            status: 'paid',
            customer_id: null
        }
    });

    console.log("Found works to repair:", works.length);
    for (const w of works) {
        console.log(`Work ID: ${w.id}, Title: ${w.title}`);
        
        // Find transactions related to this work
        const txs = await prisma.transactions.findMany({
            where: {
                description: {
                    contains: w.title
                }
            }
        });

        if (txs.length > 0) {
            console.log(`Matching tx found:`, txs[0].description);
            // extract customer name
            const match = txs[0].description.match(/Müşteri: (.+)/);
            if (match) {
                const customerName = match[1];
                const cust = await prisma.customers.findFirst({
                    where: { name: customerName, company_id: w.company_id }
                });
                if (cust) {
                    console.log(`Restoring customer_id ${cust.id} for Work ${w.id}...`);
                    await prisma.works.update({
                        where: { id: w.id },
                        data: { customer_id: cust.id, customer: cust.name }
                    });
                    console.log("Restored!");
                }
            }
        }
    }
}
main().catch(console.error).finally(() => process.exit(0));
