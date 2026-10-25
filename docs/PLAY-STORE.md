# Publishing to Google Play

Two things have to be true before Play accepts a build, and then the rest is
automatic.

## One-time setup

### 1. Upload the first release by hand

**Google does not allow the very first release of an app through the API.** The
first App Bundle has to go up in Play Console yourself:

1. Open Play Console → your app → **Test and release → Production**
2. **Create new release**, and upload `vinyl-player.aab` from the latest GitHub
   release
3. Write the release notes, save, and roll it out

After that one, every later release can come from the workflow below.

### 2. Give the workflow permission to publish

1. **Google Cloud Console** → create (or pick) a project
2. **APIs & Services → Library** → enable **Google Play Android Developer API**
3. **IAM & Admin → Service accounts** → create a service account
4. Open it → **Keys → Add key → Create new key → JSON**. Download it.
5. **Play Console → Users and permissions → Invite new users** → paste the
   service account's email → give it **Release to production** (and the other
   release permissions you are happy with)
6. In this repository: **Settings → Secrets and variables → Actions → New
   repository secret**
   - Name: `PLAY_SERVICE_ACCOUNT_JSON`
   - Value: the whole contents of the JSON file from step 4

That is the only thing that has to be done by hand, once.

## Signing: do this before the next release

Every release so far was signed with a **throwaway debug key, and a different one
each time**, because the workflow never gave `build.sh` an upload key. Android
refuses to install an APK over one signed with a different key, so:

- v60's APK and v70's APK were signed by different keys
- **the v70 update could not install over v60** — the app stayed on the old
  version and the store kept offering an update that could never land
- Google Play would have rejected the App Bundle as well

The workflow now reads the upload key from secrets. Four of them:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | the whole `.jks`, base64-encoded on one line |
| `KEYSTORE_PASSWORD` | the keystore password |
| `KEY_ALIAS` | `vinylplayer` |
| `KEY_PASSWORD` | the same password as `KEYSTORE_PASSWORD` |

To produce `KEYSTORE_BASE64`:

```bash
base64 -w0 vinyl-player-upload.jks > keystore.b64
# macOS: base64 -i vinyl-player-upload.jks -o keystore.b64
```

Then paste the contents of `keystore.b64` as the secret value. The password and
alias are in `PLAY-STORE-SIGNING.txt`.

Once those four exist, every build — APK and App Bundle — is signed with the same
key as your original upload key, and updates install over each other normally.

### One uninstall may be needed, once

If the app currently installed on a phone was signed with a debug key, it has to
be **uninstalled once** before the correctly-signed build will install over it.
After that, every future update installs cleanly.

If the app on the phone came from the signed APK handed over in chat (certificate
`d921afae…`, `CN=Raju`), no uninstall is needed — that is the same key.

## After that

Push a tag:

```bash
git tag v61.0 && git push origin v61.0
```

The workflow builds the web app, the APK and the App Bundle, attaches them to the
GitHub release, and uploads the bundle to Play. Or run it by hand from the
**Actions** tab and pick the track (`internal`, `alpha`, `beta` or `production`).

Every user with the app installed then gets the update the normal way — Google
Play's own updater, in the background. Nobody has to open the app, and nobody has
to open Play Console.

## Things that will stop an upload

| Symptom | Cause |
|---|---|
| `APK has an invalid version code` | `versionCode` must go **up** every time. Never reuse one. |
| `App bundle was signed with the wrong key` | The upload key must be the same one every time. It is the one in `PLAY-STORE-SIGNING.txt`. |
| The job is green but nothing appeared on Play | The secret is not set — the step says so in the log and skips itself. |
| `The caller does not have permission` | The service account was not invited in Play Console, or lacks the release permission. |

## Release notes

Play shows "What's new" from
`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`. Add one for each
new `versionCode`, or the notes are left blank.
