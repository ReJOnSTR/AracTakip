const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function getEmployees(companyId) {
    try {
        const data = await prisma.employees.findMany({
            where: { company_id: parseInt(companyId) },
            include: {
                salaries: { where: { status: 'pending' } },
                leaves: { where: { status: 'pending' } }
            },
            orderBy: { first_name: 'asc' }
        });

        // Append summary fields
        const mapped = data.map(emp => ({
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
            where: { id: parseInt(id) }
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
                past_used_leaves: data.pastUsedLeaves ? parseInt(data.pastUsedLeaves) : 0,
                birth_date: data.birthDate ? new Date(data.birthDate) : null
            }
        });
        return { success: true, data: emp };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateEmployee(data) {
    try {
        const emp = await prisma.employees.update({
            where: { id: parseInt(data.id) },
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
                salary: data.salary ? parseFloat(data.salary) : 0,
                status: data.status || 'active',
                notes: data.notes || null,
                image: data.image || null,
                past_used_leaves: data.pastUsedLeaves ? parseInt(data.pastUsedLeaves) : 0,
                birth_date: data.birthDate ? new Date(data.birthDate) : null
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

module.exports = {
    getEmployees, getEmployeeById, addEmployee, updateEmployee, deleteEmployee
};
