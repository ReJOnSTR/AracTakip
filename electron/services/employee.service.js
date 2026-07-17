const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function getEmployees(companyId, isArchived = 0) {
    try {
        const whereClause = { company_id: parseInt(companyId) };
        if (isArchived === 1) {
            whereClause.status = { not: 'active' };
        } else {
            whereClause.status = 'active';
        }

        const data = await prisma.employees.findMany({
            where: whereClause,
            select: {
                id: true,
                company_id: true,
                first_name: true,
                last_name: true,
                tc_no: true,
                phone: true,
                email: true,
                position: true,
                department: true,
                start_date: true,
                end_date: true,
                salary: true,
                status: true,
                notes: true,
                image: true,
                signature_path: true,
                is_archived: true,
                created_at: true,
                past_used_leaves: true,
                birth_date: true,
                iban: true,
                off_days: true,
                salaries: { where: { status: 'pending' } },
                leaves: { where: { status: 'pending' } },
                employee_salary_history: { orderBy: { start_date: 'asc' } }
            }
        });

        const collator = new Intl.Collator('tr');
        const sortedData = data.sort((a, b) => collator.compare(a.first_name, b.first_name));

        // Append summary fields
        const mapped = sortedData.map(emp => ({
            ...emp,
            pending_salaries: emp.salaries.length,
            pending_leaves: emp.leaves.length
        }));

        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getEmployeeById(id) {
    try {
        const data = await prisma.employees.findUnique({
            where: { id: parseInt(id) },
            include: { employee_salary_history: { orderBy: { start_date: 'asc' } } }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function addEmployee(data) {
    try {
        const emp = await prisma.employees.create({
            data: {
                company_id: parseInt(data.companyId),
                first_name: data.firstName,
                last_name: data.lastName,
                tc_no: data.tcNo || null,
                phone: data.phone || null,
                email: data.email || null,
                position: data.position || null,
                department: data.department || null,
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null,
                salary: data.salary ? parseFloat(data.salary) : 0,
                status: data.status || 'active',
                notes: data.notes || null,
                image: data.image || null,
                signature_path: data.signaturePath || data.signature_path || null,
                past_used_leaves: data.pastUsedLeaves ? parseInt(data.pastUsedLeaves) : 0,
                birth_date: data.birthDate ? new Date(data.birthDate) : null,
                iban: data.iban || null,
                off_days: data.offDays || '0',
                employee_salary_history: {
                    create: {
                        amount: data.salary ? parseFloat(data.salary) : 0,
                        start_date: data.effectiveDate ? new Date(data.effectiveDate) : new Date(data.startDate || new Date()),
                        type: 'initial'
                    }
                }
            }
        });
        return { success: true, data: emp };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateEmployee(data) {
    try {
        const empId = parseInt(data.id);
        const currentEmp = await prisma.employees.findUnique({
            where: { id: empId },
            include: { employee_salary_history: { orderBy: { start_date: 'desc' }, take: 1 } }
        });

        const newSalary = data.salary ? parseFloat(data.salary) : 0;
        const oldSalary = currentEmp.salary || 0;
        const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();

        let salaryHistoryOp = undefined;
        if (newSalary !== oldSalary) {
            // End the existing latest history
            if (currentEmp.employee_salary_history.length > 0) {
                const latestHistory = currentEmp.employee_salary_history[0];
                await prisma.employee_salary_history.update({
                    where: { id: latestHistory.id },
                    data: { end_date: effectiveDate }
                });
            }

            // Create new period
            salaryHistoryOp = {
                create: {
                    amount: newSalary,
                    start_date: effectiveDate,
                    type: 'raise'
                }
            };
        }

        const emp = await prisma.employees.update({
            where: { id: empId },
            data: {
                first_name: data.firstName,
                last_name: data.lastName,
                tc_no: data.tcNo || null,
                phone: data.phone || null,
                email: data.email || null,
                position: data.position || null,
                department: data.department || null,
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null,
                salary: newSalary,
                status: data.status || 'active',
                notes: data.notes || null,
                image: data.image || null,
                signature_path: data.signaturePath !== undefined ? data.signaturePath : (data.signature_path !== undefined ? data.signature_path : undefined),
                past_used_leaves: data.pastUsedLeaves ? parseInt(data.pastUsedLeaves) : 0,
                birth_date: data.birthDate ? new Date(data.birthDate) : null,
                iban: data.iban || null,
                off_days: data.offDays !== undefined ? data.offDays : undefined,
                employee_salary_history: salaryHistoryOp ? salaryHistoryOp : undefined
            }
        });
        return { success: true, data: emp };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteEmployee(id) {
    try {
        await prisma.employees.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getPayrollSummary(companyId, month) {
    try {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const [year, m] = targetMonth.split('-');
        const startDate = new Date(year, parseInt(m) - 1, 1);
        const endDate = new Date(year, parseInt(m), 0, 23, 59, 59);

        const employees = await prisma.employees.findMany({
            where: { 
                company_id: parseInt(companyId)
            },
            include: {
                salaries: true, // Fetch all salaries to filter by period in memory
                overtimes: { 
                    where: { 
                        date: { gte: startDate, lte: endDate },
                        is_archived: 0
                    } 
                },
                employee_salary_history: { orderBy: { start_date: 'asc' } }
            }
        });

        // Filter salaries in memory to match the exact same logic as PC
        const filteredEmployees = employees.map(emp => {
            const monthlySalaries = emp.salaries.filter(s => {
                if (s.salary_month) {
                    return s.salary_month === targetMonth;
                }
                if (!s.payment_date && !s.created_at) return false;
                try {
                    const d = s.payment_date || s.created_at;
                    const dStr = typeof d === 'string' ? d : d.toISOString();
                    return dStr.startsWith(targetMonth);
                } catch (e) {
                    return false;
                }
            });

            return {
                ...emp,
                salaries: monthlySalaries
            };
        });

        // Filter employees based on their start date and archived/end date for targetMonth
        const resultEmployees = filteredEmployees.filter(emp => {
            const startMonth = emp.start_date ? new Date(emp.start_date).toISOString().slice(0, 7) : null;
            const endMonth = emp.end_date ? new Date(emp.end_date).toISOString().slice(0, 7) : null;

            // 1. Skip if before start date
            if (startMonth && targetMonth < startMonth) {
                return false;
            }

            // 2. Skip if after end date
            if (endMonth && targetMonth > endMonth) {
                return false;
            }

            // 3. Skip if passive/archived and no end_date, unless they have records in this month
            if (emp.status !== 'active' && !emp.end_date) {
                const hasSalaries = emp.salaries && emp.salaries.length > 0;
                const hasOvertimes = emp.overtimes && emp.overtimes.length > 0;
                if (!hasSalaries && !hasOvertimes) {
                    return false;
                }
            }

            return true;
        });

        const collator = new Intl.Collator('tr');
        const sortedEmployees = resultEmployees.sort((a, b) => collator.compare(a.first_name, b.first_name));

        return { success: true, data: sortedEmployees };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


module.exports = {
    getEmployees, getEmployeeById, addEmployee, updateEmployee, deleteEmployee, getPayrollSummary
};
