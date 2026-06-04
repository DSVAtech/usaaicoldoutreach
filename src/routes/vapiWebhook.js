const express = require('express');
const router = express.Router();
const { handleCallOutcome } = require('../controllers/callController');

router.post('/', async (req, res) => {
  const message = req.body?.message || req.body || {};
  const type = message.type;

  const meaningful = ['end-of-call-report', 'status-update'];
  if (meaningful.includes(type)) console.log(`[vapi-webhook] type=${type}`);

  if (type === 'status-update') {
    const status = message.status || message.call?.status;
    if (status) console.log(`[vapi-webhook] call status: ${status}`);
    return res.status(200).json({ ok: true });
  }

  if (type !== 'end-of-call-report') {
    return res.status(200).json({ ok: true, ignored: type });
  }

  res.status(200).json({ ok: true });

  try {
    await handleCallOutcome(message);
  } catch (err) {
    console.error('[vapi-webhook] outcome error:', err.response?.data || err.message);
  }
});

module.exports = router;
