require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  ghl: {
    apiToken: process.env.ghlapitoken,
    locationId: process.env.ghllocationid,
    apiBase: 'https://services.leadconnectorhq.com',
    apiVersion: '2021-07-28',
  },
  vapi: {
    apiKey: process.env.vapikey,
    apiBase: 'https://api.vapi.ai',
    assistantId: process.env.vapiassistantid || null,
    phoneNumberId: process.env.vapiphonenumberid || null,
  },
  calling: {
    timezoneDefault: 'Australia/Sydney',
    hourStart: 9,
    hourEnd: 20,
    maxNoAnswerRetries: 3,
  },
  tags: {
    queue: process.env.queuetag || 'testingcoldcall',
    hotLead: 'hot-lead',
    callback: 'callback-requested',
    notInterested: 'not-interested',
    noAnswer: 'no-answer',
    dnc: 'dnc',
    enquiry: 'enquiry-logged',
  },
};

const missing = [];
if (!config.ghl.apiToken) missing.push('ghlapitoken');
if (!config.ghl.locationId) missing.push('ghllocationid');
if (!config.vapi.apiKey) missing.push('vapikey');
if (missing.length) {
  console.warn(`[config] Missing env vars: ${missing.join(', ')}`);
}

module.exports = config;
