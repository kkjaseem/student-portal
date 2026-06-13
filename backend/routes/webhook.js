const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query }  = require('../utils/db');
const { namesMatch, statesMatch, buildFullName } = require('../utils/matching');
const { logger } = require('../utils/logger');

router.post('/idfy', async (req, res) => {
  let payload;
  try {
    payload = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString())
      : req.body;
  } catch (err) {
    logger.error('Webhook: failed to parse body', err.message);
    return res.status(200).json({ status: 'received' });
  }
  res.status(200).json({ status: 'received' });
  processWebhook(payload).catch(err =>
    logger.error('Webhook: async processing error', err.message)
  );
});

async function processWebhook(payload) {
  logger.info('Webhook: processing', {
    reference_id: payload?.reference_id,
    status: payload?.status,
  });

  try {
    const referenceId = payload?.reference_id;

    // Store raw payload for audit
    await query(
      `INSERT INTO webhook_logs (id, request_id, payload, received_at)
       VALUES ($1, $2, $3, NOW())`,
      [uuidv4(), referenceId, JSON.stringify(payload)]
    ).catch(e => logger.error('webhook_logs insert failed:', e.message));

    // Only process SUCCESS
    if (payload?.status !== 'SUCCESS') {
      logger.warn('Webhook: non-SUCCESS status', { status: payload?.status });
      return;
    }

    // Extract from parsed_details
    const parsedDetails = payload?.parsed_details || {};
    const aadhaarName   = parsedDetails.name  || '';
    const aadhaarState  = parsedDetails.state || '';
    const maskedAadhaar = parsedDetails.uid   || '';

    logger.info('Webhook: extracted', { aadhaarName, aadhaarState, maskedAadhaar });

    // Get applicationId from reference_id (format: ref_<uuid>_<timestamp>)
    const applicationId = extractApplicationId(referenceId);
    if (!applicationId) {
      logger.error('Webhook: could not extract applicationId', { referenceId });
      return;
    }

    // Fetch application
    const appResult = await query(
      `SELECT id, first_name, middle_name, last_name, state FROM applications WHERE id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      logger.error('Webhook: application not found', { applicationId });
      return;
    }

    const app = appResult.rows[0];
    const formFullName = buildFullName(app.first_name, app.middle_name, app.last_name);
    const formState    = app.state;

    // Match name and state
    const nameMatch  = namesMatch(formFullName, aadhaarName);
    const stateMatch = statesMatch(formState, aadhaarState);

    logger.info('Webhook: matching', { formFullName, aadhaarName, formState, aadhaarState, nameMatch, stateMatch });

    // Determine outcome
    let verificationStatus;
    let verificationMessage;

    if (nameMatch && stateMatch) {
      verificationStatus  = 'VERIFIED';
      verificationMessage = 'Aadhaar verification successful.';
    } else if (nameMatch && !stateMatch) {
      verificationStatus  = 'FAILED';
      verificationMessage = 'State does not match Aadhaar records.';
    } else if (!nameMatch && stateMatch) {
      verificationStatus  = 'FAILED';
      verificationMessage = 'Applicant name does not match Aadhaar records.';
    } else {
      verificationStatus  = 'FAILED';
      verificationMessage = 'Applicant name and State do not match Aadhaar records.';
    }

    logger.info('Webhook: result', { verificationStatus, verificationMessage });

    // ── UPDATE 1: all fields except verified_at ───────────────────
    await query(
      `UPDATE aadhaar_verification
       SET aadhaar_name         = $1,
           aadhaar_state        = $2,
           name_match           = $3,
           state_match          = $4,
           verification_status  = $5,
           verification_message = $6,
           updated_at           = NOW()
       WHERE application_id = $7
         AND id = (
           SELECT id FROM aadhaar_verification
           WHERE application_id = $7
           ORDER BY created_at DESC LIMIT 1
         )`,
      [aadhaarName, aadhaarState, nameMatch, stateMatch, verificationStatus, verificationMessage, applicationId]
    );

    // ── UPDATE 2: verified_at separately — avoids $N type conflict ─
    if (verificationStatus === 'VERIFIED') {
      await query(
        `UPDATE aadhaar_verification
         SET verified_at = NOW()
         WHERE application_id = $1
           AND id = (
             SELECT id FROM aadhaar_verification
             WHERE application_id = $1
             ORDER BY created_at DESC LIMIT 1
           )`,
        [applicationId]
      );
    }

    // ── UPDATE 3: applications table ──────────────────────────────
    await query(
      `UPDATE applications
       SET aadhaar_masked   = $1,
           aadhaar_verified = $2,
           updated_at       = NOW()
       WHERE id = $3`,
      [maskedAadhaar, verificationStatus === 'VERIFIED', applicationId]
    );

    logger.info('Webhook: complete', { applicationId, verificationStatus });

  } catch (err) {
    logger.error('Webhook: processWebhook threw', err.message);
  }
}

function extractApplicationId(referenceId) {
  if (!referenceId) return null;
  const withoutPrefix = referenceId.replace(/^ref_/, '');
  const uuidMatch = withoutPrefix.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return uuidMatch ? uuidMatch[1] : null;
}

module.exports = router;
