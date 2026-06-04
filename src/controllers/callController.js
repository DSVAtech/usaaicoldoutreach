const ghl = require('../services/ghlService');
const vapi = require('../services/vapiService');
const { isWithinCallingHours } = require('../utils/callingHours');
const config = require('../config');

function pickPhone(contact) {
  return contact?.phone || contact?.phoneNumber || null;
}

function pickName(contact) {
  if (!contact) return null;
  return contact.fullNameLowerCase || contact.contactName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || null;
}

async function triggerCallForContact(contactId) {
  const contact = await ghl.getContact(contactId);
  if (!contact) throw new Error(`Contact ${contactId} not found`);

  const contactTags = contact.tags || [];

  if (contactTags.includes(config.tags.dnc)) {
    console.log(`[call] Skipping ${contactId} - DNC`);
    return { skipped: true, reason: 'dnc' };
  }

  if (!contactTags.includes(config.tags.queue)) {
    console.log(`[call] Skipping ${contactId} - missing queue tag "${config.tags.queue}"`);
    return { skipped: true, reason: 'not_in_queue', requiredTag: config.tags.queue };
  }

  const phone = pickPhone(contact);
  if (!phone) throw new Error(`Contact ${contactId} has no phone`);

  const tz = contact.timezone || config.calling.timezoneDefault;
  if (!isWithinCallingHours(tz)) {
    console.log(`[call] Outside calling hours for ${contactId} (${tz})`);
    return { skipped: true, reason: 'outside_hours' };
  }

  const call = await vapi.createOutboundCall({
    phoneNumber: phone,
    contactId,
    name: pickName(contact),
    metadata: { ghlLocationId: config.ghl.locationId },
  });

  console.log(`[call] Started VAPI call ${call.id} for contact ${contactId}`);
  return { started: true, callId: call.id };
}

function extractStructured(vapiReport) {
  const analysis = vapiReport.analysis || vapiReport.call?.analysis || {};
  if (analysis.structuredData && Object.keys(analysis.structuredData).length) {
    return analysis.structuredData;
  }
  const outputs = analysis.structuredOutputs || analysis.structuredOutput || {};
  const first = Object.values(outputs)[0];
  if (first && typeof first === 'object') {
    return first.result || first.value || first.data || first;
  }
  return {};
}

