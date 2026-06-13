const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');

/**
 * GET /api/admin/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const [total, verified, failed] = await Promise.all([
      query('SELECT COUNT(*) FROM applications'),
      query("SELECT COUNT(*) FROM applications WHERE aadhaar_verified = true"),
      query(`SELECT COUNT(*) FROM aadhaar_verification WHERE verification_status = 'FAILED'`),
    ]);

    const totalCount = parseInt(total.rows[0].count);
    const verifiedCount = parseInt(verified.rows[0].count);
    const failedCount = parseInt(failed.rows[0].count);
    const successPct = totalCount > 0 ? ((verifiedCount / totalCount) * 100).toFixed(1) : 0;

    return res.json({
      totalApplications: totalCount,
      totalVerified: verifiedCount,
      totalFailed: failedCount,
      successPercentage: parseFloat(successPct),
    });
  } catch (err) {
    logger.error('Admin metrics error:', err);
    return res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/admin/verifications
 * List with search
 */
router.get('/verifications', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (a.id::text ILIKE $${params.length} 
        OR a.first_name ILIKE $${params.length} 
        OR a.last_name ILIKE $${params.length}
        OR av.request_id ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      whereClause += (whereClause ? ' AND ' : 'WHERE ') + `av.verification_status = $${params.length}`;
    }

    params.push(parseInt(limit), parseInt(offset));
    const dataQuery = `
      SELECT 
        a.id as application_id,
        a.first_name, a.last_name, a.email, a.mobile,
        a.aadhaar_verified, a.created_at as application_created_at,
        av.request_id, av.verification_status, av.verification_message,
        av.name_match, av.state_match, av.verified_at
      FROM applications a
      LEFT JOIN aadhaar_verification av ON a.id = av.application_id
        AND av.id = (
          SELECT id FROM aadhaar_verification 
          WHERE application_id = a.id 
          ORDER BY created_at DESC LIMIT 1
        )
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countParams = params.slice(0, -2);
    const countQuery = `
      SELECT COUNT(*) FROM applications a
      LEFT JOIN aadhaar_verification av ON a.id = av.application_id
        AND av.id = (
          SELECT id FROM aadhaar_verification 
          WHERE application_id = a.id 
          ORDER BY created_at DESC LIMIT 1
        )
      ${whereClause}
    `;

    const [data, count] = await Promise.all([
      query(dataQuery, params),
      query(countQuery, countParams),
    ]);

    return res.json({
      data: data.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    logger.error('Admin verifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

module.exports = router;
