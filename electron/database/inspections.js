// Inspections module
module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function getInspectionsByVehicle(vehicleId) {
        try {
            const data = runQuery('SELECT * FROM inspections WHERE vehicle_id = ? ORDER BY inspection_date DESC', [vehicleId])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getAllInspections(companyId, type = 'traffic', isArchived = 0) {
        try {
            const data = runQuery(`
                SELECT i.*, v.plate as vehicle_plate, v.brand, v.model
                FROM inspections i
                JOIN vehicles v ON i.vehicle_id = v.id
                WHERE v.company_id = ? AND (i.type = ? OR i.type IS NULL) AND COALESCE(i.is_archived, 0) = ?
                ORDER BY i.inspection_date DESC
            `, [companyId, type, isArchived])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createInspection(data) {
        try {
            const type = data.type || 'traffic';

            if (!data.skipValidation) {
                const activeInspection = runQueryOne(
                    'SELECT next_inspection FROM inspections WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0 ORDER BY inspection_date DESC LIMIT 1',
                    [data.vehicleId, type]
                );

                if (activeInspection && activeInspection.next_inspection) {
                    const today = new Date();
                    const nextDate = new Date(activeInspection.next_inspection);
                    const diffTime = nextDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 15) {
                        return {
                            success: false,
                            error: `Mevcut muayenenin süresi henüz dolmadı. Bitime 15 gün kala (Kalan süre: ${diffDays} gün) yenileme yapabilirsiniz.`
                        };
                    }
                }
            }

            if (!data.isArchived) {
                runExec(
                    'UPDATE inspections SET is_archived = 1 WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0',
                    [data.vehicleId, type]
                );
            }

            const info = runExec(
                'INSERT INTO inspections (vehicle_id, type, inspection_date, next_inspection, result, cost, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [data.vehicleId, type, data.inspectionDate, data.nextInspection, data.result, data.cost, data.notes, data.filePath, data.isArchived !== undefined ? data.isArchived : 0]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            console.error('createInspection error:', error);
            return { success: false, error: error.message }
        }
    }

    function updateInspection({ id, inspectionDate, nextInspection, result, cost, notes, filePath }) {
        try {
            runExec(
                'UPDATE inspections SET inspection_date = ?, next_inspection = ?, result = ?, cost = ?, notes = ?, file_path = ? WHERE id = ?',
                [inspectionDate, nextInspection, result, cost, notes, filePath, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteInspection(id) {
        try {
            runExec('DELETE FROM inspections WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return {
        getInspections: getInspectionsByVehicle,
        getAllInspections,
        createInspection,
        updateInspection,
        deleteInspection
    }
}
