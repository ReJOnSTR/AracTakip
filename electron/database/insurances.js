// Insurances module
module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function getInsurances(vehicleId) {
        try {
            const data = runQuery(`
                SELECT ins.*, v.plate as vehicle_plate 
                FROM insurances ins 
                JOIN vehicles v ON ins.vehicle_id = v.id 
                WHERE ins.vehicle_id = ?
                ORDER BY ins.end_date DESC
            `, [vehicleId])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getAllInsurances(companyId, isArchived = 0) {
        try {
            const data = runQuery(`
                SELECT ins.*, v.plate as vehicle_plate, v.brand, v.model
                FROM insurances ins 
                JOIN vehicles v ON ins.vehicle_id = v.id 
                WHERE v.company_id = ? AND (ins.is_archived = ? OR ins.is_archived IS NULL)
                ORDER BY ins.end_date ASC
            `, [companyId, isArchived])
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function createInsurance({ vehicleId, company, policyNo, type, startDate, endDate, premium, notes, filePath, isArchived = 0, skipValidation = false }) {
        try {
            if (!skipValidation) {
                const activeInsurance = runQueryOne(
                    'SELECT end_date FROM insurances WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0 ORDER BY end_date DESC LIMIT 1',
                    [vehicleId, type]
                );

                if (activeInsurance && activeInsurance.end_date) {
                    const today = new Date();
                    const endDateObj = new Date(activeInsurance.end_date);
                    const diffTime = endDateObj - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 15) {
                        return {
                            success: false,
                            error: `Mevcut sigortanın süresi henüz dolmadı. Bitime 15 gün kala (Kalan süre: ${diffDays} gün) yenileme yapabilirsiniz.`
                        };
                    }
                }
            }

            if (isArchived === 0) {
                runExec(
                    'UPDATE insurances SET is_archived = 1 WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0',
                    [vehicleId, type]
                )
            }

            const info = runExec(
                'INSERT INTO insurances (vehicle_id, company, policy_no, type, start_date, end_date, premium, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [vehicleId, company, policyNo, type, startDate, endDate, premium, notes, filePath, isArchived]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateInsurance({ id, company, policyNo, type, startDate, endDate, premium, notes, filePath }) {
        try {
            runExec(
                'UPDATE insurances SET company = ?, policy_no = ?, type = ?, start_date = ?, end_date = ?, premium = ?, notes = ?, file_path = ? WHERE id = ?',
                [company, policyNo, type, startDate, endDate, premium, notes, filePath, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteInsurance(id) {
        try {
            runExec('DELETE FROM insurances WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getInsurances, getAllInsurances, createInsurance, updateInsurance, deleteInsurance }
}
