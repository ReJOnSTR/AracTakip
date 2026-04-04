const { app } = require('electron');
const db = require('./electron/prismaService.js');

app.whenReady().then(async () => {
    try {
        const { getPrismaClient, runAutoMigrations } = require('./electron/prismaClient.js');
        await runAutoMigrations();

        console.log("Setting up test customer...");
        // Ensure company 1 exists
        try {
            await db.createCompany({ name: 'Test', tax_no: '123' })
        } catch(e) {}
        
        let c = await db.createCustomer({
            companyId: 1,
            name: "Test Customer " + Date.now(),
            phone: '123'
        });
        console.log("Created Customer:", c.success, c.data?.id);

        console.log("Fetching Customers with isArchived=0...");
        const res0 = await db.getCustomers(1, 0);
        console.log("Count for 0:", res0.data?.length);
        console.log("Found Test Customer:", res0.data?.find(x => x.id === c.data?.id) ? "YES" : "NO");

        console.log("Fetching Customers with isArchived=1...");
        const res1 = await db.getCustomers(1, 1);
        console.log("Count for 1:", res1.data?.length);

    } catch (e) {
        console.error("FATAL", e);
    }
    app.quit();
});
