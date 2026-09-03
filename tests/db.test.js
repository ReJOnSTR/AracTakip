import { describe, it, expect, vi, beforeEach } from 'vitest'
const vehicleModule = require('../electron/database/vehicles')

describe('Vehicle Module', () => {
    let vehicles
    let helpers

    beforeEach(() => {
        helpers = {
            runQuery: vi.fn(),
            runQueryOne: vi.fn(),
            runExec: vi.fn()
        }
        vehicles = vehicleModule(helpers)
    })

    it('should create a vehicle successfully', () => {
        const newVehicle = {
            companyId: 1,
            type: 'automobile',
            plate: '34ABC123',
            brand: 'Toyota',
            model: 'Corolla',
            year: 2020,
            color: 'White',
            km: 10000
        }

        // Mock no existing vehicle
        helpers.runQueryOne.mockReturnValue(null)
        // Mock insert success
        helpers.runExec.mockReturnValue({ lastInsertRowid: 10 })

        const result = vehicles.createVehicle(newVehicle)

        expect(result).toEqual({ success: true, id: 10 })
        expect(helpers.runExec).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO vehicles'),
            [
                1, 'automobile', '34ABC123', 'Toyota', 'Corolla', 2020, 'White', 'active', undefined, undefined, 10000
            ]
        )
    })

    it('should prevent duplicate plates', () => {
        const newVehicle = {
            companyId: 1,
            plate: '34ABC123'
        }

        // Mock existing vehicle
        helpers.runQueryOne.mockReturnValue({ id: 5 })

        const result = vehicles.createVehicle(newVehicle)

        expect(result).toEqual({
            success: false,
            error: 'Bu plaka ile kayıtlı bir araç zaten mevcut.'
        })
        expect(helpers.runExec).not.toHaveBeenCalled()
    })

    it('should get vehicles list', () => {
        const mockList = [{ id: 1, plate: '34ABC123' }]
        helpers.runQuery.mockReturnValue(mockList)

        const result = vehicles.getVehicles(1)

        expect(result).toEqual({ success: true, data: mockList })
        expect(helpers.runQuery).toHaveBeenCalledWith(
            expect.stringContaining('SELECT * FROM vehicles'),
            [1]
        )
    })
})
