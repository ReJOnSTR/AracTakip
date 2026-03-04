const express = require('express');
const cors = require('cors');
const path = require('path');
const log = require('./logger'); // Use the app's existing logger

let serverInstance = null;

// Hardcoded tables based on prisma/schema.prisma
const TABLES = [
    'assignments', 'companies', 'documents', 'employees', 'employee_documents',
    'employee_assignments', 'finance_categories', 'inspections', 'insurances',
    'leaves', 'maintenances', 'meal_settings', 'meal_tickets', 'overtimes',
    'periodic_inspections', 'recurring_transactions', 'salaries', 'services',
    'transactions', 'users', 'vehicles', 'works'
];

function startAdminServer(prisma) {
    if (serverInstance) return; // Prevent multiple instances

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Serve the frontend HTML page
    // The path changes between dev and production ASAR
    const adminStaticFolder = path.join(__dirname, 'admin');
    app.use(express.static(adminStaticFolder));

    // Security placeholder middleware
    app.use('/api', (req, res, next) => {
        // In the future, this can check an authorization header (e.g. Bearer passcode)
        next();
    });

    // API: Get Tables
    app.get('/api/tables', (req, res) => {
        res.json({ success: true, tables: TABLES });
    });

    // API: Get Table Data
    app.get('/api/data/:table', async (req, res) => {
        const table = req.params.table;
        if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        try {
            // Return maximum 500 rows to prevent overwhelming the browser
            const data = await prisma[table].findMany({ take: 500 });
            res.json({ success: true, data });
        } catch (error) {
            log.error(`Admin panel error fetching ${table}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    // API: Delete Record
    app.delete('/api/data/:table/:id', async (req, res) => {
        const table = req.params.table;
        const id = parseInt(req.params.id);

        if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        try {
            await prisma[table].delete({
                where: { id }
            });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Additional CRUD can be added here (Update, Create).

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
