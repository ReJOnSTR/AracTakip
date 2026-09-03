import { describe, it, expect, vi, beforeEach } from 'vitest'
const importExportModule = require('../electron/database/import-export')

describe('Import/Export Module', () => {
    let importExport
    let helpers

    let entityModules

    beforeEach(() => {
        helpers = {
            runQuery: vi.fn(),
            runQueryOne: vi.fn(),
            runExec: vi.fn(),
            runTransaction: vi.fn((callback) => callback()), // Mock transaction helper if used
            getDb: vi.fn(() => ({
                transaction: (cb) => () => cb() // Return a function that executes the callback
            }))
        }

        entityModules = {
            vehicles: { getVehicles: vi.fn() },
            maintenances: { createMaintenance: vi.fn() },
            inspections: { createInspection: vi.fn() },
            insurances: { createInsurance: vi.fn() },
            assignments: { createAssignment: vi.fn() },
            services: { createService: vi.fn() },
            documents: { getDocumentsByCompany: vi.fn() }
        }

        importExport = importExportModule(helpers, entityModules)
    })

    it('should import company data successfully', () => {
        const backupData = {
            company: { name: 'Test Co', description: '' },
            vehicles: [
                { id: 101, plate: '34TEST01', brand: 'TestBrand', model: 'TestModel', km: 5000 }
            ],
            // Add other entities if needed for full coverage
            maintenances: [],
            inspections: [],
            insurances: [],
            services: [],
            assignments: [],
            documents: []
        }

        // Mock helpers.runExec for company and vehicle creation
        helpers.runExec.mockReturnValue({ lastInsertRowid: 999 })

        const result = importExport.importCompanyData(1, backupData)

        expect(result).toEqual({ success: true, companyId: 999 })

        // Check if company was created
        expect(helpers.runExec).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO companies'),
            expect.anything()
        )

        // Check if vehicles were inserted with NEW company ID (999)
        expect(helpers.runExec).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO vehicles'),
            expect.arrayContaining([999, '34TEST01']) // partial check
        )
    })

    it('should fail if backup data is invalid', () => {
        const result = importExport.importCompanyData(1, null)
        expect(result.success).toBe(false)
    })
})
