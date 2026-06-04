const express = require('express');
const config = require('./config');
const ghlWebhook = require('./routes/ghlWebhook');
const vapiWebhook = require('./routes/vapiWebhook');
const { triggerCallForContact } = require('./controllers/callController');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/webhooks/ghl', ghlWebhook);
app.use('/webhooks/vapi', vapiWebhook);

app.post('/test/call/:contactId', async (req, res) => {
  try {
    const result = await triggerCallForContact(req.params.contactId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error('[server] error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`AI cold call server listening on http://localhost:${config.port}`);
  console.log(`  POST /webhooks/ghl   - GHL tag trigger`);
  console.log(`  POST /webhooks/vapi  - VAPI end-of-call report`);
  console.log(`  POST /test/call/:contactId - manual trigger`);
});
