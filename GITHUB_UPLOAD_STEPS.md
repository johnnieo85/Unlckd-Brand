# GitHub Upload Steps

Use these steps to upload the remediated UNLCKD Pro Trainer files to a private GitHub repo.

## Option A — Upload through GitHub website

1. Open GitHub.
2. Create a new **private** repository, or open the existing private repo.
3. Click **Add file → Upload files**.
4. Upload the project files/folders from this package.
5. Do **not** upload:
   - `node_modules/`
   - `dist/`
   - `.env.local`
   - `.env`
   - any service account `.json` credential files
6. Commit with a message like:

```text
Security remediation: remove frontend API key exposure and harden Firebase rules
```

## Option B — Upload with Git CLI

From inside the project folder:

```bash
git init
git add .
git commit -m "Security remediation: remove frontend API key exposure and harden Firebase rules"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_PRIVATE_REPO.git
git push -u origin main
```

If the repo already exists locally:

```bash
git status
git add .
git commit -m "Security remediation: remove frontend API key exposure and harden Firebase rules"
git push
```

## Critical GitHub security checks

Before pushing, run:

```bash
git status --short
```

Confirm these files are **not** being committed:

- `.env`
- `.env.local`
- `node_modules/`
- `dist/`
- service account key files like `service-account.json`
- any file containing `private_key`, `client_email`, or `GEMINI_API_KEY=actual_key_here`

Run a quick secret scan:

```bash
grep -RIn "private_key\|client_email\|GEMINI_API_KEY=AIza\|AIzaSy" . \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude=package-lock.json
```

Expected:

- `GEMINI_API_KEY` may appear in `.env.example` as a placeholder only.
- Firebase web config may contain an API key in `firebase-applet-config.json`; this key must be restricted in Google Cloud/Firebase.
- No service account credentials should appear.

## After upload

1. Keep the repository private.
2. Enable GitHub secret scanning if available.
3. Add branch protection later if multiple people work on the repo.
4. Never commit real `.env` files or downloaded service account JSON credentials.
