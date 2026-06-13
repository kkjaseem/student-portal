const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

const idfyClient = axios.create({
  baseURL: 'https://eve.idfy.com',
  headers: {
    'api-key':    process.env.IDFY_API_KEY,
    'account-id': process.env.IDFY_ACCOUNT_ID,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * POST /v3/tasks/async/verify_with_source/ind_digilocker_fetch_documents
 *
 * Request:
 * {
 *   task_id:  <uuid>,          ← unique per call
 *   group_id: <uuid>,          ← unique per call
 *   data: {
 *     reference_id: "ref_<applicationId>_<timestamp>",  ← DYNAMIC, unique per session
 *     key_id:       process.env.IDFY_KEY_ID,
 *     ou_id:        process.env.IDFY_OU_ID,
 *     secret:       process.env.IDFY_SECRET,            ← base64 encoded
 *     callback_url: "<BACKEND_URL>/api/webhook/idfy",
 *     doc_type:     "ADHAR",
 *     file_format:  "xml",
 *     extra_fields: {}
 *   }
 * }
 *
 * Response: { "request_id": "a957d82c-..." }
 */
const createTask = async ({ applicationId }) => {
  // All three IDs are fresh UUIDs every single call — guarantees uniqueness
  const taskId      = uuidv4();
  const groupId     = uuidv4();
  // reference_id format: ref_<applicationId>_<epoch-ms>
  // Webhook handler parses applicationId back out using this pattern
  const referenceId = `ref_${applicationId}_${Date.now()}`;

  const payload = {
    task_id:  taskId,
    group_id: groupId,
    data: {
      reference_id: referenceId,
      key_id:       process.env.IDFY_KEY_ID,
      ou_id:        process.env.IDFY_OU_ID,
      secret:       process.env.IDFY_SECRET,   // must be base64 encoded
      callback_url: `${process.env.BACKEND_URL}/api/webhook/idfy`,
      doc_type:     'ADHAR',
      file_format:  'xml',
      extra_fields: {},
    },
  };

  logger.info('IDfy POST createTask →', {
    taskId,
    groupId,
    referenceId,
    callback_url: payload.data.callback_url,
  });

  try {
    const response = await idfyClient.post(
      '/v3/tasks/async/verify_with_source/ind_digilocker_fetch_documents',
      payload
    );

    // Response shape: { "request_id": "a957d82c-987c-4fa9-b69f-6765dc3c1035" }
    const requestId = response.data?.request_id;
    if (!requestId) {
      throw new Error('IDfy POST response missing request_id');
    }

    logger.info('IDfy POST createTask ←', { requestId });
    return { requestId, taskId, groupId, referenceId };

  } catch (err) {
    logger.error('IDfy POST createTask failed', {
      httpStatus: err.response?.status,
      body:       err.response?.data,
      message:    err.message,
    });
    throw new Error(
      `IDfy createTask: ${err.response?.data?.message || err.message}`
    );
  }
};

/**
 * GET /v3/tasks?request_id=<id>
 *
 * Response is an ARRAY — always take index [0]:
 * [
 *   {
 *     action, completed_at, created_at,
 *     group_id, request_id, task_id, type,
 *     status,        ← "completed" when ready
 *     result: {
 *       source_output: {
 *         redirect_url,   ← send this URL to the frontend
 *         reference_id,
 *         session_exists,
 *         status
 *       }
 *     }
 *   }
 * ]
 */
const getTask = async (requestId) => {
  logger.info('IDfy GET getTask →', { requestId });

  try {
    const response = await idfyClient.get('/v3/tasks', {
      params: { request_id: requestId },
    });

    // Response is always an array
    const taskArray = response.data;
    if (!Array.isArray(taskArray) || taskArray.length === 0) {
      throw new Error('IDfy GET /v3/tasks returned empty array');
    }

    const task = taskArray[0];

    logger.info('IDfy GET getTask ←', {
      requestId,
      taskStatus:    task.status,
      sourceStatus:  task.result?.source_output?.status,
      redirectUrl:   task.result?.source_output?.redirect_url,
    });

    return task;

  } catch (err) {
    logger.error('IDfy GET getTask failed', {
      requestId,
      httpStatus: err.response?.status,
      body:       err.response?.data,
      message:    err.message,
    });
    throw new Error(
      `IDfy getTask: ${err.response?.data?.message || err.message}`
    );
  }
};

/**
 * Safely pull redirect_url from getTask() result
 * Path: task.result.source_output.redirect_url
 */
const extractRedirectUrl = (task) => {
  return task?.result?.source_output?.redirect_url || null;
};

module.exports = { createTask, getTask, extractRedirectUrl };
