// Documents module
module.exports = function (helpers) {
    const { runQuery, runExec } = helpers

    function addDocument(data) {
        try {
            const result = runExec(
                'INSERT INTO documents (vehicle_id, related_type, related_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)',
                [data.vehicleId, data.relatedType, data.relatedId, data.fileName, data.filePath, data.fileType]
            )
            return { success: true, id: result.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getDocument(id) {
        try {
            const doc = runQuery('SELECT * FROM documents WHERE id = ?', [id])
            return { success: true, data: doc[0] }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getDocumentsByVehicle(vehicleId) {
        try {
            const docs = runQuery(
                'SELECT * FROM documents WHERE vehicle_id = ? ORDER BY created_at DESC',
                [vehicleId]
            )
            return { success: true, data: docs }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getDocumentsByCompany(companyId) {
        try {
            const docs = runQuery(
                'SELECT d.* FROM documents d JOIN vehicles v ON d.vehicle_id = v.id WHERE v.company_id = ? ORDER BY d.created_at DESC',
                [companyId]
            )
            return { success: true, data: docs }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteDocument(id) {
        try {
            runExec('DELETE FROM documents WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getDocumentsByRelatedId(type, id) {
        try {
            const docs = runQuery(
                'SELECT * FROM documents WHERE related_type = ? AND related_id = ? ORDER BY created_at DESC',
                [type, id]
            )
            return { success: true, data: docs }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { addDocument, getDocument, getDocumentsByVehicle, getDocumentsByCompany, deleteDocument, getDocumentsByRelatedId }
}
