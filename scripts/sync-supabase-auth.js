const { syncAllEmployeesToSupabaseAuth } = require('../electron/services/supabase.service');

async function run() {
    console.log('🚀 Starting Supabase Authentication Employee Sync...');
    try {
        const result = await syncAllEmployeesToSupabaseAuth();
        console.log('✅ Sync Completed Successfully:');
        console.log(`- Total synced: ${result.totalSynced}`);
        if (result.results && result.results.length > 0) {
            console.log(JSON.stringify(result.results.slice(0, 10), null, 2));
            if (result.results.length > 10) console.log(`... and ${result.results.length - 10} more.`);
        }
    } catch (err) {
        console.error('❌ Sync Error:', err.message);
    }
}

run();
