// Finance module
module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function getTransactions(companyId) {
        try {
            const transactions = runQuery("SELECT * FROM transactions WHERE company_id = ? AND method != 'CHECK' ORDER BY date DESC, created_at DESC", [companyId])
            return { success: true, data: transactions }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getTransactionById(transactionId) {
        try {
            const transaction = runQueryOne('SELECT * FROM transactions WHERE id = ?', [transactionId])
            return { success: true, data: transaction }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function addTransaction({ companyId, type, method, amount, currency, date, description, checkNumber, checkDueDate, status }) {
        try {
            const info = runExec(
                'INSERT INTO transactions (company_id, type, method, amount, currency, date, description, check_number, check_due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    companyId,
                    type,
                    method,
                    amount,
                    currency || 'TRY',
                    date,
                    description,
                    checkNumber || null,
                    checkDueDate || null,
                    status || 'COMPLETED'
                ]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateTransaction({ id, type, method, amount, currency, date, description, checkNumber, checkDueDate, status }) {
        try {
            runExec(
                'UPDATE transactions SET type = ?, method = ?, amount = ?, currency = ?, date = ?, description = ?, check_number = ?, check_due_date = ?, status = ? WHERE id = ?',
                [
                    type,
                    method,
                    amount,
                    currency || 'TRY',
                    date,
                    description,
                    checkNumber || null,
                    checkDueDate || null,
                    status || 'COMPLETED',
                    id
                ]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteTransaction(id) {
        try {
            runExec('DELETE FROM transactions WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getFinanceStats(companyId) {
        try {
            // Toplam Nakit Bakiye (Gelen Nakit - Çıkan Nakit + Gelen Banka - Çıkan Banka)
            // Ya da basitçe: COMPLETED olan tüm girişler - çıkışlar.
            // Fakat 'method' tabanlı nakit ayrımı istendiğine göre:
            const allTxs = runQuery('SELECT * FROM transactions WHERE company_id = ?', [companyId])

            let totalBalance = 0
            let cashBalance = 0
            let pendingChecks = 0
            let currentMonthOut = 0
            let currentMonthIn = 0

            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()

            allTxs.forEach(tx => {
                const isIncome = tx.type === 'IN'
                const val = isIncome ? tx.amount : -tx.amount

                // Total Balance (Nakit + Banka + Tahsil Edilmiş Çekler)
                if (tx.status === 'COMPLETED') {
                    totalBalance += val

                    if (tx.method === 'CASH') {
                        cashBalance += val
                    }
                }

                if (tx.method === 'CHECK' && tx.status === 'PENDING') {
                    if (isIncome) {
                        pendingChecks += tx.amount
                    } else {
                        // Eğer firma kendisi çek verdiyse o da eksi olarak bekleyen çekte görünebilir
                        // Fakat genelde kasada "Bekleyen Alınan Çekler" gösterilir.
                        // pendingChecks -= tx.amount 
                    }
                }

                // Bu ayki işlemler
                const txDate = new Date(tx.date)
                if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                    if (isIncome) {
                        currentMonthIn += tx.amount
                    } else {
                        currentMonthOut += tx.amount
                    }
                }
            })

            return {
                success: true,
                data: {
                    totalBalance,
                    cashBalance,
                    pendingChecks,
                    currentMonthIn,
                    currentMonthOut
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getChecksAndNotes(companyId) {
        try {
            const checks = runQuery("SELECT * FROM transactions WHERE company_id = ? AND method = 'CHECK' ORDER BY check_due_date ASC", [companyId])
            return { success: true, data: checks }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateCheckStatus(id, newStatus) {
        try {
            runExec('UPDATE transactions SET status = ? WHERE id = ? AND method = ?', [newStatus, id, 'CHECK'])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return {
        getTransactions,
        getTransactionById,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getFinanceStats,
        getChecksAndNotes,
        updateCheckStatus
    }
}
