# Anavrin TV

Anavrin TV is a Sui-native video platform with:

- real Sui wallet connect through `@mysten/dapp-kit-react`
- zkLogin support through Enoki
- Seal encryption for protected playback
- Walrus-backed encrypted uploads
- wallet-funded tips, publish/unpublish, renewals, profile edits, and admin moderation

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Create your local environment file.

```bash
cp .env.example .env.local
```

3. Fill in the real values for your network, Seal package, Walrus relay, upload signer, treasury wallet, and optional Enoki providers.

4. Start the app.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment

The app reads the following runtime values:

- `NEXT_PUBLIC_SUI_NETWORK`
- `NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID`
- `NEXT_PUBLIC_SEAL_MVR_NAME`
- `NEXT_PUBLIC_SEAL_THRESHOLD`
- `NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON`
- `NEXT_PUBLIC_SEAL_VERIFY_KEY_SERVERS`
- `ANAVRIN_SEAL_KEY`
- `NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL`
- `ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY`
- `NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS`
- `NEXT_PUBLIC_UPLOAD_FEE_MIST`
- `NEXT_PUBLIC_ENOKI_API_KEY`
- `NEXT_PUBLIC_ENOKI_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_ENOKI_FACEBOOK_CLIENT_ID`
- `NEXT_PUBLIC_ENOKI_TWITCH_CLIENT_ID`
- `NEXT_PUBLIC_ENOKI_REDIRECT_URL`

Use `npm run check:env` for a quick local sanity check and `npm run check:env:strict` before production deploys.

`NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL` is recommended but optional. If it is not set, the server falls back to direct Walrus writes with the configured upload signer.

Enoki is optional. Leave the Enoki values empty if you only want Sui Wallet and Slush wallet connect.

## Production behavior

- Uploads sign one Sui transaction for policy creation and treasury fee routing.
- The encrypted bundle is uploaded server-side to Walrus with the configured upload key.
- Playback uses Seal session keys and the Seal approval transaction bytes to decrypt client-side.
- Tips, publish, unpublish, and renew actions are Sui transactions.

## Verification

```bash
npm run lint
npm run build
```

## Deployment

This is a standard Next.js app and can be deployed to Vercel or any Node host that supports Next.js.

Before deploying:

1. Copy `.env.example` into your deployment environment.
2. Fill in the production values.
3. Run `npm run check:env:strict`.
4. Run `npm run build`.

### Static frontend note (GitHub Pages / custom domain on Pages)

GitHub Pages serves static files only and does not run Next.js API routes. Uploads, moderation, and Walrus finalization require the API server.

If you host the frontend on Pages:

1. Deploy this app backend (`next start`) on a Node host (for example: Vercel, Fly.io, Render, Railway).
2. Set `NEXT_PUBLIC_API_ORIGIN` in the frontend build to that backend origin (for example `https://api.onreel.xyz`).
3. Keep `NEXT_PUBLIC_ENABLE_SEAL_PROXY=false` unless your Seal key servers require proxying.

Without a live API origin, `/api/videos`, `/api/platform`, and `/api/seal/proxy` will return `404` on Pages and uploads will fail.

If you are moving from testnet to mainnet, update:

- `NEXT_PUBLIC_SUI_NETWORK=mainnet`
- `NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON`
- `NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID`
- `NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS`
- `NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL` if you want the relay path instead of direct Walrus writes

## Notes

- The app is browser-first and uses a client-only wallet bootstrap to avoid server-side wallet SDK crashes.
- The Seal key fallback is only for local development. Production requires `ANAVRIN_SEAL_KEY`.
- If you want zkLogin, configure at least one Enoki OAuth provider.
- The upload relay is optional because the Walrus SDK can write directly when the relay host is absent.
