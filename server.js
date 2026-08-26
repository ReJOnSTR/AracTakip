const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Load environment variables if available
try {
    require('dotenv').config();
} catch (e) {}

const { getPrismaClient, runAutoMigrations } = require('./electron/prismaClient');
const prismaClient = require('./electron/prismaClient');
const prismaService = require('./electron/prismaService');
const authService = require('./electron/services/auth.service');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'kontrol-app-production-secret-key-98765';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Uploads directory configuration
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const filesDir = path.join(dataDir, 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
}
app.use('/uploads', express.static(filesDir));

// Serve compiled React frontend
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
}

// Comprehensive RPC Dispatch Map (1:1 with window.electronAPI)
const rpcMap = {
    // Auth
    login: authService.loginUser,
    loginUser: authService.loginUser,
    register: authService.registerUser,
    registerUser: authService.registerUser,
    changePassword: authService.changePassword,
    updateProfile: authService.updateProfile,
    createEmployeeUser: authService.createEmployeeUser,

    // Window / System Mocks
    focusWindow: async () => ({ success: true }),
    setFullScreen: async () => ({ success: true }),
    openFolder: async () => ({ success: true }),
    openExternal: async () => ({ success: true }),
    showNotification: async () => ({ success: true }),
    checkForUpdates: async () => ({ success: true, updateAvailable: false }),
    downloadUpdate: async () => ({ success: true }),
    quitAndInstall: async () => ({ success: true }),
    getAppVersion: async () => '1.13.11-web',

    // Companies
    getCompanies: (userId) => prismaClient.getCompanies(userId),
    createCompany: (data) => prismaClient.createCompany(data),
    updateCompany: (data) => prismaClient.updateCompany(data),
    deleteCompany: (id) => prismaClient.deleteCompany(id),

    // Vehicles
    getVehicles: (companyId, isArchived) => prismaClient.getAllVehicles(companyId, isArchived),
    getVehicleById: (id) => prismaClient.getVehicleById(id),
    createVehicle: (data) => prismaClient.createVehicle(data),
    updateVehicle: (data) => prismaClient.updateVehicle(data),
    deleteVehicle: (id) => prismaClient.deleteVehicle(id),

    // Maintenances
    getMaintenancesByVehicle: (vId) => prismaClient.getMaintenances(vId),
    getAllMaintenances: (cId, isArchived) => prismaClient.getAllMaintenances(cId, isArchived),
    createMaintenance: (data) => prismaClient.createMaintenance(data),
    updateMaintenance: (data) => prismaClient.updateMaintenance(data),
    deleteMaintenance: (id) => prismaClient.deleteMaintenance(id),

    // Inspections
    getInspectionsByVehicle: (vId) => prismaClient.getInspections(vId),
    getAllInspections: (cId, type, isArchived) => prismaClient.getAllInspections(cId, type, isArchived),
    createInspection: (data) => prismaClient.createInspection(data),
    updateInspection: (data) => prismaClient.updateInspection(data),
    deleteInspection: (id) => prismaClient.deleteInspection(id),

    // Insurances
    getInsurancesByVehicle: (vId) => prismaClient.getInsurances(vId),
    getAllInsurances: (cId, isArchived) => prismaClient.getAllInsurances(cId, isArchived),
    createInsurance: (data) => prismaClient.createInsurance(data),
    updateInsurance: (data) => prismaClient.updateInsurance(data),
    deleteInsurance: (id) => prismaClient.deleteInsurance(id),

    // Assignments
    getAssignmentsByVehicle: (vId) => prismaClient.getAssignments(vId),
    getAllAssignments: (cId, isArchived) => prismaClient.getAllAssignments(cId, isArchived),
    createAssignment: (data) => prismaClient.createAssignment(data),
    updateAssignment: (data) => prismaClient.updateAssignment(data),
    deleteAssignment: (id) => prismaClient.deleteAssignment(id),

    // Services
    getServicesByVehicle: (vId) => prismaClient.getServices(vId),
    getAllServices: (cId, isArchived) => prismaClient.getAllServices(cId, isArchived),
    createService: (data) => prismaClient.createService(data),
    updateService: (data) => prismaClient.updateService(data),
    deleteService: (id) => prismaClient.deleteService(id),

    // Employees
    getEmployees: (cId, isArchived) => prismaClient.getEmployees(cId, isArchived),
    getPayrollSummary: (cId, month) => prismaClient.getPayrollSummary(cId, month),
    getEmployeeById: (id) => prismaClient.getEmployeeById(id),
    createEmployee: (data) => prismaClient.addEmployee(data),
    updateEmployee: (data) => prismaClient.updateEmployee(data),
    deleteEmployee: (id) => prismaClient.deleteEmployee(id),

    // Salaries
    getSalaries: (empId) => prismaClient.getSalariesByEmployee(empId),
    getSalariesByCompany: (cId) => prismaClient.getAllSalariesForCompany(cId),
    createSalary: (data) => prismaClient.createSalary(data),
    updateSalary: (data) => prismaClient.updateSalary(data),
    deleteSalary: (id) => prismaClient.deleteSalary(id),
    createSalaryHistory: (data) => prismaClient.createSalaryHistory(data),
    updateSalaryHistory: (data) => prismaClient.updateSalaryHistory(data),
    deleteSalaryHistory: (id) => prismaClient.deleteSalaryHistory(id),

    // Leaves
    getLeaves: (empId) => prismaClient.getLeaves(empId),
    getLeavesByCompany: (cId) => prismaClient.getAllLeavesByCompany(cId),
    createLeave: (data) => prismaClient.createLeave(data),
    updateLeave: (data) => prismaClient.updateLeave(data),
    deleteLeave: (id) => prismaClient.deleteLeave(id),

    // Overtimes
    getOvertimes: (empId) => prismaClient.getOvertimes(empId),
    getAllOvertimes: (cId) => prismaClient.getAllOvertimesByCompany(cId),
    createOvertime: (data) => prismaClient.createOvertime(data),
    updateOvertime: (data) => prismaClient.updateOvertime(data),
    deleteOvertime: (id) => prismaClient.deleteOvertime(id),

    // Employee Assignments
    getEmployeeAssignments: (empId) => prismaClient.getEmployeeAssignments(empId),
    createEmployeeAssignment: (data) => prismaClient.createEmployeeAssignment(data),
    updateEmployeeAssignment: (data) => prismaClient.updateEmployeeAssignment(data),
    deleteEmployeeAssignment: (id) => prismaClient.deleteEmployeeAssignment(id),

    // Employee Documents
    getEmployeeDocuments: (empId, isArchived) => prismaClient.getEmployeeDocuments(empId, isArchived),
    getUpcomingPersonnelDocuments: (cId) => prismaClient.getUpcomingPersonnelDocuments(cId),
    createEmployeeDocument: (data) => prismaClient.createEmployeeDocument(data),
    updateEmployeeDocument: (data) => prismaClient.updateEmployeeDocument(data),
    deleteEmployeeDocument: (id) => prismaClient.deleteEmployeeDocument(id),

    // Employee Movements
    getAllEmployeeMovements: (cId) => prismaClient.getAllEmployeeMovements(cId),
    addEmployeeMovement: (data) => prismaClient.createEmployeeMovement(data),
    updateEmployeeMovement: (data) => prismaClient.updateEmployeeMovement(data),
    deleteEmployeeMovement: (id) => prismaClient.deleteEmployeeMovement(id),

    // Finance / Transactions
    getAllFinance: (cId, isArchived) => prismaClient.getTransactions(cId, isArchived),
    getTransactions: (cId, isArchived) => prismaClient.getTransactions(cId, isArchived),
    getFinanceById: (id) => prismaClient.getTransactionById(id),
    createFinance: (data) => prismaClient.createTransaction(data),
    updateFinance: (data) => prismaClient.updateTransaction(data),
    deleteFinance: (id) => prismaClient.deleteTransaction(id),
    getFinanceStats: (cId) => prismaClient.getFinanceStats(cId),
    getChecks: (cId, isArchived) => prismaClient.getChecksAndNotes(cId, isArchived),
    updateCheckStatus: (payload) => prismaClient.updateCheckStatus(payload?.id, payload?.status),

    // Meal Tickets
    getMealTickets: (cId, isArchived) => prismaClient.getMealTickets(cId, isArchived),
    createMealTicket: (data) => prismaClient.addMealTicket(data),
    updateMealTicket: (data) => prismaClient.updateMealTicket(data),
    deleteMealTicket: (id) => prismaClient.deleteMealTicket(id),
    getMealTicketStats: (cId) => prismaClient.getMealTicketStats(cId),
    getMealPrice: (cId) => prismaClient.getMealPrice(cId),
    setMealPrice: (data) => prismaClient.setMealPrice(data),
    getMealPriceHistory: (cId) => prismaClient.getMealPriceHistory(cId),
    deleteMealPriceHistory: (id) => prismaClient.deleteMealPriceHistory(id),
    updateMealPriceHistory: (data) => prismaClient.updateMealPriceHistory(data),
    getMealTicketReport: (data) => prismaClient.getMealTicketReport(data?.companyId, data?.month, data?.year),

    // Works & Operations
    getWorks: (cId, isArchived) => prismaClient.getWorks(cId, isArchived),
    getWorkDetails: (id) => prismaClient.getWorkDetails(id),
    createWork: (data) => prismaClient.createWork(data),
    updateWork: (data) => prismaClient.updateWork(data),
    deleteWork: (id) => prismaClient.deleteWork(id),
    addWorkItem: (data) => prismaClient.addWorkItem(data),
    addBulkWorkItems: (data) => prismaClient.bulkAddWorkItems(data),
    updateWorkItem: (data) => prismaClient.updateWorkItem(data),
    deleteWorkItem: (id) => prismaClient.deleteWorkItem(id),
    deleteBulkWorkItems: (ids) => prismaClient.bulkDeleteWorkItems(ids),

    // Customers (Cari)
    getCustomers: (cId, isArchived) => prismaClient.getCustomers(cId, isArchived),
    getCustomerDetails: (id) => prismaClient.getCustomerDetails(id),
    createCustomer: (data) => prismaClient.createCustomer(data),
    updateCustomer: (data) => prismaClient.updateCustomer(data),
    deleteCustomer: (id) => prismaClient.deleteCustomer(id),

    // Documents
    getAllDocuments: (cId, isArchived) => prismaClient.getDocumentsByCompany(cId, isArchived),
    getDocumentsByVehicle: (vId, isArchived) => prismaClient.getDocuments(vId, isArchived),
    addDocument: (data) => prismaClient.addDocument(data),
    updateDocument: (data) => prismaClient.updateDocument(data),
    deleteDocument: (id) => prismaClient.deleteDocument(id),
    readDocumentData: async (fileName) => {
        const filePath = path.join(filesDir, fileName);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath).toString('base64');
        }
        try {
            const { downloadFromStorage } = require('./electron/services/supabase.service');
            const res = await downloadFromStorage(fileName);
            if (res.success && res.data) {
                fs.writeFileSync(filePath, res.data);
                return res.data.toString('base64');
            }
        } catch (e) {}
        return null;
    },

    // Dashboard & Common
    getDashboardStats: (cId) => prismaClient.getDashboardStats(cId),
    getUpcomingEvents: (cId) => prismaClient.getUpcomingEvents(cId),
    getRecentActivity: (cId) => prismaClient.getRecentActivity(cId),
    searchGlobal: (cId, query) => prismaClient.searchGlobal(cId, query),
    archiveItem: (table, id, isArchived) => prismaClient.archiveItem(table, id, isArchived),

    // Settings
    getSettings: () => prismaClient.getSettings(),
    saveSettings: (settings) => prismaClient.saveSettings(settings),
    getPublicHolidays: (cId) => prismaClient.getPublicHolidays(cId),
    createPublicHoliday: (data) => prismaClient.createPublicHoliday(data),
    updatePublicHoliday: (data) => prismaClient.updatePublicHoliday(data),
    deletePublicHoliday: (id) => prismaClient.deletePublicHoliday(id),

    // Personnel Settings
    getDepartments: (cId) => prismaClient.getDepartments(cId),
    createDepartment: (data) => prismaClient.createDepartment(data),
    updateDepartment: (data) => prismaClient.updateDepartment(data),
    deleteDepartment: (id) => prismaClient.deleteDepartment(id),
    getLeaveTypes: (cId) => prismaClient.getLeaveTypes(cId),
    createLeaveType: (data) => prismaClient.createLeaveType(data),
    updateLeaveType: (data) => prismaClient.updateLeaveType(data),
    deleteLeaveType: (id) => prismaClient.deleteLeaveType(id),
    getDocumentCategories: (cId, targetType) => prismaClient.getDocumentCategories(cId, targetType),
    createDocumentCategory: (data) => prismaClient.createDocumentCategory(data),
    updateDocumentCategory: (data) => prismaClient.updateDocumentCategory(data),
    deleteDocumentCategory: (id) => prismaClient.deleteDocumentCategory(id),
    getDocumentFolders: (cId, relatedType, relatedId) => prismaClient.getDocumentFolders(cId, relatedType, relatedId),
    createDocumentFolder: (data) => prismaClient.createDocumentFolder(data),
    updateDocumentFolder: (data) => prismaClient.updateDocumentFolder(data),
    deleteDocumentFolder: (id) => prismaClient.deleteDocumentFolder(id),
    getVehicleTypes: (cId) => prismaClient.getVehicleTypes(cId),
    createVehicleType: (data) => prismaClient.createVehicleType(data),
    updateVehicleType: (data) => prismaClient.updateVehicleType(data),
    deleteVehicleType: (id) => prismaClient.deleteVehicleType(id),

    // Requests & Approvals
    createRequest: (data) => (prismaService.createRequest || prismaClient.createRequest)(data),
    getRequests: (filters) => (prismaService.getRequests || prismaClient.getRequests)(filters),
    processApproval: (data) => (prismaService.processApproval || prismaClient.processApproval)(data),

    // Roles & Granular Permissions
    getRoles: (cId) => (prismaService.getRoles || prismaClient.getRoles)(cId),
    saveRole: (data) => (prismaService.saveRole || prismaClient.saveRole)(data),
    deleteRole: (roleId) => (prismaService.deleteRole || prismaClient.deleteRole)(roleId),
    assignUserRole: (data) => (prismaService.assignUserRole || prismaClient.assignUserRole)(data),
    deleteUserAccount: (userId) => (prismaService.deleteUserAccount || prismaClient.deleteUserAccount)(userId),
};

