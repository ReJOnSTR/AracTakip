const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'dev-admin-secret-key-12345';
const token = jwt.sign({ id: 1, username: 'admin' }, SECRET_KEY, { expiresIn: '12h' });

async function verify() {
    console.log("Generating token:", token);
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const companyId = 9; // Sak Petrol Otomotiv

    // 1. Create a Customer
    console.log("\n1. Testing Customer creation via API...");
    const customerPayload = {
        companyId: companyId,
        name: 'Test Customer ' + Date.now(),
        phone: '555-TEST-CUSTOMER',
        email: 'test@customer.com',
        tax_number: '1234567890',
        tax_office: 'Ataşehir V.D.',
        address: '123 Test Street, Istanbul',
        notes: 'Verification test customer'
    };

    const customerRes = await fetch('http://localhost:9999/api/mobile/customers', {
        method: 'POST',
        headers,
        body: JSON.stringify(customerPayload)
    });

    const customerData = await customerRes.json();
    console.log("Customer response:", customerData);

    if (!customerData.success || !customerData.data?.id) {
        throw new Error("Failed to create customer");
    }
    const customerId = customerData.data.id;

    // 2. Create a Work (İş)
    console.log("\n2. Testing Work creation via API...");
    const workPayload = {
        companyId: companyId,
        customerId: customerId,
        title: 'Test Work ' + Date.now(),
        status: 'pending',
        location: 'Test Location',
        description: 'Verification test work details',
        pazar_multiplier: 1.5,
        mesai_multiplier: 1.5,
        work_start_time: '09:00',
        work_end_time: '18:00'
    };

    const workRes = await fetch('http://localhost:9999/api/mobile/works', {
        method: 'POST',
        headers,
        body: JSON.stringify(workPayload)
    });

    const workData = await workRes.json();
    console.log("Work response:", workData);

    if (!workData.success || !workData.data?.id) {
        throw new Error("Failed to create work");
    }

    // 3. Create a Meal Ticket (Yemek Fişi)
    console.log("\n3. Testing Meal Ticket creation via API...");
    const mealPayload = {
        companyId: companyId,
        date: new Date().toISOString().split('T')[0],
        personCount: 5,
        notes: 'Verification test meal ticket notes'
    };

    const mealRes = await fetch('http://localhost:9999/api/mobile/meal-tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify(mealPayload)
    });

    const mealData = await mealRes.json();
    console.log("Meal Ticket response:", mealData);

    const mealId = mealData.id || mealData.data?.id;
    if (!mealData.success || !mealId) {
        throw new Error("Failed to create meal ticket");
    }

    console.log("\n🎉 Verification succeeded! All dynamic addition forms tested via API are working.");
}

verify().catch(err => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
});
