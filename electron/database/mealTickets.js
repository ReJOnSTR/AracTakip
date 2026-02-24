// Meal Tickets module
module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function getMealTickets(companyId) {
        try {
            const tickets = runQuery('SELECT * FROM meal_tickets WHERE company_id = ? ORDER BY date DESC, created_at DESC', [companyId])
            return { success: true, data: tickets }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function addMealTicket({ companyId, date, personCount, notes }) {
        try {
            const info = runExec(
                'INSERT INTO meal_tickets (company_id, date, person_count, notes) VALUES (?, ?, ?, ?)',
                [companyId, date, personCount, notes || null]
            )
            return { success: true, id: info.lastInsertRowid }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function updateMealTicket({ id, date, personCount, notes }) {
        try {
            runExec(
                'UPDATE meal_tickets SET date = ?, person_count = ?, notes = ? WHERE id = ?',
                [date, personCount, notes || null, id]
            )
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function deleteMealTicket(id) {
        try {
            runExec('DELETE FROM meal_tickets WHERE id = ?', [id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // ============ MEAL PRICE SETTINGS ============

    function getMealPrice(companyId) {
        try {
            const row = runQueryOne('SELECT * FROM meal_settings WHERE company_id = ?', [companyId])
            return { success: true, data: row || { price_per_person: 0 } }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function setMealPrice({ companyId, pricePerPerson }) {
        try {
            const existing = runQueryOne('SELECT id FROM meal_settings WHERE company_id = ?', [companyId])
            if (existing) {
                runExec('UPDATE meal_settings SET price_per_person = ? WHERE company_id = ?', [pricePerPerson, companyId])
            } else {
                runExec('INSERT INTO meal_settings (company_id, price_per_person) VALUES (?, ?)', [companyId, pricePerPerson])
            }
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // ============ STATS ============

    function getMealTicketStats(companyId) {
        try {
            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()
            const todayStr = now.toISOString().split('T')[0]

            const allTickets = runQuery('SELECT * FROM meal_tickets WHERE company_id = ?', [companyId])
            const priceRow = runQueryOne('SELECT price_per_person FROM meal_settings WHERE company_id = ?', [companyId])
            const pricePerPerson = priceRow ? priceRow.price_per_person : 0

            let totalThisMonth = 0
            let todayCount = 0
            let ticketCountThisMonth = 0

            allTickets.forEach(ticket => {
                const tDate = new Date(ticket.date)
                if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                    totalThisMonth += ticket.person_count
                    ticketCountThisMonth++
                }
                if (ticket.date === todayStr) {
                    todayCount += ticket.person_count
                }
            })

            return {
                success: true,
                data: {
                    totalThisMonth,
                    todayCount,
                    ticketCountThisMonth,
                    pricePerPerson,
                    totalCostThisMonth: totalThisMonth * pricePerPerson
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // ============ REPORT ============

    function getMealTicketReport(companyId, month, year) {
        try {
            const allTickets = runQuery('SELECT * FROM meal_tickets WHERE company_id = ? ORDER BY date ASC', [companyId])
            const priceRow = runQueryOne('SELECT price_per_person FROM meal_settings WHERE company_id = ?', [companyId])
            const pricePerPerson = priceRow ? priceRow.price_per_person : 0

            const filtered = allTickets.filter(ticket => {
                const d = new Date(ticket.date)
                return d.getMonth() === month && d.getFullYear() === year
            })

            let totalPersons = 0
            filtered.forEach(t => { totalPersons += t.person_count })

            return {
                success: true,
                data: {
                    tickets: filtered,
                    totalPersons,
                    pricePerPerson,
                    totalCost: totalPersons * pricePerPerson,
                    ticketCount: filtered.length,
                    month,
                    year
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return {
        getMealTickets,
        addMealTicket,
        updateMealTicket,
        deleteMealTicket,
        getMealTicketStats,
        getMealPrice,
        setMealPrice,
        getMealTicketReport
    }
}
