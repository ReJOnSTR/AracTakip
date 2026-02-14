// Maintenances module
module.exports = function (helpers) {
    const { runQuery, runExec } = helpers

    function getMaintenances(vehicleId) {
        try {
            const data = runQuery(`
                SELECT m.*, v.plate as vehicle_plate 
                FROM maintenances m 
                JOIN vehicles v ON m.vehicle_id = v.id 
                WHERE m.vehicle_id = ? 
                ORDER BY m.date DESC
            `, [vehicleId])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getAllMaintenances(companyId, isArchived = 0) {
        try {
            const data = runQuery(`
                SELECT m.*, v.plate as vehicle_plate, v.brand, v.model
                FROM maintenances m 
                JOIN vehicles v ON m.vehicle_id = v.id 
                WHERE v.company_id = ? AND (m.is_archived = ? OR m.is_archived IS NULL)
                ORDER BY m.date DESC
            `, [companyId, isArchived])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createMaintenance({ vehicleId, type, description, date, cost, nextKm, nextDate, notes, filePath, isArchived = 0 }) {
        try {
            const info = runExec(
                'INSERT INTO maintenances (vehicle_id, type, description, date, cost, next_km, next_date, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [vehicleId, type, description, date, cost, nextKm, nextDate, notes, filePath, isArchived]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateMaintenance({ id, type, description, date, cost, nextKm, nextDate, notes, filePath }) {
        try {
            runExec(
                'UPDATE maintenances SET type = ?, description = ?, date = ?, cost = ?, next_km = ?, next_date = ?, notes = ?, file_path = ? WHERE id = ?',
                [type, description, date, cost, nextKm, nextDate, notes, filePath, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteMaintenance(id) {
        try {
            runExec('DELETE FROM maintenances WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getMaintenances, getAllMaintenances, createMaintenance, updateMaintenance, deleteMaintenance }
}
