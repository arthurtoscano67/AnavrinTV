# OnReel System Behavior (Current Implementation)

## Deterministic Rule Resolution
`GLOBAL < CREATOR_TIER < CAMPAIGN < INDIVIDUAL < MANUAL < EMERGENCY`

- Active window enforced by `start_at` and `end_at`.
- Selector matching supports `userId`, `creatorId`, `creatorTier`, `campaignId`, `walletAddress`, `channelId`, `region`.
- Every fee simulation returns a resolution trace with rule IDs and applied keys.

## Queue Pipeline
`UPLOAD_PIPELINE -> MEDIA_TRANSCODE -> MEDIA_ENCRYPT -> WALRUS_UPLOAD -> CHAIN_MINT -> INDEX_VIDEO -> PUBLISH_VIDEO`

- `workflow_jobs` uses queue/retry/dead-letter behavior.
- Jobs are claimed with `FOR UPDATE SKIP LOCKED` and processed idempotently.
- Retries are exponential with upper bound; max attempts move the job to `DEAD_LETTER`.

## Upload Lifecycle States
`RECEIVED -> VALIDATED -> TRANSCODED -> ENCRYPTED -> WALRUS_STORED -> MINTED -> INDEXED -> PUBLISHED`

If any stage fails beyond retry limit, the job dead-letters and the upload can be marked failed by operator action.

## Admin Override Support
- `/admin/rules` writes global/tier/campaign/manual/emergency rules.
- `/admin/overrides` writes individual-style override rules.
- `/admin/rules/effective` resolves effective profile for any selector target.
- `/fee/simulate` returns deterministic fee and sponsorship results for preview before publish.

## Sponsorship Support
- `sponsor_budgets` supports budget entries by target type/value/campaign/category.
- Fee simulation accepts sponsorship inputs and applies deterministic coverage/cap/budget math.

## Current Gaps to Complete Next
- Replace placeholder media/walrus/chain integrations with live adapters.
- Add real payout/ad decision workers (current services are lifecycle stubs).
- Add RBAC and approval workflow in API and admin UI.
- Add signed playback session token issuance and Seal key flow wiring.
