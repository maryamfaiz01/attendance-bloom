const express = require('express');
const router = express.Router();
const { get, all, run } = require('../db/database');
const { authenticateToken, checkMustChangePassword, requireAdmin } = require('../middleware/auth');

// GET /api/settings - Public endpoint to retrieve app & institute settings
router.get('/', async (req, res) => {
  try {
    const rows = await all(`SELECT key, value FROM settings`);
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    // Provide defaults if table is empty
    const defaultSettings = {
      institute_name: 'Lotus Skills Academy',
      institute_short_name: 'LSA',
      institute_tagline: 'Empowering Future Skills & Professional Excellence',
      logo_url: '/assets/images/tvtc.png',
      app_title: 'Attendance Bloom'
    };

    res.json({ settings: { ...defaultSettings, ...settings } });
  } catch (err) {
    console.error('[Get Settings Error]:', err);
    res.status(500).json({ error: 'Failed to fetch application settings.' });
  }
});

// PUT /api/settings - Admin only endpoint to update institute settings
router.put('/', authenticateToken, checkMustChangePassword, requireAdmin, async (req, res) => {
  try {
    const { institute_name, institute_short_name, institute_tagline, logo_url, app_title } = req.body;

    const updates = {
      institute_name: institute_name ? institute_name.trim() : 'Lotus Skills Academy',
      institute_short_name: institute_short_name ? institute_short_name.trim() : 'LSA',
      institute_tagline: institute_tagline ? institute_tagline.trim() : 'Empowering Future Skills & Professional Excellence',
      logo_url: logo_url ? logo_url.trim() : '/assets/images/tvtc.png',
      app_title: app_title ? app_title.trim() : 'Attendance Bloom'
    };

    for (const [key, value] of Object.entries(updates)) {
      await run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }

    const rows = await all(`SELECT key, value FROM settings`);
    const currentSettings = {};
    rows.forEach(r => {
      currentSettings[r.key] = r.value;
    });

    res.json({
      message: 'Institute settings updated successfully.',
      settings: currentSettings
    });
  } catch (err) {
    console.error('[Update Settings Error]:', err);
    res.status(500).json({ error: `Failed to update settings: ${err.message}` });
  }
});

module.exports = router;
