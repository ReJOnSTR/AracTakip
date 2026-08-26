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
const db = require('./electron/prismaService');
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
    getCompanies: db.getCompanies,
    createCompany: db.createCompany,
    updateCompany: db.updateCompany,
    deleteCompany: db.deleteCompany,

    // Vehicles
    getVehicles: db.getVehicles,
    getVehicleById: db.getVehicleById,
    createVehicle: db.createVehicle,
    updateVehicle: db.updateVehicle,
    deleteVehicle: db.deleteVehicle,

    // Maintenances
    getMaintenancesByVehicle: db.getMaintenances,
    getAllMaintenances: db.getAllMaintenances,
    createMaintenance: db.createMaintenance,
    updateMaintenance: db.updateMaintenance,
    deleteMaintenance: db.deleteMaintenance,

    // Inspections
    getInspectionsByVehicle: db.getInspections,
    getAllInspections: db.getAllInspections,
    createInspection: db.createInspection,
    updateInspection: db.updateInspection,
    deleteInspection: db.deleteInspection,

    // Insurances
    getInsurancesByVehicle: db.getInsurances,
    getAllInsurances: db.getAllInsurances,
    createInsurance: db.createInsurance,
    updateInsurance: db.updateInsurance,
    deleteInsurance: db.deleteInsurance,

    // Assignments
    getAssignmentsByVehicle: db.getAssignments,
    getAllAssignments: db.getAllAssignments,
    createAssignment: db.createAssignment,
    updateAssignment: db.updateAssignment,
    deleteAssignment: db.deleteAssignment,

    // Services
    getServicesByVehicle: db.getServices,
    getAllServices: db.getAllServices,
    createService: db.createService,
    updateService: db.updateService,
    deleteService: db.deleteService,

    // Employees
    getEmployees: db.getEmployees,
    getPayrollSummary: db.getPayrollSummary,
    getEmployeeById: db.getEmployeeById,
    createEmployee: db.addEmployee,
    updateEmployee: db.updateEmployee,
    deleteEmployee: db.deleteEmployee,

    // Salaries
    getSalaries: db.getSalariesByEmployee,
    getSalariesByCompany: db.getAllSalariesForCompany,
    createSalary: db.createSalary,
    updateSalary: db.updateSalary,
    deleteSalary: db.deleteSalary,
    createSalaryHistory: db.createSalaryHistory,
    updateSalaryHistory: db.updateSalaryHistory,
    deleteSalaryHistory: db.deleteSalaryHistory,

    // Leaves
    getLeaves: db.getLeavesByEmployee,
    getLeavesByCompany: db.getAllLeaves,
    createLeave: db.createLeave,
    updateLeave: db.updateLeave,
    deleteLeave: db.deleteLeave,

    // Overtimes
    getOvertimes: db.getOvertimes,
    getAllOvertimes: db.getAllOvertimes,
    createOvertime: db.addOvertime,
    updateOvertime: db.updateOvertime,
    deleteOvertime: db.deleteOvertime,

    // Employee Assignments
    getEmployeeAssignments: db.getEmployeeAssignments,
    createEmployeeAssignment: db.addEmployeeAssignment,
    updateEmployeeAssignment: db.updateEmployeeAssignment,
    deleteEmployeeAssignment: db.deleteEmployeeAssignment,

    // Employee Documents
    getEmployeeDocuments: db.getEmployeeDocuments,
    getUpcomingPersonnelDocuments: db.getUpcomingPersonnelDocuments || db.getUpcomingDocuments,
    createEmployeeDocument: db.addEmployeeDocument,
    updateEmployeeDocument: db.updateEmployeeDocument,
    deleteEmployeeDocument: db.deleteEmployeeDocument,

    // Employee Movements
    getAllEmployeeMovements: db.getAllEmployeeMovements,
    addEmployeeMovement: db.addEmployeeMovement,
    updateEmployeeMovement: db.updateEmployeeMovement,
    deleteEmployeeMovement: db.deleteEmployeeMovement,

    // Finance / Transactions
    getAllFinance: db.getTransactions,
    getTransactions: db.getTransactions,
    getFinanceById: db.getTransactionById,
    createFinance: db.createTransaction,
    updateFinance: db.updateTransaction,
    deleteFinance: db.deleteTransaction,
    getFinanceStats: db.getFinanceStats,
    getChecks: db.getChecksAndNotes,
    updateCheckStatus: (payload) => db.updateCheckStatus(payload?.id, payload?.status),

    // Meal Tickets
    getMealTickets: db.getMealTickets,
    createMealTicket: db.addMealTicket,
    updateMealTicket: db.updateMealTicket,
    deleteMealTicket: db.deleteMealTicket,
    getMealTicketStats: db.getMealTicketStats,
    getMealPrice: db.getMealPrice,
    setMealPrice: db.setMealPrice,
    getMealPriceHistory: db.getMealPriceHistory,
    deleteMealPriceHistory: db.deleteMealPriceHistory,
    updateMealPriceHistory: db.updateMealPriceHistory,
    getMealTicketReport: (data) => db.getMealTicketReport(data?.companyId, data?.month, data?.year),

    // Works & Operations
    getWorks: db.getWorks,
    getWorkDetails: db.getWorkDetails,
    createWork: db.createWork,
    updateWork: db.updateWork,
    deleteWork: db.deleteWork,
    addWorkItem: db.addWorkItem,
    addBulkWorkItems: db.addBulkWorkItems,
    updateWorkItem: db.updateWorkItem,
    deleteWorkItem: db.deleteWorkItem,
    deleteBulkWorkItems: db.deleteBulkWorkItems,

    // Customers (Cari)
    getCustomers: db.getCustomers,
    getCustomerDetails: db.getCustomerDetails,
    createCustomer: db.createCustomer,
    updateCustomer: db.updateCustomer,
    deleteCustomer: db.deleteCustomer,

    // Documents
    getAllDocuments: db.getDocumentsByCompany,
    getDocumentsByVehicle: db.getDocumentsByVehicle,
    addDocument: db.addDocument,
    updateDocument: db.updateDocument,
    deleteDocument: db.deleteDocument,
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
    getDashboardStats: db.getDashboardStats,
    getUpcomingEvents: db.getUpcomingEvents,
    getRecentActivity: db.getRecentActivity,
    searchGlobal: db.searchGlobal,
    archiveItem: db.archiveItem,

    // Settings
    getSettings: () => {
        try {
            const sPath = path.join(dataDir, 'settings.json');
            if (fs.existsSync(sPath)) return JSON.parse(fs.readFileSync(sPath, 'utf8'));
        } catch (e) {}
        return { success: true, settings: {} };
    },
    saveSettings: (settings) => {
        try {
            const sPath = path.join(dataDir, 'settings.json');
            fs.writeFileSync(sPath, JSON.stringify(settings, null, 2));
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },
    getPublicHolidays: db.getPublicHolidays,
    createPublicHoliday: db.createPublicHoliday,
    updatePublicHoliday: db.updatePublicHoliday,
    deletePublicHoliday: db.deletePublicHoliday,

    // Personnel Settings
    getDepartments: db.getDepartments,
    createDepartment: db.createDepartment,
    updateDepartment: db.updateDepartment,
    deleteDepartment: db.deleteDepartment,
    getLeaveTypes: db.getLeaveTypes,
    createLeaveType: db.createLeaveType,
    updateLeaveType: db.updateLeaveType,
    deleteLeaveType: db.deleteLeaveType,
    getDocumentCategories: db.getDocumentCategories,
    createDocumentCategory: db.createDocumentCategory,
    updateDocumentCategory: db.updateDocumentCategory,
    deleteDocumentCategory: db.deleteDocumentCategory,
    getDocumentFolders: db.getDocumentFolders,
    createDocumentFolder: db.createDocumentFolder,
    updateDocumentFolder: db.updateDocumentFolder,
    deleteDocumentFolder: db.deleteDocumentFolder,
    getVehicleTypes: db.getVehicleTypes,
    createVehicleType: db.createVehicleType,
    updateVehicleType: db.updateVehicleType,
    deleteVehicleType: db.deleteVehicleType,

    // Requests & Approvals
    createRequest: db.createRequest,
    getRequests: db.getRequests,
    processApproval: db.processApproval,

    // Roles & Granular Permissions
    getRoles: db.getRoles,
    saveRole: db.saveRole,
    deleteRole: db.deleteRole,
    assignUserRole: db.assignUserRoleAndEmployee,
    deleteUserAccount: db.deleteUserAccount,

    // Arvento Vehicle Tracking API
    arventoTestConnection: (credentials) => db.testArventoConnection(credentials),
    arventoGetStatus: (credentials) => db.getArventoVehicleStatus(credentials),
    arventoGetMappings: (credentials) => db.getArventoLicensePlateNodeMappings(credentials),
    arventoGetInfo: (credentials) => db.getArventoVehicleInfo(credentials),
    arventoGetDailyReport: (date, credentials) => db.getArventoVehicleDailyStatus(date, credentials),
    arventoGetAlarms: (credentials) => db.getArventoAlarms(credentials),
    arventoGetHistory: (filters, credentials) => db.getArventoHistory(filters, credentials),
    testArventoConnection: (credentials) => db.testArventoConnection(credentials),
    getArventoVehicleStatus: (credentials) => db.getArventoVehicleStatus(credentials),
    getArventoLicensePlateNodeMappings: (credentials) => db.getArventoLicensePlateNodeMappings(credentials),
    getArventoVehicleInfo: (credentials) => db.getArventoVehicleInfo(credentials),
    getArventoVehicleDailyStatus: (date, credentials) => db.getArventoVehicleDailyStatus(date, credentials),
    getArventoAlarms: (credentials) => db.getArventoAlarms(credentials),
    getArventoHistory: (filters, credentials) => db.getArventoHistory(filters, credentials),
};

// Generic RPC Router
app.post('/api/rpc/:method', async (req, res) => {
    const { method } = req.params;
    const { args = [] } = req.body;

    const fn = rpcMap[method] || db[method] || authService[method];
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
