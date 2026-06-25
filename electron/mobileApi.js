/**
 * Mobile API Routes
 * Domain-specific REST endpoints for the Kontrol mobile app.
 * Mounted under /api/mobile in adminServer.js
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const saveBase64File = async (fileName, fileData) => {
    if (!fileData) return null;
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'files');
    
    if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
    }

    const ext = path.extname(fileName || '');
    const newFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext || '.bin'}`;
    const destPath = path.join(filesDir, newFileName);

    const buffer = Buffer.from(fileData, 'base64');
    await fs.promises.writeFile(destPath, buffer);
    return newFileName;
};

function createMobileRoutes(db, onDbUpdate) {
    const notify = (table, action) => {
        if (typeof onDbUpdate === 'function') {
            onDbUpdate({ table, action });
        }
    };

    // ============ DASHBOARD ============
    router.get('/dashboard/stats', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getDashboardStats(companyId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/dashboard/upcoming', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getUpcomingEvents(companyId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/dashboard/recent-activity', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getRecentActivity(companyId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============ VEHICLES ============
    router.get('/vehicles', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getVehicles(companyId, isArchived === '1' ? 1 : 0);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/vehicles/:id', async (req, res) => {
        try {
            const result = await db.getVehicleById(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/vehicles', async (req, res) => {
        try {
            const result = await db.createVehicle(req.body);
            if (result.success) notify('vehicles', 'create');
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.put('/vehicles/:id', async (req, res) => {
        try {
            const result = await db.updateVehicle({ ...req.body, id: req.params.id });
            if (result.success) notify('vehicles', 'update');
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.delete('/vehicles/:id', async (req, res) => {
        try {
            const result = await db.deleteVehicle(req.params.id);
            if (result.success) notify('vehicles', 'delete');
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Vehicle sub-collections
    router.get('/vehicles/:id/maintenances', async (req, res) => {
        try {
            const result = await db.getMaintenances(parseInt(req.params.id));
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/vehicles/:id/inspections', async (req, res) => {
        try {
            const result = await db.getInspections(parseInt(req.params.id));
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/vehicles/:id/insurances', async (req, res) => {
        try {
            const result = await db.getInsurances(parseInt(req.params.id));
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/vehicles/:id/services', async (req, res) => {
        try {
            const result = await db.getServices(parseInt(req.params.id));
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/vehicles/:id/assignments', async (req, res) => {
        try {
            const result = await db.getAssignments(parseInt(req.params.id));
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/vehicles/:id/documents', async (req, res) => {
        try {
            const { isArchived } = req.query;
            const result = await db.getDocumentsByVehicle(parseInt(req.params.id), isArchived === '1' ? 1 : 0);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Vehicle sub-collection CRUD
    router.post('/maintenances', async (req, res) => {
        try { res.json(await db.createMaintenance(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/maintenances/:id', async (req, res) => {
        try { res.json(await db.updateMaintenance({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/maintenances/:id', async (req, res) => {
        try { res.json(await db.deleteMaintenance(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/inspections', async (req, res) => {
        try { res.json(await db.createInspection(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/inspections/:id', async (req, res) => {
        try { res.json(await db.updateInspection({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/inspections/:id', async (req, res) => {
        try { res.json(await db.deleteInspection(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/insurances', async (req, res) => {
        try { res.json(await db.createInsurance(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/insurances/:id', async (req, res) => {
        try { res.json(await db.updateInsurance({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/insurances/:id', async (req, res) => {
        try { res.json(await db.deleteInsurance(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/services', async (req, res) => {
        try { res.json(await db.createService(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/services/:id', async (req, res) => {
        try { res.json(await db.updateService({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/services/:id', async (req, res) => {
        try { res.json(await db.deleteService(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/assignments', async (req, res) => {
        try { res.json(await db.createAssignment(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/assignments/:id', async (req, res) => {
        try { res.json(await db.updateAssignment({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/assignments/:id', async (req, res) => {
        try { res.json(await db.deleteAssignment(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/documents', async (req, res) => {
        try {
            let filePath = req.body.filePath || 'mobile-upload';
            if (req.body.fileData) {
                const savedName = await saveBase64File(req.body.fileNameOnDisk || req.body.fileName, req.body.fileData);
                if (savedName) filePath = savedName;
            }
            const ext = path.extname(req.body.fileNameOnDisk || req.body.fileName || '');
            res.json(await db.addDocument({
                ...req.body,
                filePath,
                fileType: ext || req.body.fileType || null
            }));
        }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/documents/:id', async (req, res) => {
        try { res.json(await db.deleteDocument(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // All maintenances/inspections/insurances/services by company
    router.get('/maintenances', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getAllMaintenances(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.get('/inspections', async (req, res) => {
        try {
            const { companyId, type, isArchived } = req.query;
            res.json(await db.getAllInspections(companyId, type || 'all', isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.get('/insurances', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getAllInsurances(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.get('/services-all', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getAllServices(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.get('/assignments-all', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getAllAssignments(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // ============ EMPLOYEES ============
    router.get('/employees', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getEmployees(companyId, isArchived === '1' ? 1 : 0);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/employees/payroll-summary', async (req, res) => {
        try {
            const { companyId, month } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getPayrollSummary(companyId, month);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/employees/:id', async (req, res) => {
        try {
            const result = await db.getEmployeeById(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/employees', async (req, res) => {
        try {
            const result = await db.addEmployee(req.body);
            if (result.success) notify('employees', 'create');
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.put('/employees/:id', async (req, res) => {
        try {
            const result = await db.updateEmployee({ ...req.body, id: req.params.id });
            if (result.success) notify('employees', 'update');
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.delete('/employees/:id', async (req, res) => {
        try {
            const result = await db.deleteEmployee(req.params.id);
            if (result.success) notify('employees', 'delete');
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Employee sub-collections
    router.get('/employees/:id/salaries', async (req, res) => {
        try { res.json(await db.getSalariesByEmployee(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/employees/:id/leaves', async (req, res) => {
        try { res.json(await db.getLeavesByEmployee(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/employees/:id/overtimes', async (req, res) => {
        try { res.json(await db.getOvertimes(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/employees/:id/assignments', async (req, res) => {
        try { res.json(await db.getEmployeeAssignments(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/employees/:id/documents', async (req, res) => {
        try {
            const { isArchived } = req.query;
            res.json(await db.getEmployeeDocuments(req.params.id, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/employees/:id/movements', async (req, res) => {
        try { res.json(await db.getAllEmployeeMovements(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/leaves', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            res.json(await db.getAllLeaves(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/overtimes', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            res.json(await db.getAllOvertimes(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/salaries', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            res.json(await db.getAllSalariesForCompany(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // Employee sub-collection CRUD
    router.post('/salaries', async (req, res) => {
        try { res.json(await db.createSalary(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/salaries/:id', async (req, res) => {
        try { res.json(await db.updateSalary({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/salaries/:id', async (req, res) => {
        try { res.json(await db.deleteSalary(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/leaves', async (req, res) => {
        try { res.json(await db.createLeave(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/leaves/:id', async (req, res) => {
        try { res.json(await db.updateLeave({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/leaves/:id', async (req, res) => {
        try { res.json(await db.deleteLeave(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/overtimes', async (req, res) => {
        try { res.json(await db.addOvertime(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/overtimes/:id', async (req, res) => {
        try { res.json(await db.updateOvertime({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/overtimes/:id', async (req, res) => {
        try { res.json(await db.deleteOvertime(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/employee-movements', async (req, res) => {
        try { res.json(await db.addEmployeeMovement(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/employee-movements/:id', async (req, res) => {
        try { res.json(await db.updateEmployeeMovement({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/employee-movements/:id', async (req, res) => {
        try { res.json(await db.deleteEmployeeMovement(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/employee-assignments', async (req, res) => {
        try { res.json(await db.addEmployeeAssignment(req.body)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/employee-assignments/:id', async (req, res) => {
        try { res.json(await db.updateEmployeeAssignment({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/employee-assignments/:id', async (req, res) => {
        try { res.json(await db.deleteEmployeeAssignment(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/employee-documents', async (req, res) => {
        try {
            let filePath = req.body.filePath || 'mobile-upload';
            if (req.body.fileData) {
                const savedName = await saveBase64File(req.body.fileNameOnDisk || req.body.fileName, req.body.fileData);
                if (savedName) filePath = savedName;
            }
            const ext = path.extname(req.body.fileNameOnDisk || req.body.fileName || '');
            res.json(await db.addEmployeeDocument({
                ...req.body,
                filePath,
                fileType: ext || req.body.fileType || null
            }));
        }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.put('/employee-documents/:id', async (req, res) => {
        try { res.json(await db.updateEmployeeDocument({ ...req.body, id: req.params.id })); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });
    router.delete('/employee-documents/:id', async (req, res) => {
        try { res.json(await db.deleteEmployeeDocument(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // ============ FINANCE ============
    router.get('/finance', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getTransactions(companyId, isArchived === '1' ? 1 : 0);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/finance/stats', async (req, res) => {
        try {
            const { companyId } = req.query;
            if (!companyId) return res.status(400).json({ error: 'companyId gerekli' });
            const result = await db.getFinanceStats(companyId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/finance/checks', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getChecksAndNotes(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/finance/:id', async (req, res) => {
        try { res.json(await db.getTransactionById(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/finance', async (req, res) => {
        try {
            const result = await db.createTransaction(req.body);
            if (result.success) notify('transactions', 'create');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.put('/finance/:id', async (req, res) => {
        try {
            const result = await db.updateTransaction({ ...req.body, id: req.params.id });
            if (result.success) notify('transactions', 'update');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.delete('/finance/:id', async (req, res) => {
        try {
            const result = await db.deleteTransaction(req.params.id);
            if (result.success) notify('transactions', 'delete');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.put('/finance/:id/check-status', async (req, res) => {
        try { res.json(await db.updateCheckStatus(req.params.id, req.body.status)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // ============ MEAL TICKETS ============
    router.get('/meal-tickets', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getMealTickets(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/meal-tickets/stats', async (req, res) => {
        try {
            const { companyId } = req.query;
            res.json(await db.getMealTicketStats(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/meal-tickets/price', async (req, res) => {
        try {
            const { companyId } = req.query;
            res.json(await db.getMealPrice(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/meal-tickets', async (req, res) => {
        try {
            const result = await db.addMealTicket(req.body);
            if (result.success) notify('meal_tickets', 'create');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.put('/meal-tickets/:id', async (req, res) => {
        try {
            const result = await db.updateMealTicket({ ...req.body, id: req.params.id });
            if (result.success) notify('meal_tickets', 'update');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.delete('/meal-tickets/:id', async (req, res) => {
        try {
            const result = await db.deleteMealTicket(req.params.id);
            if (result.success) notify('meal_tickets', 'delete');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // ============ WORKS & CUSTOMERS ============
    router.get('/works', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getWorks(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/works/:id', async (req, res) => {
        try { res.json(await db.getWorkDetails(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/works', async (req, res) => {
        try {
            const result = await db.createWork(req.body);
            if (result.success) notify('works', 'create');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.put('/works/:id', async (req, res) => {
        try {
            const result = await db.updateWork({ ...req.body, id: req.params.id });
            if (result.success) notify('works', 'update');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.delete('/works/:id', async (req, res) => {
        try {
            const result = await db.deleteWork(req.params.id);
            if (result.success) notify('works', 'delete');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/customers', async (req, res) => {
        try {
            const { companyId, isArchived } = req.query;
            res.json(await db.getCustomers(companyId, isArchived === '1' ? 1 : 0));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/customers/:id', async (req, res) => {
        try { res.json(await db.getCustomerDetails(req.params.id)); }
        catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.post('/customers', async (req, res) => {
        try {
            const result = await db.createCustomer(req.body);
            if (result.success) notify('customers', 'create');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.put('/customers/:id', async (req, res) => {
        try {
            const result = await db.updateCustomer({ ...req.body, id: req.params.id });
            if (result.success) notify('customers', 'update');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.delete('/customers/:id', async (req, res) => {
        try {
            const result = await db.deleteCustomer(req.params.id);
            if (result.success) notify('customers', 'delete');
            res.json(result);
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // ============ GLOBAL SEARCH ============
    router.get('/search', async (req, res) => {
        try {
            const { companyId, q } = req.query;
            if (!companyId || !q || q.length < 2) return res.json({ success: true, data: [] });

            const query = q.toLocaleLowerCase('tr-TR').replace(/\s/g, '');
            const [vehiclesRes, employeesRes, customersRes] = await Promise.all([
                db.getVehicles(companyId, false).catch(() => ({ success: false })),
                db.getEmployees(companyId, false).catch(() => ({ success: false })),
                db.getCustomers(companyId, 0).catch(() => ({ success: false }))
            ]);

            const results = [];
            const vehicles = (vehiclesRes && vehiclesRes.success) ? (vehiclesRes.data || []) : [];
            const employees = (employeesRes && employeesRes.success) ? (employeesRes.data || []) : [];
            const customers = (customersRes && customersRes.success) ? (customersRes.data || []) : [];

            if (Array.isArray(vehicles)) {
                vehicles.forEach(v => {
                    if (!v) return;
                    const plate = (v.plate?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '');
                    const brand = (v.brand?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '');
                    const model = (v.model?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '');
                    if (plate.includes(query) || brand.includes(query) || model.includes(query)) {
                        results.push({ id: v.id, type: 'vehicle', title: v.plate, subtitle: `${v.brand || ''} ${v.model || ''}`, icon: 'Car' });
                    }
                });
            }

            if (Array.isArray(employees)) {
                employees.forEach(e => {
                    if (!e) return;
                    const fullName = `${e.first_name}${e.last_name}`.toLocaleLowerCase('tr-TR').replace(/\s/g, '');
                    const phone = (e.phone?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '');
                    if (fullName.includes(query) || phone.includes(query)) {
                        results.push({ id: e.id, type: 'employee', title: `${e.first_name} ${e.last_name}`, subtitle: e.position || 'Personel', icon: 'User' });
                    }
                });
            }

            if (Array.isArray(customers)) {
                customers.forEach(c => {
                    if (!c) return;
                    const name = (c.name?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '');
                    if (name.includes(query)) {
                        results.push({ id: c.id, type: 'customer', title: c.name, subtitle: c.phone || 'Müşteri', icon: 'Building2' });
                    }
                });
            }

            res.json({ success: true, data: results.slice(0, 15) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============ ARCHIVE ============
    router.post('/archive', async (req, res) => {
        try {
            const { table, id, isArchived } = req.body;
            res.json(await db.archiveItem(table, id, isArchived));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    // ============ SETTINGS ============
    router.get('/settings/departments', async (req, res) => {
        try {
            const { companyId } = req.query;
            res.json(await db.getDepartments(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/settings/leave-types', async (req, res) => {
        try {
            const { companyId } = req.query;
            res.json(await db.getLeaveTypes(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/settings/vehicle-types', async (req, res) => {
        try {
            const { companyId } = req.query;
            res.json(await db.getVehicleTypes(companyId));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    router.get('/settings/document-categories', async (req, res) => {
        try {
            const { companyId, targetType } = req.query;
            res.json(await db.getDocumentCategories(companyId, targetType));
        } catch (error) { res.status(500).json({ success: false, error: error.message }); }
    });

    return router;
}

module.exports = { createMobileRoutes };
