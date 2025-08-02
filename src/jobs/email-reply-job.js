import cron from 'node-cron';
import { findAll } from '../services/supabase.js';
import { handleEmailsForUser } from '../services/email-handler.js';

// Run every 1 minutes, change to 12 hours or so in production
cron.schedule('*/1 * * * *', async () => {
  console.log('Running periodic email fetch and reply script');

  try {
    const users = await findAll('gmail_credentials');
		  console.log("users fetched by job:\n", users)
    for (const user of users) {
      try {
        await handleEmailsForUser(user);
      } catch (err) {
        console.error(`Failed processing user ${user.email}:`, err.message);
      }
    }
  } catch (e) {
    console.error('Failed to fetch users:', e.message);
  }
});

