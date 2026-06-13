const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createTask, getTask, extractRedirectUrl } = require('../utils/idfy');
const { query }  = require('../utils/db');
const { logger } = require('../utils/logger');

/**
 * POST /api/verification/initiate
 */
router.post('/initiate', async (req, res) => {
  const { applicationId, firstName, middleName, lastName, state, aadhaarNumber } = req.body;

  if (!firstName || !lastName || !state || !aadhaarNumber) {
    return res.status(400).json({
      error: 'Missing required fields: firstName, lastName, state, aadhaarNumber',
    });
  }
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: 'Invalid Aadhaar number. Must be exactly 12 digits.' });
  }

  const appId = applicationId || uuidv4();

  try {
    // Step 1: POST to IDfy
    const { requestId } = await createTask({ applicationId: appId });

    // Step 2: GET redirect_url from IDfy
    let redirectUrl = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const taskData = await getTask(requestId);
      redirectUrl = extractRedirectUrl(taskData);
      if (redirectUrl) break;
      logger.info(`Attempt ${attempt}: redirect_url not ready, retrying...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }

    if (!redirectUrl) {
      throw new Error('IDfy did not return a redirect_url after multiple attempts.');
    }

    // Step 3: Return to frontend immediately
    res.json({ applicationId: appId, requestId, redirectUrl });

    // Step 4: Save to DB in background
    saveToDatabase({ appId, firstName, middleName, lastName, state, aadhaarNumber, requestId });

  } catch (err) {
    logger.error('Verification initiate error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to initiate Aadhaar verification.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
});

async function saveToDatabase({ appId, firstName, middleName, lastName, state, aadhaarNumber, requestId }) {
  try {
    const maskedAadhaar = 'XXXX-XXXX-' + aadhaarNumber.slice(-4);

    await query(
      `INSERT INTO applications
         (id, first_name, middle_name, last_name, state,
          email, mobile, aadhaar_masked, aadhaar_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         first_name  = EXCLUDED.first_name,
         middle_name = EXCLUDED.middle_name,
         last_name   = EXCLUDED.last_name,
         state       = EXCLUDED.state,
         updated_at  = NOW()`,
      [appId, firstName, middleName || null, lastName, state,
       'pending@placeholder.com', '0000000000', maskedAadhaar]
    );

    await query(
      `INSERT INTO aadhaar_verification
         (id, application_id, request_id, verification_status, created_at, updated_at)
       VALUES ($1, $2, $3, 'INITIATED', NOW(), NOW())
       ON CONFLICT (request_id) DO UPDATE SET updated_at = NOW()`,
      [uuidv4(), appId, requestId]
    );

    logger.info('DB saved', { appId, requestId });
  } catch (err) {
    logger.error('DB save failed (non-blocking):', err.message);
  }
}

/**
 * GET /api/verification/status/:requestId
 *
 * Polls verification status — checks by requestId AND applicationId
 * to catch webhook updates that come via applicationId lookup
 */
router.get('/status/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {
    // Primary: query by request_id
    const result = await query(
      `SELECT
         av.application_id,
         av.verification_status,
         av.verification_message,
         av.verified_at,
         av.created_at
       FROM aadhaar_verification av
       WHERE av.application_id = (
         SELECT application_id FROM aadhaar_verification
         WHERE request_id = $1 LIMIT 1
       )
       ORDER BY av.created_at DESC
       LIMIT 1`,
      [requestId]
    );

    if (result.rows.length === 0) {
      logger.info('Status: no record found yet', { requestId });
      return res.json({ status: 'INITIATED', message: 'Verification in progress.' });
    }

    const row = result.rows[0];

    logger.info('Status poll', { requestId, status: row.verification_status });

    // Auto-fail after 5 minutes
    if (row.verification_status === 'INITIATED') {
      const ageMs = Date.now() - new Date(row.created_at).getTime();
      if (ageMs > 5 * 60 * 1000) {
        await query(
          `UPDATE aadhaar_verification
           SET verification_status  = 'FAILED',
               verification_message = 'Verification timed out.',
               updated_at           = NOW()
           WHERE request_id = $1`,
          [requestId]
        ).catch(() => {});
        return res.json({ status: 'FAILED', message: 'Verification timed out. Please try again.' });
      }
    }

    return res.json({
      status:        row.verification_status,
      message:       row.verification_message,
      applicationId: row.application_id,
      verifiedAt:    row.verified_at,
    });

  } catch (err) {
    logger.error('Status check error:', err.message);
    return res.json({ status: 'INITIATED', message: 'Verification in progress.' });
  }
});

module.exports = router;
