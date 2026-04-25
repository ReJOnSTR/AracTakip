const authService = require('./services/auth.service');
const companyService = require('./services/company.service');
const vehicleService = require('./services/vehicle.service');
const employeeService = require('./services/employee.service');
const employeeDataService = require('./services/employeeData.service');
const vehicleDataService = require('./services/vehicleData.service');
const financeService = require('./services/finance.service');
const settingsService = require('./services/settings.service');
const documentService = require('./services/document.service');
const backupService = require('./services/backup.service');

module.exports = {
    // Auth
    ...authService,

    // Companies
    ...companyService,

    // Vehicles & Sub-collections
    ...vehicleService,
    ...vehicleDataService,

    // Employees 
    ...employeeService,
    ...employeeDataService,

    // Finance & Meal Tickets
    ...financeService,

    // Settings / Dashboard / Misc
    ...settingsService,

    // Documents
    ...documentService,

    // Backup & Restore
    ...backupService,

    // Works & Timesheets
    ...require('./services/work.service'),
    
    // Customers (Cari)
    ...require('./services/customer.service'),

    // Personnel Settings (Departments, Leaves, Doc Categories)
    ...require('./services/personnelSettings.service')
};
