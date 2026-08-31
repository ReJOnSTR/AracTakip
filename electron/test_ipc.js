const { app } = require('electron');
const db = require('./prismaService');

app.whenReady().then(async () => {
    try {
        const res = await db.getAllInspections(1, 'traffic', 0);
        require('fs').writeFileSync('debug_inspections.json', JSON.stringify(res, null, 2));
        console.log("Wrote debug_inspections.json successfully.");
    } catch(err) {
        console.error("Error:", err);
    }
    app.quit();
});
