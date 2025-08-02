import express from 'express';
import { findOneByField, insertRow } from '../supabase/db.js';

const router = express.Router();

router.post('/register-gmail', async (req, res) => {
  const { email, gmailAppPassword } = req.body;

  if (!email || !gmailAppPassword) {
    return res.status(400).json({ error: 'Email and Gmail App Password are required' });
  }

  try {
    const existing = await findOneByField('gmail_credentials', 'email', email);
    if (existing) {
      return res.status(409).json({ error: 'Gmail account already registered' });
    }

    const inserted = await insertRow(
      'gmail_credentials',
      { email, encryptedPassword: gmailAppPassword },
      { encryptFields: ['gmail_app_password'] }
    );

    return res.status(201).json({ message: 'Credentials stored' });
  } catch (err) {
    console.error('Error registering Gmail credentials:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

