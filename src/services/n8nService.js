const axios = require('axios');
const config = require('../config');

async function notifyCallDone(payload) {
  const url = config.n8n.doneWebhookUrl;
  if (!url) {
    console.log('[n8n] ⚠️  doneWebhookUrl not configured — skipping');
    return;
  }
  console.log(`[n8n] → POST ${url}`);
  console.log(`[n8n] → payload: contact=${payload.full_name || payload.first_name || '(no name)'} (${payload.contact_id}) phone=${payload.phone} outcome=${payload.outcome} sentiment=${payload.sentiment || 'n/a'} duration=${payload.duration_seconds ?? 'n/a'}s recording=${payload.recording_url ? 'yes' : 'no'}`);
  const t0 = Date.now();
  try {
    const res = await axios.post(url, payload, { timeout: 10000 });
    const ms = Date.now() - t0;
    const queueCount = res.data?.count;
    const queueStr = queueCount != null ? ` queue_size=${queueCount}` : '';
    console.log(`[n8n] ✅ done webhook posted (${payload.outcome}) for ${payload.contact_id} — ${res.status} in ${ms}ms${queueStr}`);
  } catch (err) {
    const ms = Date.now() - t0;
    console.error(`[n8n] ❌ done webhook FAILED after ${ms}ms — status=${err.response?.status || 'n/a'} msg=${err.message}`);
    if (err.response?.data) console.error('[n8n] ❌ response body:', JSON.stringify(err.response.data).slice(0, 500));
  }
}

module.exports = { notifyCallDone };
