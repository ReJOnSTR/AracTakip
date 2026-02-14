// Services module
module.exports = function (helpers) {
    const { runQuery, runExec } = helpers

    function getServices(vehicleId) {
        try {
            const data = runQuery(`
                SELECT s.*, v.plate as vehicle_plate 
                FROM services s 
                JOIN vehicles v ON s.vehicle_id = v.id 
                WHERE s.vehicle_id = ?
                ORDER BY s.date DESC
            `, [vehicleId])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getAllServices(companyId, isArchived = 0) {
        try {
            const data = runQuery(`
                SELECT s.*, v.plate as vehicle_plate, v.brand, v.model
                FROM services s 
                JOIN vehicles v ON s.vehicle_id = v.id 
                WHERE v.company_id = ? AND (s.is_archived = ? OR s.is_archived IS NULL)
                ORDER BY s.date DESC
            `, [companyId, isArchived])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createService({ vehicleId, type, serviceName, description, date, km, cost, notes, filePath, isArchived = 0 }) {
        try {
            const info = runExec(
                'INSERT INTO services (vehicle_id, type, service_name, description, date, km, cost, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    vehicleId,
                    type,
                    serviceName || null,
                    description || null,
                    date,
                    km || null,
                    cost || 0,
                    notes || null,
                    filePath,
                    isArchived
                ]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateService({ id, type, serviceName, description, date, km, cost, notes, filePath }) {
        try {
            runExec(
                'UPDATE services SET type = ?, service_name = ?, description = ?, date = ?, km = ?, cost = ?, notes = ?, file_path = ? WHERE id = ?',
                [
                    type,
                    serviceName || null,
                    description || null,
                    date,
                    km || null,
                    cost || 0,
                    notes || null,
                    filePath,
                    id
                ]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteService(id) {
        try {
            runExec('DELETE FROM services WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getServices, getAllServices, createService, updateService, deleteService }
}
