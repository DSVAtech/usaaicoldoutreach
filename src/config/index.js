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
    structuredOutputId: process.env.structuredoutputid || null,
  },
  calling: {
    timezoneDefault: 'Australia/Sydney',
    hourStart: 9,
    hourEnd: 20,
    maxNoAnswerRetries: 3,
    spacingSeconds: parseInt(process.env.callspacingseconds || '60', 10),
    maxConcurrent: parseInt(process.env.maxconcurrentcalls || '1', 10),
    dailyLimit: parseInt(process.env.dailycalllimit || '2', 10),
  },
  tags: {
    queue: process.env.queuetag || 'testingcoldcall',
    productionQueue: 'usa-sms-no-response',
    hotLead: 'hot-lead',
    callback: 'callback-requested',
    notInterested: 'not-interested',
    noAnswer: 'usa-no-answer',
    dnc: 'dnc',
    enquiry: 'enquiry-logged',
    coldCallDone: 'coldcalldone',
    noAnswerRetry: 'usa-no-answer-retry',
    noAnswerFinal: 'usa-no-answer-final',
  },
  n8n: {
    doneWebhookUrl: process.env.n8ndonewebhookurl || null,
  },
  pipeline: {
    id: process.env.pipelineid || null,
    stages: {
      outboundDialled: process.env.stageOutboundDialled || null,
      contacted: process.env.stageContacted || null,
      warmLead: process.env.stageWarmLead || null,
      hotLead: process.env.stageHotLead || null,
      demoBooked: process.env.stageDemoBooked || null,
      notInterested: process.env.stageNotInterested || null,
      dnc: process.env.stageDnc || null,
    },
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
