const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function getCompanies(userId) {
    try {
        let whereClause = {};
        if (userId) {
            const user = await prisma.users.findUnique({
                where: { id: parseInt(userId, 10) }
            }).catch(() => null);

            if (user && user.role === 'personnel' && user.employee_id) {
                const emp = await prisma.employees.findUnique({
                    where: { id: user.employee_id }
                }).catch(() => null);
                if (emp && emp.company_id) {
                    whereClause = { id: parseInt(emp.company_id, 10) };
                }
            }
        }

        let companies = await prisma.companies.findMany({
            where: whereClause
        });

        // If no company exists in database at all, auto-create default company
        if (companies.length === 0) {
            const allComps = await prisma.companies.findMany();
            if (allComps.length === 0) {
                const firstUser = await prisma.users.findFirst();
                const newComp = await prisma.companies.create({
                    data: {
                        name: 'Varsayılan Şirket',
                        user_id: firstUser ? firstUser.id : null
                    }
                });
                companies = [newComp];
            } else {
                companies = allComps;
            }
        }

        const collator = new Intl.Collator('tr');
        companies.sort((a, b) => collator.compare(a.name, b.name));

        // Deep clone sanitization for IPC
        const sanitizedData = JSON.parse(JSON.stringify(companies));

        return { success: true, data: sanitizedData };
    } catch (error) {
        console.error('getCompanies error:', error);
        return { success: false, error: 'Şirketler yüklenirken bir hata oluştu: ' + error.message };
    }
}

async function createCompany(data) {
    try {
        const { userId, name, ...rest } = data;

        if (!userId || !name) {
            return { success: false, error: 'Kullanıcı kimliği ve şirket adı zorunludur' };
        }

        const newCompany = await prisma.companies.create({
            data: {
                user_id: userId,
                name: name,
                tax_number: rest.taxNumber || null,
                tax_office: rest.taxOffice || null,
                sgk_no: rest.sgkNo || null,
                address: rest.address || null,
                phone: rest.phone || null,
                signature_path: rest.signaturePath || null,
                stamp_path: rest.stampPath || null
            }
        });
        return { success: true, data: newCompany };
    } catch (error) {
        console.error('createCompany error:', error);
        return { success: false, error: 'Şirket eklenirken bir hata oluştu: ' + error.message };
    }
}

async function updateCompany(data) {
    try {
        const { id, name, ...rest } = data;

        if (!id || !name) {
            return { success: false, error: 'Şirket kimliği ve adı zorunludur' };
        }

        const updatedCompany = await prisma.companies.update({
            where: { id: parseInt(id) },
            data: {
                name: name,
                tax_number: rest.taxNumber || null,
                tax_office: rest.taxOffice || null,
                sgk_no: rest.sgkNo || null,
                address: rest.address || null,
                phone: rest.phone || null,
                signature_path: rest.signaturePath || null,
                stamp_path: rest.stampPath || null
            }
        });

        return { success: true, data: updatedCompany };
    } catch (error) {
        console.error('updateCompany error:', error);
        return { success: false, error: 'Şirket güncellenirken bir hata oluştu: ' + error.message };
    }
}

async function deleteCompany(id) {
    try {
        await prisma.companies.delete({
            where: { id: parseInt(id) }
        });
        return { success: true };
    } catch (error) {
        console.error('deleteCompany error:', error);
        return { success: false, error: 'Şirket silinirken bir hata oluştu: ' + error.message };
    }
}

module.exports = {
    getCompanies,
    createCompany,
    updateCompany,
    deleteCompany
};