// Generic RPC Router
app.post('/api/rpc/:method', async (req, res) => {
    const { method } = req.params;
    const { args = [] } = req.body;

    const fn = rpcMap[method] || prismaClient[method] || prismaService[method] || authService[method];
    if (typeof fn !== 'function') {
        console.warn(`[RPC 404] Method "${method}" not found in rpcMap`);
        return res.status(404).json({ success: false, error: `Method "${method}" not found` });
    }

    try {
        const result = await fn(...args);
        res.json(result !== undefined ? result : { success: true });
    } catch (err) {
        console.error(`RPC Error [${method}]:`, err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Developer / Generic Table Endpoints
const TABLES = [
    'assignments', 'companies', 'customers', 'documents', 'employees', 'employee_documents',
    'employee_assignments', 'employee_attendance', 'employee_movements', 'employee_salary_history',
    'inspections', 'insurances', 'leaves', 'maintenances', 'meal_settings', 'meal_tickets', 'overtimes',
    'recurring_transactions', 'salaries', 'services', 'transactions', 'users', 'vehicles', 'works', 'work_items'
];

app.get('/api/tables', (req, res) => {
    res.json({ success: true, tables: TABLES });
});

app.get('/api/data/:table', async (req, res) => {
    const { table } = req.params;
    if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    try {
        const prisma = getPrismaClient();
        const data = await prisma[table].findMany({ take: 500 });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Single Page Application (SPA) Fallback
app.use((req, res) => {
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Kontrol Web Server is running. (dist/index.html not found, please build the frontend)');
    }
});

const { Client } = require('pg');
const { postgresDdlSql } = require('./electron/utils/postgresDdl');

async function initializePostgres(dbUrl) {
    try {
        console.log('• Checking & initializing PostgreSQL schema...');
        const pgClient = new Client({ connectionString: dbUrl });
        await pgClient.connect();
        await pgClient.query(postgresDdlSql);

        // Verify users exist, seed default admin if empty
        const uRes = await pgClient.query('SELECT count(*) as count FROM users');
        if (parseInt(uRes.rows[0].count, 10) === 0) {
            console.log('• Seeding default admin user in PostgreSQL...');
            const bcrypt = require('bcryptjs');
            const defaultPasswordHash = bcrypt.hashSync('admin', 10);
            
            // Create default company
            const cRes = await pgClient.query("INSERT INTO companies (name, created_at) VALUES ('Varsayılan Şirket', CURRENT_TIMESTAMP) RETURNING id");
            const companyId = cRes.rows[0].id;

            await pgClient.query(`
                INSERT INTO users (username, email, password_hash, role, company_id, is_active, created_at)
                VALUES ('admin', 'admin@muayen.com', $1, 'admin', $2, 1, CURRENT_TIMESTAMP)
            `, [defaultPasswordHash, companyId]);
            console.log('✅ Default admin user created in PostgreSQL.');
        }

        await pgClient.end();
        console.log('✅ PostgreSQL Schema & Tables verified.');
    } catch (err) {
        console.warn('⚠️ PostgreSQL DDL initialization notice:', err.message);
    }
}

// Initialize database and start listening
async function start() {
    try {
        const defaultDbUrl = 'postgresql://postgres:eyaeaj0djlbjhybz04ma4vrw7otatabf@172.17.0.1:5432/postgres';
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = defaultDbUrl;
        }
        const dbUrl = process.env.DATABASE_URL;

        if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
            await initializePostgres(dbUrl);
        }

        const prisma = getPrismaClient();
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully.');

        // Run auto migrations for SQLite tables and columns
        if (typeof runAutoMigrations === 'function') {
            await runAutoMigrations();
            console.log('✅ Database schema and migrations verified.');
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Kontrol Web Application running on http://0.0.0.0:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

start();
