const express = require('express');
const router = express.Router();
const { triggerCallForContact } = require('../controllers/callController');

router.post('/', async (req, res) => {
  const body = req.body || {};
  const contactId = body.contact_id || body.contactId || body.id || body.contact?.id;

  console.log('[ghl-webhook] received', JSON.stringify(body).slice(0, 500));

  if (!contactId) {
    return res.status(400).json({ error: 'missing contactId' });
  }

  res.status(202).json({ accepted: true, contactId });

  try {
    await triggerCallForContact(contactId);
  } catch (err) {
    console.error('[ghl-webhook] trigger error:', err.response?.data || err.message);
  }
});

module.exports = router;
