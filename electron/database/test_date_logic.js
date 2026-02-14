const { app } = require('electron')
const path = require('path')
const fs = require('fs')

// Set a custom userData path for testing to avoid affecting real data
const testUserData = path.join(__dirname, 'test_data_temp')
if (fs.existsSync(testUserData)) {
    fs.rmSync(testUserData, { recursive: true, force: true })
}
fs.mkdirSync(testUserData, { recursive: true })
app.setPath('userData', testUserData)

const db = require('./db')

app.whenReady().then(async () => {
    try {
        console.log('Initializing Database...')
        db.initializeDatabase() // Creates admin user (id=1)

        // Seed Data
        console.log('Seeding Data...')

        // 1. Create Company
        const compRes = db.createCompany({
            userId: 1, // admin
            name: 'Test Company',
            taxNumber: '1234567890',
            address: 'Test Address',
            phone: '5551234567'
        })
        if (!compRes.success) throw new Error('Failed to create company: ' + compRes.error)
        const companyId = compRes.id
        console.log('Company Created:', companyId)

        // 2. Create Vehicle
        const vehRes = db.createVehicle({
            companyId,
            type: 'Kamyon',
            plate: '34TST01',
            brand: 'Mercedes',
            model: 'Actros',
            year: 2020,
            color: 'White',
            status: 'active'
        })
        if (!vehRes.success) throw new Error('Failed to create vehicle: ' + vehRes.error)
        const vehicleId = vehRes.id
        console.log('Vehicle Created:', vehicleId)

        // 3. Create Employee
        const empRes = db.createEmployee({
            companyId,
            name: 'John',
            surname: 'Doe',
            tcNo: '11111111111',
            phone: '5559876543',
            email: 'john@example.com',
            position: 'Driver',
            department: 'Logistics',
            startDate: '2023-01-01',
            salary: 5000
        })
        if (!empRes.success) throw new Error('Failed to create employee: ' + empRes.error)
        const employeeId = empRes.id
        console.log('Employee Created:', employeeId)

        // 4. Create Work
        console.log('Creating Test Work...')
        const workRes = db.createWork({
            companyId,
            title: 'Test Date Logic Work',
            customer: 'Test Customer',
            description: 'Testing auto-update dates',
            status: 'pending'
        })

        if (!workRes.success) throw new Error('Failed to create work: ' + workRes.error)
        const workId = workRes.id
        console.log('Work ID:', workId)

        // --- TESTS ---

        // Test 1: Add first item
        console.log('\n--- Test 1: Add first item (2023-01-10) ---')
        const item1Res = db.addWorkItem({
            workId,
            date: '2023-01-10',
            vehicleId,
            employeeId,
            startTime: '08:00',
            endTime: '17:00',
            hours: 9,
            unitPrice: 100,
            description: 'Item 1'
        })
        if (!item1Res.success) throw new Error('FAILED to add item 1: ' + item1Res.error)

        let work = db.getWorkDetails(workId).data
        console.log(`Dates: Start=${work.start_date}, End=${work.end_date}`)
        if (work.start_date !== '2023-01-10' || work.end_date !== '2023-01-10') {
            console.error('FAIL: Dates shoud be 2023-01-10')
        } else {
            console.log('PASS')
        }

        // Test 2: Add second item later
        console.log('\n--- Test 2: Add second item (2023-01-15) ---')
        const item2Res = db.addWorkItem({
            workId,
            date: '2023-01-15',
            vehicleId,
            employeeId,
            startTime: '08:00',
            endTime: '17:00',
            hours: 9,
            unitPrice: 100,
            description: 'Item 2'
        })
        if (!item2Res.success) throw new Error('FAILED to add item 2: ' + item2Res.error)
        const item2Id = item2Res.id
        work = db.getWorkDetails(workId).data
        console.log(`Dates: Start=${work.start_date}, End=${work.end_date}`)
        if (work.end_date !== '2023-01-15') console.error('FAIL: End date incorrect')
        else console.log('PASS')

        // Test 3: Add third item earlier
        console.log('\n--- Test 3: Add third item (2023-01-05) ---')
        const item3Res = db.addWorkItem({
            workId,
            date: '2023-01-05',
            vehicleId,
            employeeId,
            startTime: '08:00',
            endTime: '17:00',
            hours: 9,
            unitPrice: 100,
            description: 'Item 3'
        })
        if (!item3Res.success) throw new Error('FAILED to add item 3: ' + item3Res.error)
        work = db.getWorkDetails(workId).data
        console.log(`Dates: Start=${work.start_date}, End=${work.end_date}`)
        if (work.start_date !== '2023-01-05') console.error('FAIL: Start date incorrect')
        else console.log('PASS')

        // Test 4: Update Item 2 (2023-01-15) to 2023-01-20
        console.log('\n--- Test 4: Update Item 2 (move end date further) ---')
        const resUpdate = db.updateWorkItem({
            id: item2Id,
            date: '2023-01-20',
            vehicleId,
            employeeId,
            startTime: '08:00',
            endTime: '17:00',
            hours: 9,
            unitPrice: 100,
            description: 'Item 2 Updated'
        })
        if (!resUpdate.success) throw new Error('FAILED to update item 2: ' + resUpdate.error)
        work = db.getWorkDetails(workId).data
        console.log(`Dates: Start=${work.start_date}, End=${work.end_date}`)
        if (work.end_date !== '2023-01-20') console.error('FAIL: End date incorrect after update')
        else console.log('PASS')

        // Test 5: Delete last item (Item 2 - 2023-01-20)
        console.log('\n--- Test 5: Delete last item (2023-01-20) ---')
        const resDelete = db.deleteWorkItem(item2Id)
        if (!resDelete.success) throw new Error('FAILED to delete item 2: ' + resDelete.error)

        work = db.getWorkDetails(workId).data
        console.log(`Dates: Start=${work.start_date}, End=${work.end_date}`)
        // Remaining items: Item 1 (2023-01-10) and Item 3 (2023-01-05)
        // Max date should be 2023-01-10 (Item 1)
        if (work.end_date !== '2023-01-10') console.error('FAIL: End date incorrect after delete')
        else console.log('PASS')

        console.log('\nAll Tests Completed Successfully.')
        app.quit()
        process.exit(0)

    } catch (error) {
        console.error('Unhandled Error:', error)
        app.quit()
        process.exit(1)
    }
})
