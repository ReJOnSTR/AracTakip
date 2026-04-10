const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function syncFinanceTransaction(salaryId, action, employeeId, paymentMethod, netSalary, paymentDate, period, status) {
    try {
        const categoryCode = `SALARY_PAYMENT_${salaryId}`;
        
        if (action === 'delete') {
            await prisma.transactions.deleteMany({ where: { category: categoryCode } });
            return;
        }

        const emp = await prisma.employees.findUnique({ where: { id: parseInt(employeeId) } });
        if (!emp) return;

        const cashMethods = ['kasa', 'KASA'];
        const isValidMethod = cashMethods.includes(paymentMethod);

        if (status === 'paid' && isValidMethod) {
            const methodCode = 'CASH';
            const amount = parseFloat(netSalary) || 0;
            const date = paymentDate ? new Date(paymentDate) : new Date();
            const desc = `${emp.first_name} ${emp.last_name} Ödeme (${period})`;

            const existingTx = await prisma.transactions.findFirst({ where: { category: categoryCode } });

            if (existingTx) {
                await prisma.transactions.update({
                    where: { id: existingTx.id },
                    data: { method: methodCode, amount: amount, date: date, description: desc }
                });
            } else {
                await prisma.transactions.create({
                    data: {
                        company_id: emp.company_id,
                        type: 'OUT',
                        method: methodCode,
                        amount: amount,
                        currency: 'TRY',
                        date: date,
                        category: categoryCode,
                        description: desc,
                        status: 'COMPLETED'
                    }
                });
            }
        } else {
             await prisma.transactions.deleteMany({ where: { category: categoryCode } });
        }
    } catch (err) {
        console.error("Finance sync error for salary:", err);
    }
}

