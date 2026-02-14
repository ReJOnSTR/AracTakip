// Assignments module
module.exports = function (helpers) {
    const { runQuery, runExec } = helpers

    function getAssignments(vehicleId) {
        try {
            const data = runQuery(`
                SELECT a.*, v.plate as vehicle_plate 
                FROM assignments a 
                JOIN vehicles v ON a.vehicle_id = v.id 
                WHERE a.vehicle_id = ?
                ORDER BY a.start_date DESC
            `, [vehicleId])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getAllAssignments(companyId, isArchived = 0) {
        try {
            const data = runQuery(`
                SELECT a.*, v.plate as vehicle_plate, v.brand, v.model
                FROM assignments a 
                JOIN vehicles v ON a.vehicle_id = v.id 
                WHERE v.company_id = ? AND (a.is_archived = ? OR a.is_archived IS NULL)
                ORDER BY a.start_date DESC
            `, [companyId, isArchived])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createAssignment({ vehicleId, itemName, quantity, assignedTo, department, startDate, endDate, notes, isArchived = 0 }) {
        try {
            const info = runExec(
                'INSERT INTO assignments (vehicle_id, item_name, quantity, assigned_to, department, start_date, end_date, notes, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [vehicleId, itemName, quantity || 1, assignedTo || '', department, startDate, endDate, notes, isArchived]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateAssignment({ id, itemName, quantity, assignedTo, department, startDate, endDate, notes }) {
        try {
            runExec(
                'UPDATE assignments SET item_name = ?, quantity = ?, assigned_to = ?, department = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ?',
                [itemName, quantity, assignedTo, department, startDate, endDate, notes, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteAssignment(id) {
        try {
            runExec('DELETE FROM assignments WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getAssignments, getAllAssignments, createAssignment, updateAssignment, deleteAssignment }
}
