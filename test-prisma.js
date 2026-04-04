const { getPrismaClient } = require('/Users/halilsak/Documents/Github/AracTakip/electron/prismaClient.js');

async function run() {
  try {
    const prisma = getPrismaClient();
    const worksEmpty = await prisma.works.findMany({
      where: { 
        company_id: 1,
        OR: [
          { is_archived: 0 },
          { is_archived: null }
        ]
      }
    });

    console.log("Works found:", worksEmpty.length);
  } catch (err) {
    console.error("Prisma error:", err);
  }
}
run();
