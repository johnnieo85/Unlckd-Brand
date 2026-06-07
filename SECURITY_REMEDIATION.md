# UNLCKD Pro Trainer Security Remediation

Project: `gen-lang-client-0901360203`

Google suspension reason provided: abusive activity consistent with hijacking, likely because API keys or service account credentials were exposed publicly and harvested.

## Changes applied in this remediation package

### 1. Gemini API key removed from browser bundle

Previously, `vite.config.ts` injected `GEMINI_API_KEY` into frontend JavaScript. If deployed with a real key, anyone could view the built JavaScript and steal the key.

Now:

- Frontend calls `/api/generate-content`.
- `server.ts` reads `process.env.GEMINI_API_KEY` server-side only.
- The browser no longer needs the Gemini key.

Files changed:

- `vite.config.ts`
- `server.ts`
- `src/services/gemini.ts`

### 2. URL audit endpoint restricted

Previously, `/api/audit-link?url=` could fetch arbitrary URLs. This can look like an open proxy / SSRF risk.

Now:

- Only HTTP/HTTPS URLs are allowed.
- Only approved hosts are allowed: YouTube, Pinterest, and Google.
- Private/local network IPs are blocked.
- Redirects and response size are limited.

File changed:

- `server.ts`

### 3. Demo premium bypass disabled

Previously, the app contained a demo PIN `1234` that could unlock premium from the client.

Now:

- Demo PIN unlock is disabled.
- Premium activation must be performed by an authorized admin/backend process.

File changed:

- `src/App.tsx`

### 4. Firestore rules hardened

Users cannot grant themselves `hasAccess` or `isPremium`.

File changed:

- `firestore.rules`

### 5. Firebase deploy config added

A `firebase.json` file was added so Firestore rules can be deployed with Firebase CLI.

File added:

- `firebase.json`

### 6. Dependency audit cleaned

`npm audit` now reports 0 vulnerabilities after updating `package-lock.json`.

File changed:

- `package-lock.json`

## Still required in Google/Firebase console

These cannot be completed from code alone if the project is suspended or you cannot access Google Cloud:

1. Regain Google Cloud/Firebase project access.
2. Revoke/rotate all API keys and service account keys.
3. Delete unauthorized VMs/resources.
4. Restrict remaining Firebase/API keys by website domain and API scope.
5. Review IAM and remove unknown users/service accounts.
6. Submit appeal with evidence of remediation.

## Important note about Firebase web API keys

Firebase web API keys are commonly present in frontend config. They are not secret in the same way service account JSON keys are. However, they must still be restricted in Google Cloud to your app domains and allowed APIs only.

Recommended restrictions:

- Application restriction: HTTP referrers / websites
- Allowed referrers:
  - `https://unlckdbrand.com/*`
  - `https://www.unlckdbrand.com/*`
  - your Firebase Hosting domain, if used
  - your Cloud Run/App Hosting domain, if used
- API restrictions: only APIs the app actually uses, such as Identity Toolkit API, Firestore API, Firebase Installations API, and Gemini API only if still needed by that key.

## Commands to verify locally

```bash
npm ci
npm run lint
npm run build
npm audit
```

Expected result:

- TypeScript passes
- Build passes
- `npm audit` reports 0 vulnerabilities