function classifyOutcome(vapiReport) {
  const analysis = vapiReport.analysis || vapiReport.call?.analysis || {};
  const structured = extractStructured(vapiReport);
  const endedReason = vapiReport.endedReason || vapiReport.call?.endedReason || '';
  const summary = (analysis.summary || '').toLowerCase();

  if (structured.outcome) return structured.outcome;

  if (structured.dnc === true || /do not call|don't call|stop calling/.test(summary)) return 'dnc';
  if (/no[- ]?answer|voicemail|busy|customer-did-not-answer|not-answered|silence-timed-out|twilio-failed|pipeline-error|failed/i.test(endedReason)) return 'no-answer';
  if (structured.interested === true || /interested|sign me up|tell me more/.test(summary)) return 'hot-lead';
  if (structured.callback === true || /call ?back|call me later/.test(summary)) return 'callback-requested';
  if (structured.interested === false || /not interested|no thanks/.test(summary)) return 'not-interested';
  if (/enquir|question|ask about/.test(summary)) return 'enquiry-logged';

  return 'enquiry-logged';
}

function buildNote(vapiReport, outcome) {
  const a = vapiReport.analysis || vapiReport.call?.analysis || {};
  const startedAt = vapiReport.startedAt || vapiReport.call?.startedAt || vapiReport.createdAt || new Date().toISOString();
  const endedAt = vapiReport.endedAt || vapiReport.call?.endedAt;
  const durationSec =
    vapiReport.durationSeconds ||
    vapiReport.call?.durationSeconds ||
    (endedAt && startedAt ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : null);
  const recordingUrl = vapiReport.recordingUrl || vapiReport.call?.recordingUrl || vapiReport.stereoRecordingUrl;
  const sd = extractStructured(vapiReport);

  const durationStr = durationSec != null
    ? (durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${Math.round(durationSec % 60)}s` : `${Math.round(durationSec)}s`)
    : null;

  const dateStr = new Date(startedAt).toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lines = [
    `AI Cold Call — ${dateStr} AEST`,
    `Outcome: ${outcome}`,
    durationStr ? `Duration: ${durationStr}` : null,
    `Sentiment: ${sd.sentiment || 'n/a'}`,
    sd.callback_time ? `Callback time: ${sd.callback_time}` : null,
    sd.best_email ? `Captured email: ${sd.best_email}` : null,
    sd.key_enquiries ? `Enquiries: ${sd.key_enquiries}` : null,
    '',
    'Summary:',
    a.summary || '(no summary)',
    recordingUrl ? `\nRecording: ${recordingUrl}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

async function handleCallOutcome(vapiReport) {
  const contactId =
    vapiReport.metadata?.ghlContactId ||
    vapiReport.call?.metadata?.ghlContactId ||
    vapiReport.assistantOverrides?.metadata?.ghlContactId ||
    vapiReport.call?.assistantOverrides?.metadata?.ghlContactId;
  if (!contactId) {
    console.warn('[outcome] No ghlContactId in VAPI metadata, skipping');
    return { skipped: true };
  }

  const sd = extractStructured(vapiReport);
  console.log('[outcome] structured data extracted:', JSON.stringify(sd));

  const outcome = classifyOutcome(vapiReport);
  const note = buildNote(vapiReport, outcome);

  console.log(`[ghl] writing note to contact ${contactId}...`);
  try {
    await ghl.addNote(contactId, note);
    console.log(`[ghl] ✅ note saved (${note.length} chars)`);
  } catch (err) {
    console.error(`[ghl] ❌ note FAILED:`, err.response?.data || err.message);
  }

  const { tags } = config;
  const tagPlan = {
    'hot-lead':           { add: [tags.hotLead],       remove: [tags.queue] },
    'callback-requested': { add: [tags.callback],      remove: [tags.queue] },
    'not-interested':     { add: [tags.notInterested], remove: [tags.queue] },
    'no-answer':          { add: [tags.noAnswer],      remove: [] },
    'dnc':                { add: [tags.dnc],           remove: [tags.queue, tags.noAnswer, tags.callback] },
    'enquiry-logged':     { add: [tags.enquiry],       remove: [tags.queue] },
  }[outcome] || { add: [tags.enquiry], remove: [tags.queue] };

  if (tagPlan.add.length) {
    try {
      await ghl.addTags(contactId, tagPlan.add);
      console.log(`[ghl] ✅ tags added: [${tagPlan.add.join(', ')}]`);
    } catch (err) {
      console.error(`[ghl] ❌ add tags FAILED:`, err.response?.data || err.message);
    }
  }
  if (tagPlan.remove.length) {
    try {
      await ghl.removeTags(contactId, tagPlan.remove);
      console.log(`[ghl] ✅ tags removed: [${tagPlan.remove.join(', ')}]`);
    } catch (err) {
      console.error(`[ghl] ❌ remove tags FAILED:`, err.response?.data || err.message);
    }
  }

  if (outcome === 'callback-requested') {
    try {
      await ghl.createTask(contactId, {
        title: 'Callback requested by lead',
        body: 'AI cold call resulted in callback request. See latest note.',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      console.log(`[ghl] ✅ callback task created`);
    } catch (err) {
      console.error(`[ghl] ❌ task FAILED:`, err.response?.data || err.message);
    }
  }

  console.log(`[outcome] Contact ${contactId} -> ${outcome}`);
  return { contactId, outcome };
}

module.exports = { triggerCallForContact, handleCallOutcome, classifyOutcome };
