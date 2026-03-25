# API Contract

Base URL: `http://localhost:4000`

## Health
- `GET /health`

## Rules / Overrides
- `POST /admin/rules`
- `POST /admin/overrides`
- `POST /admin/rules/:ruleId/disable`
- `GET /admin/rules/effective`

### POST /admin/rules body
```json
{
  "scope": "GLOBAL",
  "priority": 100,
  "selector": {},
  "patch": {"uploadFlatMist": "100000000"},
  "startAt": "2026-03-25T00:00:00.000Z",
  "endAt": "2026-09-25T00:00:00.000Z",
  "reason": "Seasonal change",
  "createdBy": "admin"
}
```

## Fee Simulation
- `POST /fee/simulate`

```json
{
  "operation": "UPLOAD",
  "selector": {"userId": "user_1", "creatorTier": "verified"},
  "request": {
    "sizeBytes": "1200000000",
    "durationSeconds": 180,
    "basePriceMist": "0",
    "epochs": 1
  },
  "sponsorship": {
    "budgetRemainingMist": "5000000000",
    "coverageBps": 5000,
    "capMist": "200000000"
  }
}
```

## Sponsor Budgets
- `POST /admin/sponsor-budgets`

## Upload Intent
- `POST /uploads/intents`
- `PUT /uploads/intents/:uploadIntentId/file` (binary `application/octet-stream`)
- `GET /uploads/intents/:uploadIntentId`

```json
{
  "userId": "user_1",
  "walletAddress": "0xabc...",
  "channelId": "channel_1",
  "title": "Episode 1",
  "description": "Pilot upload",
  "fileName": "clip.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": "1200000000",
  "checksumSha256": "...",
  "uploaderSignature": "base64-signature-optional",
  "selector": {"creatorTier": "verified"}
}
```

### Upload Status Example
```json
{
  "uploadIntentId": "uuid",
  "status": "ENCRYPTED",
  "failureReason": null,
  "walrusManifestBlobId": null,
  "walrusManifestObjectId": null,
  "onchainVideoObjectId": null,
  "onchainMintTxDigest": null,
  "publishedAt": null,
  "updatedAt": "2026-03-25T05:00:00.000Z"
}
```
