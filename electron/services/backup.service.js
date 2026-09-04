const { getPrismaClient } = require('../prismaClient');

async function archiveItem(table, id, isArchived = 1) {
    try {
        const prisma = getPrismaClient();
        const mappedModel = table.toLowerCase();

        if (!prisma[mappedModel] || typeof prisma[mappedModel].update !== 'function') {
            return { success: false, error: 'Invalid table for archiving: ' + table };
        }

        const intId = parseInt(id);
        const archiveVal = (isArchived === 1 || isArchived === true || isArchived === '1') ? 1 : 0;

        if (mappedModel === 'employees') {
            await prisma.employees.update({
                where: { id: intId },
                data: { 
                    status: archiveVal ? 'passive' : 'active',
                    is_archived: archiveVal
                }
            });
            return { success: true };
        }

        if (mappedModel === 'works') {
            await prisma.$transaction(async (tx) => {
                await tx.works.update({
                    where: { id: intId },
                    data: { is_archived: archiveVal }
                });
                await tx.work_items.updateMany({
                    where: { work_id: intId },
                    data: { is_archived: archiveVal }
                });
            });
            return { success: true };
        }

        await prisma[mappedModel].update({
            where: { id: intId },
            data: { is_archived: archiveVal }
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function archiveItems(table, ids, isArchived = 1) {
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) return { success: true };
        const prisma = getPrismaClient();
        const mappedModel = table.toLowerCase();

        if (!prisma[mappedModel] || typeof prisma[mappedModel].updateMany !== 'function') {
            return { success: false, error: 'Invalid table for bulk archiving: ' + table };
        }

        const intIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
        if (intIds.length === 0) return { success: true };

        const archiveVal = (isArchived === 1 || isArchived === true || isArchived === '1') ? 1 : 0;

        if (mappedModel === 'employees') {
            await prisma.employees.updateMany({
                where: { id: { in: intIds } },
                data: { 
                    status: archiveVal ? 'passive' : 'active',
                    is_archived: archiveVal
                }
            });
            return { success: true };
        }

        if (mappedModel === 'works') {
            await prisma.$transaction(async (tx) => {
                await tx.works.updateMany({
                    where: { id: { in: intIds } },
                    data: { is_archived: archiveVal }
                });
                await tx.work_items.updateMany({
                    where: { work_id: { in: intIds } },
                    data: { is_archived: archiveVal }
                });
            });
            return { success: true };
        }

        await prisma[mappedModel].updateMany({
            where: { id: { in: intIds } },
            data: { is_archived: archiveVal }
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getCompanyCompleteData(companyId) {
    try {
        const prisma = getPrismaClient();
        const id = parseInt(companyId);

        const company = await prisma.companies.findUnique({ where: { id } });
        if (!company) return { success: false, error: 'Company not found' };

        // Fetch deep relational data
        const vehicles = await prisma.vehicles.findMany({
            where: { company_id: id },
            include: {
                maintenances: true,
                inspections: true,
                insurances: true,
                assignments: true,
                services: true,
                documents: true
            }
        });

        const transactions = await prisma.transactions.findMany({ where: { company_id: id } });
        const mealTickets = await prisma.meal_tickets.findMany({ where: { company_id: id } });
        const customers = await prisma.customers.findMany({ where: { company_id: id } });
        const works = await prisma.works.findMany({
            where: { company_id: id },
            include: { work_items: true }
        });

        const employees = await prisma.employees.findMany({
            where: { company_id: id },
            include: {
                salaries: true,
                leaves: true,
                overtimes: true,
                employee_assignments: true,
                employee_documents: true
            }
        });

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                company,
                vehicles,
                transactions,
                mealTickets,
                employees,
                customers,
                works,
                exportedAt: new Date().toISOString(),
                version: '2.0-cloud'
            }))
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function importCompanyData(userId, backupData) {
    try {
        if (!backupData || !backupData.company) {
            return { success: false, error: 'Geçersiz yedek dosyası formatı' };
        }

        const prisma = getPrismaClient();
        const compData = backupData.company;
        const result = await prisma.$transaction(async (tx) => {
            const comp = await tx.companies.create({
                data: {
                    user_id: parseInt(userId),
                    name: `${compData.name} (Geri Yüklendi)`,
                    tax_number: compData.tax_number || null,
                    tax_office: compData.tax_office || null,
                    sgk_no: compData.sgk_no || null,
                    address: compData.address || null,
                    phone: compData.phone || null
                }
            });

            // Restore vehicles
            if (Array.isArray(backupData.vehicles)) {
                for (const v of backupData.vehicles) {
                    await tx.vehicles.create({
                        data: {
                            company_id: comp.id,
                            plate: v.plate,
                            brand: v.brand || null,
                            model: v.model || null,
                            year: v.year ? parseInt(v.year) : null,
                            color: v.color || null,
                            status: v.status || 'active',
                            notes: v.notes || null,
                            km: v.km ? parseInt(v.km) : null
                        }
                    });
                }
            }

            // Restore customers
            if (Array.isArray(backupData.customers)) {
                for (const c of backupData.customers) {
                    await tx.customers.create({
                        data: {
                            company_id: comp.id,
                            name: c.name,
                            phone: c.phone || null,
                            email: c.email || null,
                            address: c.address || null,
                            tax_number: c.tax_number || null,
                            tax_office: c.tax_office || null
                        }
                    });
                }
            }

            // Restore employees
            if (Array.isArray(backupData.employees)) {
                for (const emp of backupData.employees) {
                    await tx.employees.create({
                        data: {
                            company_id: comp.id,
                            first_name: emp.first_name,
                            last_name: emp.last_name,
                            tc_no: emp.tc_no || null,
                            phone: emp.phone || null,
                            position: emp.position || null,
                            salary: emp.salary ? parseFloat(emp.salary) : null,
                            status: emp.status || 'active'
                        }
                    });
                }
            }

            return comp;
        });

        return { success: true, companyId: result.id, localStorage: backupData.localStorageData || null };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    archiveItem,
    archiveItems,
    getCompanyCompleteData,
    importCompanyData
};
