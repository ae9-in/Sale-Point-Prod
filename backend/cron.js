const cron = require('node-cron');
const generateDailyTargets = require('./scripts/generateDailyTargets');

// Run every day at midnight (00:00)
// For testing purposes, could be changed, but for production it's '0 0 * * *'
cron.schedule('0 0 * * *', async () => {
  console.log(`[CRON] Triggering daily targets generation...`);
  await generateDailyTargets();
});

console.log('[CRON] Scheduled jobs initialized.');