// ========== SALARIES ==========
async function getSalariesByEmployee(employeeId) {
    try {
        const data = await prisma.salaries.findMany({
            where: { employee_id: parseInt(employeeId) },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createSalary(data) {
    try {
        const result = await prisma.salaries.create({
            data: {
                employee_id: parseInt(data.employeeId),
                period: data.period,
                base_salary: data.baseSalary ? parseFloat(data.baseSalary) : 0,
                bonus: data.bonus ? parseFloat(data.bonus) : 0,
                deduction: data.deduction ? parseFloat(data.deduction) : 0,
                net_salary: data.netSalary ? parseFloat(data.netSalary) : 0,
                payment_date: data.paymentDate ? new Date(data.paymentDate) : null,
                salary_month: data.salaryMonth || null,
                status: data.status || 'pending',
                payment_method: data.paymentMethod || 'cash',
                notes: data.notes || null
            }
        });
        
        await syncFinanceTransaction(result.id, 'create', data.employeeId, data.paymentMethod || 'nakit', data.netSalary, data.paymentDate, data.period, data.status || 'pending');
        
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateSalary(data) {
    try {
        const result = await prisma.salaries.update({
            where: { id: parseInt(data.id) },
            data: {
                period: data.period,
                base_salary: data.baseSalary ? parseFloat(data.baseSalary) : 0,
                bonus: data.bonus ? parseFloat(data.bonus) : 0,
                deduction: data.deduction ? parseFloat(data.deduction) : 0,
                net_salary: data.netSalary ? parseFloat(data.netSalary) : 0,
                payment_date: data.paymentDate ? new Date(data.paymentDate) : null,
                salary_month: data.salaryMonth || null,
                status: data.status,
                payment_method: data.paymentMethod,
                notes: data.notes || null
            }
        });
        
        const currentData = await prisma.salaries.findUnique({ where: { id: parseInt(data.id) } });
        await syncFinanceTransaction(data.id, 'update', currentData.employee_id, data.paymentMethod, data.netSalary, data.paymentDate, data.period, data.status);

        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteSalary(id) {
    try {
        await syncFinanceTransaction(parseInt(id), 'delete');
        await prisma.salaries.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// ========== LEAVES ==========
async function getLeavesByEmployee(employeeId) {
    try {
        const data = await prisma.leaves.findMany({
            where: { employee_id: parseInt(employeeId) },
            orderBy: [{ start_date: 'desc' }, { id: 'desc' }]
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createLeave(data) {
    try {
        const result = await prisma.leaves.create({
            data: {
                employee_id: parseInt(data.employeeId),
                type: data.type || 'annual',
                start_date: new Date(data.startDate),
                end_date: new Date(data.endDate),
                days: data.days ? parseInt(data.days) : 1,
                status: data.status || 'approved',
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateLeave(data) {
    try {
        const result = await prisma.leaves.update({
            where: { id: parseInt(data.id) },
            data: {
                type: data.type,
                start_date: new Date(data.startDate),
                end_date: new Date(data.endDate),
                days: data.days ? parseInt(data.days) : 1,
                status: data.status,
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteLeave(id) {
    try {
        await prisma.leaves.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}


// ========== OVERTIMES ==========
async function getOvertimes(employeeId) {
    try {
        const data = await prisma.overtimes.findMany({
            where: { employee_id: parseInt(employeeId) },
            orderBy: [{ date: 'desc' }, { id: 'desc' }]
        });
        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (error) { return { success: false, error: error.message }; }
}

async function addOvertime(data) {
    try {
        const result = await prisma.overtimes.create({
            data: {
                employee_id: parseInt(data.employeeId),
                date: new Date(data.date),
                hours: parseFloat(data.hours),
                rate: data.rate ? parseFloat(data.rate) : 1.5,
                amount: parseFloat(data.amount),
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateOvertime(data) {
    try {
        const result = await prisma.overtimes.update({
            where: { id: parseInt(data.id) },
            data: {
                date: new Date(data.date),
                hours: parseFloat(data.hours),
                rate: data.rate ? parseFloat(data.rate) : 1.5,
                amount: parseFloat(data.amount),
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteOvertime(id) {
    try {
        await prisma.overtimes.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// ========== EMPLOYEE ASSIGNMENTS (ZIMMET) ==========
async function getEmployeeAssignments(employeeId) {
    try {
        const data = await prisma.employee_assignments.findMany({
            where: { employee_id: parseInt(employeeId) },
            orderBy: [{ assign_date: 'desc' }, { id: 'desc' }]
        });
        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (error) { return { success: false, error: error.message }; }
}

async function addEmployeeAssignment(data) {
    try {
        const result = await prisma.employee_assignments.create({
            data: {
                employee_id: parseInt(data.employeeId),
                item_name: data.itemName,
                serial_number: data.serialNumber || null,
                assign_date: data.assignDate ? new Date(data.assignDate) : null,
                return_date: data.returnDate ? new Date(data.returnDate) : null,
                status: data.status || 'active',
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateEmployeeAssignment(data) {
    try {
        const result = await prisma.employee_assignments.update({
            where: { id: parseInt(data.id) },
            data: {
                item_name: data.itemName,
                serial_number: data.serialNumber || null,
                assign_date: data.assignDate ? new Date(data.assignDate) : null,
                return_date: data.returnDate ? new Date(data.returnDate) : null,
                status: data.status,
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteEmployeeAssignment(id) {
    try {
        await prisma.employee_assignments.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// ========== EMPLOYEE DOCUMENTS ==========
async function getEmployeeDocuments(employeeId) {
    try {
        const data = await prisma.employee_documents.findMany({
            where: { employee_id: parseInt(employeeId) },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (error) { return { success: false, error: error.message }; }
}

async function addEmployeeDocument(data) {
    try {
        const result = await prisma.employee_documents.create({
            data: {
                employee_id: parseInt(data.employeeId),
                file_name: data.fileName,
                file_path: data.filePath,
                file_type: data.fileType || null,
                category: data.category || null
            }
        });
        return { success: true, id: result.id };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteEmployeeDocument(id) {
    try {
        await prisma.employee_documents.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

module.exports = {
    getSalariesByEmployee, createSalary, updateSalary, deleteSalary,
    getLeavesByEmployee, createLeave, updateLeave, deleteLeave,
    getOvertimes, addOvertime, updateOvertime, deleteOvertime,
    getEmployeeAssignments, addEmployeeAssignment, updateEmployeeAssignment, deleteEmployeeAssignment,
    getEmployeeDocuments, addEmployeeDocument, deleteEmployeeDocument
};
