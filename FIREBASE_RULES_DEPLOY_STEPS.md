# Firestore Rules Deploy Steps

Project: `gen-lang-client-0901360203`

## What changed

The remediated `firestore.rules` prevents users from granting themselves access or premium status.

Key rule:

```js
request.resource.data.hasAccess == resource.data.hasAccess &&
request.resource.data.isPremium == resource.data.isPremium
```

## Deploy from Firebase Console

Use this if you cannot use the CLI.

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: `UNLCKD Pro Trainer` / `gen-lang-client-0901360203`.
3. Open **Firestore Database**.
4. Click **Rules**.
5. Replace the existing rules with the contents of `firestore.rules`.
6. Click **Publish**.

If the project is suspended and the console blocks access, you must first regain access or appeal through Google support.

## Deploy with Firebase CLI

Prerequisites:

```bash
npm install -g firebase-tools
firebase login
```

From this project folder:

```bash
firebase use gen-lang-client-0901360203
firebase deploy --only firestore:rules
```

If `firebase use` fails because no alias exists:

```bash
firebase deploy --only firestore:rules --project gen-lang-client-0901360203
```

## Verify rules after deploy

In Firebase Console:

1. Firestore Database → Rules.
2. Confirm the published rules match the local `firestore.rules` file.
3. Check that users cannot update these fields themselves:
   - `hasAccess`
   - `isPremium`

## Important

Firestore rules do not revoke leaked Google Cloud credentials. They only protect Firestore data access. For the suspension reason Google provided, you still need to revoke/rotate API keys and service account keys in Google Cloud/Firebase once access is restored.
