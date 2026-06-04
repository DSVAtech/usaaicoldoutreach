# AI Cold Call Outreach — Real Estate AU

Automated AI cold calling system for Australian real estate leads. Uses **VAPI** for voice AI, **GoHighLevel (GHL)** as the CRM, and a Node.js + Express backend to orchestrate the flow.

## Architecture

```
GHL (tag fires) → /webhooks/ghl → VAPI outbound call → AI talks to lead
                                                              ↓
                                                  /webhooks/vapi (end-of-call-report)
                                                              ↓
                                                  GHL note + tag + task + opportunity stage
```

## Setup

```bash
npm install
cp .env.example .env
# fill in your real GHL + VAPI credentials in .env
npm start
```

Server runs on `http://localhost:3000`. Use **ngrok** (or Railway in production) to expose it publicly so VAPI + GHL can POST to it.

```bash
ngrok http 3000
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/webhooks/ghl` | GHL tag-triggered call request |
| POST | `/webhooks/vapi` | VAPI end-of-call-report |
| POST | `/test/call/:contactId` | Manual call trigger (testing) |

## Project structure

```
src/
├── server.js              Express entry
├── config/                env + tag/calling constants
├── services/              ghlService, vapiService (API clients)
├── controllers/           callController (trigger + outcome handling)
├── routes/                ghlWebhook, vapiWebhook
└── utils/                 callingHours (AEST 9am–8pm guard)
```

## Call outcomes & GHL tag mapping

| Outcome | GHL tag added | Queue tag removed? |
|---|---|---|
| `hot-lead` | `hot-lead` | yes |
| `callback-requested` | `callback-requested` | yes (+ GHL task created) |
| `not-interested` | `not-interested` | yes |
| `no-answer` | `no-answer` | no (retry-eligible) |
| `dnc` | `dnc` | yes (+ removes no-answer, callback) |
| `enquiry-logged` | `enquiry-logged` | yes |

## Australian compliance built in

- AI identifies itself at call start (Australian Consumer Law)
- Calls only between 9am–8pm in contact's local timezone
- DNC requests immediately tagged and excluded from future calls
- Recording disclosure in AI script
