const express = require('express');
const cors = require('cors');
const path = require('path');
const log = require('./logger'); // Use the app's existing logger
const jwt = require('jsonwebtoken');
const authService = require('./services/auth.service');

const SECRET_KEY = process.env.JWT_SECRET || 'dev-admin-secret-key-12345';

let serverInstance = null;

// Hardcoded tables based on prisma/schema.prisma
const TABLES = [
    'assignments', 'companies', 'customers', 'documents', 'employees', 'employee_documents',
    'employee_assignments', 'employee_attendance', 'employee_movements', 'employee_salary_history',
    'inspections', 'insurances', 'leaves', 'maintenances', 'meal_settings', 'meal_tickets', 'overtimes',
    'recurring_transactions', 'salaries', 'services', 'transactions', 'users', 'vehicles', 'works', 'work_items'
];

function startAdminServer(prisma) {
    if (serverInstance) return; // Prevent multiple instances

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Helper to get allowed company IDs for a user
    async function getAllowedCompanyIds(userId) {
        const companies = await prisma.companies.findMany({
            where: { user_id: userId },
            select: { id: true }
        });
        return companies.map(c => c.id);
    }

    // Build isolation where clause
    async function buildIsolationWhere(table, userId, explicitCompanyId = null) {
        if (table === 'users') return { id: userId };
        if (table === 'companies') {
            return explicitCompanyId
                ? { id: parseInt(explicitCompanyId), user_id: userId }
                : { user_id: userId };
        }

        let companyIds = await getAllowedCompanyIds(userId);

        if (explicitCompanyId) {
            const reqId = parseInt(explicitCompanyId);
            if (!companyIds.includes(reqId)) {
                throw new Error('Erişim yetkiniz olmayan bir şirket seçtiniz.');
            }
            companyIds = [reqId]; // Filter strictly to this one company
        }

        const tablesWithCompanyId = ['customers', 'employees', 'meal_settings', 'meal_tickets', 'recurring_transactions', 'transactions', 'vehicles', 'works'];
        const tablesWithVehicleId = ['assignments', 'documents', 'inspections', 'insurances', 'maintenances', 'services'];
        const tablesWithEmployeeId = ['employee_documents', 'employee_assignments', 'leaves', 'overtimes', 'employee_attendance', 'employee_movements', 'employee_salary_history', 'salaries'];
        const tablesWithWorkId = ['work_items'];

        if (tablesWithCompanyId.includes(table)) {
            return { company_id: { in: companyIds } };
        } else if (tablesWithVehicleId.includes(table)) {
            const vehicles = await prisma.vehicles.findMany({ where: { company_id: { in: companyIds } }, select: { id: true } });
            return { vehicle_id: { in: vehicles.map(v => v.id) } };
        } else if (tablesWithEmployeeId.includes(table)) {
            const employees = await prisma.employees.findMany({ where: { company_id: { in: companyIds } }, select: { id: true } });
            return { employee_id: { in: employees.map(e => e.id) } };
        } else if (tablesWithWorkId.includes(table)) {
            const works = await prisma.works.findMany({ where: { company_id: { in: companyIds } }, select: { id: true } });
            return { work_id: { in: works.map(w => w.id) } };
        }

        return { id: -1 }; // Fallback to safe state (return nothing) if relation mapping is missed
    }

    // Serve the frontend HTML page
    const adminStaticFolder = path.join(__dirname, 'admin');
    app.use(express.static(adminStaticFolder));

    // API: Login
    app.post('/api/login', async (req, res) => {
        const { username, email, password } = req.body;
        const result = await authService.loginUser({ username, email, password });

        if (result.success) {
            const token = jwt.sign({ id: result.user.id, username: result.user.username }, SECRET_KEY, { expiresIn: '12h' });
            res.json({ success: true, token, user: result.user });
        } else {
            res.status(401).json({ success: false, error: result.error });
        }
    });

    // JWT Security Middleware
    app.use('/api', (req, res, next) => {
        if (req.path === '/login') return next(); // Skip logic for login

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            req.user = decoded; // { id, username, iat, exp }
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    });

    // API: Get Tables
    app.get('/api/tables', (req, res) => {
        res.json({ success: true, tables: TABLES });
    });

    // API: Get User's Companies (Used for the Dropdown)
    app.get('/api/my-companies', async (req, res) => {
        try {
            const companies = await prisma.companies.findMany({
                where: { user_id: req.user.id },
                orderBy: { name: 'asc' }
            });
            res.json({ success: true, data: companies });
        } catch (error) {
            log.error('Admin panel error fetching my-companies:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API: Get Table Data
    app.get('/api/data/:table', async (req, res) => {
        const table = req.params.table;
        const companyId = req.query.companyId || null; // Capture the dropdown's selected value

        if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        try {
            const isolateWhere = await buildIsolationWhere(table, req.user.id, companyId);
            const data = await prisma[table].findMany({
                take: 500,
                where: isolateWhere
            });
            res.json({ success: true, data });
        } catch (error) {
            log.error(`Admin panel error fetching ${table}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    // API: Create Record
    app.post('/api/data/:table', async (req, res) => {
        const table = req.params.table;
        if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        try {
            // Very rudimentary dynamic insertion logic for the developer panel.
            // CAUTION: It expects the frontend to provide valid relations except for user_id which we can inject.
            const payload = { ...req.body };

            if (table === 'companies') {
                payload.user_id = req.user.id;
            } else if (table === 'users') {
                // Not allowed to create arbitrary users via admin generic endpoint securely usually
                return res.status(403).json({ error: 'Kullanıcı ekleme işlemi buradan yapılamaz.' });
            }

            const record = await prisma[table].create({
                data: payload
            });
            res.json({ success: true, data: record });
        } catch (error) {
            log.error(`Admin panel error creating ${table}:`, error);
            res.status(500).json({ error: 'Ekleme başarısız: ' + error.message });
        }
    });

    // API: Delete Record
    app.delete('/api/data/:table/:id', async (req, res) => {
        const table = req.params.table;
        const id = parseInt(req.params.id);
        const companyId = req.query.companyId || null; // Capture the dropdown's selected value

        if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        try {
            // Check ownership before deleting
            const isolateWhere = await buildIsolationWhere(table, req.user.id, companyId);
            const record = await prisma[table].findFirst({
                where: { id: id, ...isolateWhere }
            });

            if (!record) {
                return res.status(403).json({ error: 'Forbidden: Record not found or you do not have permission to delete it.' });
            }

            await prisma[table].delete({
                where: { id }
            });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Additional CRUD can be added here (Update, Create).
    // API: Update Record
    app.put('/api/data/:table/:id', async (req, res) => {
        const table = req.params.table;
        const id = parseInt(req.params.id);
        const companyId = req.query.companyId || null;

        if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        try {
            // Check ownership
            const isolateWhere = await buildIsolationWhere(table, req.user.id, companyId);
            const record = await prisma[table].findFirst({
                where: { id: id, ...isolateWhere }
            });

            if (!record) {
                return res.status(403).json({ error: 'Forbidden: Record not found or you do not have permission to update it.' });
            }

            const payload = { ...req.body };
            delete payload.id; // never update ID
            
            // Remove foreign keys if empty string
            for (const key in payload) {
                if (payload[key] === '') payload[key] = null;
            }

            const updatedRecord = await prisma[table].update({
                where: { id },
                data: payload
            });
            res.json({ success: true, data: updatedRecord });
        } catch (error) {
            log.error(`Admin panel error updating ${table}:`, error);
            res.status(500).json({ error: 'Güncelleme başarısız: ' + error.message });
        }
    });

    const PORT = 9999;
    serverInstance = app.listen(PORT, 'localhost', () => {
        log.info(`🛠️  Developer Database Admin Panel is running on http://localhost:${PORT}`);
    });
}

function stopAdminServer() {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
        log.info('Admin Server stopped.');
    }
}

module.exports = { startAdminServer, stopAdminServer };
