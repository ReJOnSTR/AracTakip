// Companies module
module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function getCompanies(userId) {
        try {
            const companies = runQuery('SELECT * FROM companies WHERE user_id = ? ORDER BY name', [userId])
            return { success: true, data: companies }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createCompany({ userId, name, taxNumber, address, phone }) {
        try {
            const info = runExec(
                'INSERT INTO companies (user_id, name, tax_number, address, phone) VALUES (?, ?, ?, ?, ?)',
                [userId, name, taxNumber, address, phone]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateCompany({ id, name, taxNumber, address, phone }) {
        try {
            runExec(
                'UPDATE companies SET name = ?, tax_number = ?, address = ?, phone = ? WHERE id = ?',
                [name, taxNumber, address, phone, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteCompany(id) {
        try {
            runExec('DELETE FROM companies WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getCompanies, createCompany, updateCompany, deleteCompany }
}
