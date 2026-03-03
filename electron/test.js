const prismaService = require('./prismaService');
(async () => {
    const res = await prismaService.getAllInspections(1, 'traffic', 0);
    console.log(JSON.stringify(res.data[0], null, 2));
    process.exit(0);
})();
