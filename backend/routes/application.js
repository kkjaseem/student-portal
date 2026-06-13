const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');

/**
 * POST /api/application/save
 * Create or update application
 */
router.post('/save', async (req, res) => {
  try {
    const {
      id,
      title,
      firstName,
      middleName,
      lastName,
      email,
      mobile,
      gender,
      dob,
      state,
      panNumber,
      aadhaarNumber,
    } = req.body;

    if (!firstName || !lastName || !email || !mobile) {
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, email, mobile',
      });
    }

    const appId = id || uuidv4();

    // Mask Aadhaar for storage (only store last 4 digits)
    const maskedAadhaar = aadhaarNumber
      ? 'XXXX-XXXX-' + aadhaarNumber.slice(-4)
      : null;

    const result = await query(
      `INSERT INTO applications 
       (id, title, first_name, middle_name, last_name, email, mobile, gender, dob, 
        state, pan_number, aadhaar_masked, aadhaar_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         first_name = EXCLUDED.first_name,
         middle_name = EXCLUDED.middle_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         mobile = EXCLUDED.mobile,
         gender = EXCLUDED.gender,
         dob = EXCLUDED.dob,
         state = EXCLUDED.state,
         pan_number = EXCLUDED.pan_number,
         aadhaar_masked = COALESCE(EXCLUDED.aadhaar_masked, applications.aadhaar_masked),
         updated_at = NOW()
       RETURNING *`,
      [appId, title, firstName, middleName, lastName, email, mobile, gender, dob,
        state, panNumber, maskedAadhaar]
    );

    logger.info('Application saved', { applicationId: appId });
    return res.json({ success: true, application: result.rows[0] });
  } catch (err) {
    logger.error('Application save error:', err);
    return res.status(500).json({ error: 'Failed to save application' });
  }
});

/**
 * GET /api/application/:id
 * Get application by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, av.verification_status, av.verification_message, av.verified_at
       FROM applications a
       LEFT JOIN aadhaar_verification av ON a.id = av.application_id 
         AND av.id = (
           SELECT id FROM aadhaar_verification 
           WHERE application_id = a.id 
           ORDER BY created_at DESC LIMIT 1
         )
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Application fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch application' });
  }
});

module.exports = router;
