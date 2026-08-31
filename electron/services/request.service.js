const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();
const { createSalary, createLeave, addOvertime, addEmployeeAssignment } = require('./employeeData.service');

/**
 * Talep Oluşturma
 */
async function createRequest(data) {
    try {
        const { companyId, createdById, employeeId, type, title, description, requestData, documentPath } = data;

        if (!companyId || !createdById || !employeeId || !type || !title) {
            return { success: false, error: 'Şirket, oluşturan kullanıcı, personel, talep türü ve başlık zorunludur.' };
        }

        const newRequest = await prisma.requests.create({
            data: {
                company_id: Number(companyId),
                created_by_id: Number(createdById),
                employee_id: Number(employeeId),
                type,
                title,
                description: description || '',
                request_data: typeof requestData === 'object' ? JSON.stringify(requestData) : (requestData || '{}'),
                document_path: documentPath || null,
                status: 'PENDING',
                current_step: 1,
                total_steps: 1
            },
            include: {
                employee: true,
                creator: {
                    select: { id: true, username: true, full_name: true }
                }
            }
        });

        return { success: true, data: newRequest };
    } catch (error) {
        console.error('createRequest error:', error);
        return { success: false, error: 'Talep oluşturulurken hata oluştu: ' + error.message };
    }
}

/**
 * Talepleri Listeleme (Yetki & Kapsama Göre)
 */
