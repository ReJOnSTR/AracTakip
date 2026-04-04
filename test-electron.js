const { app, ipcMain } = require('electron');
const path = require('path');
const db = require('./electron/prismaService.js');

app.whenReady().then(async () => {
    try {
        const { getPrismaClient, runAutoMigrations } = require('./electron/prismaClient.js');
        const prisma = getPrismaClient();
        await runAutoMigrations();

        console.log("TESTING getCustomers...");
        const res = await db.getCustomers(1, 0);
        console.log("Result success:", res.success);
        if (res.success) {
            console.log("Count:", res.data.length);
        } else {
            console.log("Error:", res.error);
        }
    } catch (e) {
        console.error("FATAL", e);
    }
    app.quit();
});
