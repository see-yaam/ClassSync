const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { createNotification } = require('../utils/notificationHelper');

/**
 * Vercel Cron Job Endpoint: Check approaching homework deadlines
 * Called every 5 minutes by Vercel Cron (configured in vercel.json)
 * Also works as a manual trigger via GET /api/cron/deadlines
 */
router.get('/cron/deadlines', async (req, res) => {
  // Verify cron authorization (Vercel sends this header)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the cron secret; in dev, allow all
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [upcoming] = await db.query(
      `SELECT homework_id, classroom_id, title, deadline
       FROM homework
       WHERE deadline_reminder_sent = false
         AND is_published = true
         AND deadline IS NOT NULL
         AND deadline BETWEEN NOW() AND NOW() + INTERVAL 1 HOUR`
    );

    let notified = 0;

    for (const hw of upcoming) {
      const [members] = await db.query(
        `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'learner' AND is_active = true`,
        [hw.classroom_id]
      );

      for (const m of members) {
        await createNotification(
          m.user_id,
          'deadline',
          'Upcoming Homework Deadline Warning',
          `Deadline approaching in < 1 hour for "${hw.title}". Please submit your solution soon!`,
          `/homework.html?id=${hw.homework_id}`
        );
        notified++;
      }

      await db.query(
        `UPDATE homework SET deadline_reminder_sent = true WHERE homework_id = ?`,
        [hw.homework_id]
      );
    }

    res.json({
      ok: true,
      checked: upcoming.length,
      notified,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron deadline check error:', error);
    res.status(500).json({ error: 'Cron job failed', message: error.message });
  }
});

module.exports = router;
