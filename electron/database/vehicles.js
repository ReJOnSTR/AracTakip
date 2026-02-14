// Vehicles module
module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function getVehicles(companyId) {
        try {
            const vehicles = runQuery('SELECT * FROM vehicles WHERE company_id = ? ORDER BY plate', [companyId])
            return { success: true, data: vehicles }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getVehicleById(vehicleId) {
        try {
            const vehicle = runQueryOne('SELECT * FROM vehicles WHERE id = ?', [vehicleId])
            return { success: true, data: vehicle }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createVehicle({ companyId, type, plate, brand, model, year, color, status, notes, image, km }) {
        try {
            const existing = runQueryOne(
                'SELECT id FROM vehicles WHERE company_id = ? AND plate = ?',
                [companyId, plate]
            )

            if (existing) {
                return { success: false, error: 'Bu plaka ile kayıtlı bir araç zaten mevcut.' }
            }

            const info = runExec(
                'INSERT INTO vehicles (company_id, type, plate, brand, model, year, color, status, notes, image, km) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [companyId, type, plate, brand, model, year, color, status || 'active', notes, image, km || 0]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateVehicle({ id, type, plate, brand, model, year, color, status, notes, km, image }) {
        try {
            runExec(
                'UPDATE vehicles SET type = ?, plate = ?, brand = ?, model = ?, year = ?, color = ?, status = ?, notes = ?, km = ?, image = ? WHERE id = ?',
                [type, plate, brand, model, year, color, status, notes, km || 0, image, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteVehicle(id) {
        try {
            runExec('DELETE FROM vehicles WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle }
}