async function getRequests(filters = {}) {
    try {
        const { companyId, employeeId, createdById, status, type } = filters;

        const where = {};
        if (companyId) where.company_id = Number(companyId);
        if (employeeId) where.employee_id = Number(employeeId);
        if (createdById) where.created_by_id = Number(createdById);
        if (status) where.status = status;
        if (type) where.type = type;

        const list = await prisma.requests.findMany({
            where,
            include: {
                employee: {
                    select: { id: true, first_name: true, last_name: true, department: true, position: true }
                },
                creator: {
                    select: { id: true, username: true, full_name: true }
                },
                approvals: {
                    include: {
                        approver: { select: { id: true, full_name: true, username: true } }
                    },
                    orderBy: { action_date: 'desc' }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        const formattedList = list.map(item => ({
            ...item,
            parsedData: (() => {
                try { return JSON.parse(item.request_data); } catch (e) { return {}; }
            })()
        }));

        return { success: true, data: formattedList };
    } catch (error) {
        console.error('getRequests error:', error);
        return { success: false, error: 'Talepler getirilirken hata oluştu: ' + error.message };
    }
}

/**
 * Talep Onaylama / Reddetme
 */
async function processApproval(data) {
    try {
        const { requestId, status, comment, approverId } = data;

        if (!requestId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
            return { success: false, error: 'Geçersiz talep onay parametreleri' };
        }

        const request = await prisma.requests.findUnique({
            where: { id: Number(requestId) },
            include: { employee: true }
        });

        if (!request) {
            return { success: false, error: 'Talep bulunamadı' };
        }

        if (request.status !== 'PENDING') {
            return { success: false, error: 'Bu talep daha önce sonuçlandırılmıştır.' };
        }

        // Onay adımı kaydı
        await prisma.request_approvals.create({
            data: {
                request_id: Number(requestId),
                approver_id: approverId ? Number(approverId) : null,
                step: request.current_step,
                status,
                comment: comment || null
            }
        });

        // Talebin ana durumunu güncelle
        const updatedRequest = await prisma.requests.update({
            where: { id: Number(requestId) },
            data: {
                status,
                updated_at: new Date()
            }
        });

        // Eğer ONAYLANDI ise otomasyon tetikleyiciyi çalıştır
        if (status === 'APPROVED' && !data.skipAutomation) {
            await triggerAutomationAfterApproval(request);
        }

        return { success: true, data: updatedRequest };
    } catch (error) {
        console.error('processApproval error:', error);
        return { success: false, error: 'İşlem gerçekleştirilemedi: ' + error.message };
    }
}

/**
 * Onay Sonrası Otomatik Veri Aktarımı
 */
async function triggerAutomationAfterApproval(request) {
    let payload = {};
    try {
        payload = JSON.parse(request.request_data || '{}');
    } catch (e) {
        console.error('Failed to parse request_data for automation:', e);
    }

    const { type, employee_id, company_id } = request;

    if (type === 'LEAVE') {
        // İzin Talebi Otomasyonu -> leaves tablosu
        await createLeave({
            employeeId: Number(employee_id),
            type: payload.leave_type || 'annual',
            startDate: payload.start_date,
            endDate: payload.end_date,
            days: payload.days ? Number(payload.days) : 1,
            hours: payload.hours ? Number(payload.hours) : undefined,
            status: 'approved',
            notes: `[Onaylı Talep #${request.id}] ${request.description || ''}`.trim()
        });
    } else if (type === 'ADVANCE') {
        // Ödeme Talebi Otomasyonu -> salaries tablosu
        await createSalary({
            employeeId: Number(employee_id),
            period: payload.payment_type || 'advance',
            baseSalary: 0,
            bonus: 0,
            deduction: 0,
            netSalary: payload.amount ? Number(payload.amount) : 0,
            paymentDate: payload.payment_date ? new Date(payload.payment_date) : new Date(),
            salaryMonth: payload.salary_month || (payload.payment_date ? String(payload.payment_date).substring(0, 7) : new Date().toISOString().substring(0, 7)),
            status: 'paid',
            paymentMethod: payload.payment_method || 'cash',
            notes: `[Onaylı ${payload.payment_type === 'loan' ? 'Borç' : (payload.payment_type === 'advance' ? 'Avans' : 'Ödeme')} Talebi #${request.id}] ${request.description || ''}`.trim()
        });
    } else if (type === 'OVERTIME') {
        // Mesai Talebi Otomasyonu -> overtimes tablosu
        await addOvertime({
            employeeId: Number(employee_id),
            date: payload.date || payload.overtime_date || new Date(),
            hours: payload.hours ? Number(payload.hours) : 0,
            rate: payload.rate ? Number(payload.rate) : 1.5,
            amount: payload.amount ? Number(payload.amount) : 0,
            notes: `[Onaylı Mesai Talebi #${request.id}] ${request.description || ''}`.trim()
        });
    } else if (type === 'VEHICLE_ASSIGNMENT') {
        // Araç Zimmet Talebi Otomasyonu -> hem genel assignments hem de personel zimmet tablosu
        const emp = request.employee;
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Personel';

        // 1. Genel araç zimmeti (Araç takibi için)
        await prisma.assignments.create({
            data: {
                vehicle_id: payload.vehicle_id ? Number(payload.vehicle_id) : null,
                item_name: payload.vehicle_name || 'Şirket Aracı',
                quantity: 1,
                assigned_to: empName,
                department: emp ? emp.department : null,
                start_date: payload.start_date ? new Date(payload.start_date) : new Date(),
                end_date: payload.end_date ? new Date(payload.end_date) : null,
                notes: `[Onaylı Araç Tahsis Talebi #${request.id}] ${request.description || ''}`.trim()
            }
        });

        // 2. Personel özlük dosyasındaki zimmet tablosu
        await addEmployeeAssignment({
            employeeId: Number(employee_id),
            itemName: payload.vehicle_name || 'Şirket Aracı',
            serialNumber: payload.vehicle_id ? String(payload.vehicle_id) : null,
            quantity: 1,
            assignDate: payload.start_date ? new Date(payload.start_date) : new Date(),
            returnDate: payload.end_date ? new Date(payload.end_date) : null,
            status: 'active',
            notes: `[Onaylı Araç Tahsis Talebi #${request.id}] ${request.description || ''}`.trim()
        });
    } else if (type === 'EXPENSE') {
        // Masraf / Harcama Talebi Otomasyonu -> transactions (gider) tablosu
        await prisma.transactions.create({
            data: {
                company_id: Number(company_id),
                date: payload.expense_date ? new Date(payload.expense_date) : new Date(),
                type: 'EXPENSE',
                category: payload.category || 'Personel Masrafı',
                amount: payload.amount ? Number(payload.amount) : 0,
                description: `[Personel Masraf İadesi #${request.id}] ${request.description || ''}`.trim(),
                method: payload.payment_method || 'CASH',
                status: 'COMPLETED'
            }
        });
    }
}

module.exports = {
    createRequest,
    getRequests,
    processApproval
};
