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

// Public Auth Endpoints
app.post('/api/login', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const result = await authService.loginUser({ username, email, password });
        if (result.success) {
            const token = jwt.sign(
                { id: result.user.id, username: result.user.username, role: result.user.role },
                SECRET_KEY,
                { expiresIn: '30d' }
            );
            res.json({ success: true, token, user: result.user });
        } else {
            res.status(401).json({ success: false, error: result.error });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const result = await authService.registerUser(req.body);
        res.json(result);
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Generic RPC Router for all domain services (bridged from window.electronAPI)
app.post('/api/rpc/:method', async (req, res) => {
    const { method } = req.params;
    const { args = [] } = req.body;

    const authMap = {
        login: authService.loginUser,
        loginUser: authService.loginUser,
        register: authService.registerUser,
        registerUser: authService.registerUser,
        changePassword: authService.changePassword,
        updateProfile: authService.updateProfile,
        createEmployeeUser: authService.createEmployeeUser,
        focusWindow: async () => ({ success: true }),
        setFullScreen: async () => ({ success: true }),
        openFolder: async () => ({ success: true })
    };

    const fn = authMap[method] || db[method] || authService[method];
    if (typeof fn !== 'function') {
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
