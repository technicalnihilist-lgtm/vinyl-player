<div align="center">

<a href="https://github.com/technicalnihilist-lgtm/vinyl-player/stargazers"><img src="https://img.shields.io/badge/stars-4-5A31F4?style=for-the-badge&logo=github&logoColor=white" alt="stars: 4"></a>&nbsp;<a href="https://github.com/technicalnihilist-lgtm/vinyl-player/network/members"><img src="https://img.shields.io/badge/forks-0-3FB950?style=for-the-badge" alt="forks: 0"></a>

<h3>A liquid-glass music player for Android that plays the songs already on your phone</h3>

<img src="https://img.shields.io/badge/TypeScript-5865F2?style=flat-square" alt="TypeScript"> <img src="https://img.shields.io/badge/Android-3B3F4A?style=flat-square" alt="Android"> <img src="https://img.shields.io/badge/APK-3FB950?style=flat-square" alt="APK"> <img src="https://img.shields.io/badge/Glassmorphism-EC4899?style=flat-square" alt="Glassmorphism">

<a href="https://github.com/technicalnihilist-lgtm/vinyl-player/releases/latest"><img src="https://img.shields.io/badge/DOWNLOAD-APK-6D5AE6?style=for-the-badge&logo=android&logoColor=white" alt="Download APK"></a> <a href="https://technicalnihilist-lgtm.github.io/vinyl-player/"><img src="https://img.shields.io/badge/OPEN-WEBSITE-EC4899?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Website"></a>

<b>Support the work</b>

<img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-COMING%20SOON-4B5563?style=for-the-badge&logo=buymeacoffee&logoColor=white" alt="Buy me a coffee — coming soon"> <img src="https://img.shields.io/badge/UPI-COMING%20SOON-4B5563?style=for-the-badge&logo=googlepay&logoColor=white" alt="UPI — coming soon"> <img src="https://img.shields.io/badge/PayPal-COMING%20SOON-4B5563?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal — coming soon">

<sub>Donations aren't live yet — Paytm, UPI, PayPal and Buy&nbsp;Me&nbsp;a&nbsp;Coffee all show <b>coming soon</b>. Until then, a ⭐ star is the best support.</sub>

<a href="https://github.com/technicalnihilist-lgtm/vinyl-player/releases/latest"><img src="https://img.shields.io/badge/VERSION-v162.0-6D5AE6?style=for-the-badge" alt="VERSION: v162.0"></a> <img src="https://img.shields.io/badge/DOWNLOADS-1.3K-3FB950?style=for-the-badge" alt="DOWNLOADS: 1.3K"> <a href="https://technicalnihilist-lgtm.github.io/vinyl-player/"><img src="https://img.shields.io/badge/WEBSITE-LIVE-EC4899?style=for-the-badge&logo=googlechrome&logoColor=white" alt="WEBSITE: LIVE"></a>

<h4>Get it from</h4>

<a href="https://github.com/technicalnihilist-lgtm/vinyl-player/releases"><img src="https://img.shields.io/badge/GitHub-Releases-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Releases"></a> <a href="https://technicalnihilist-lgtm.github.io/vinyl-player/"><img src="https://img.shields.io/badge/Website-Live-EC4899?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Website"></a> <a href="https://github.com/technicalnihilist-lgtm/vinyl-player/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/Source-ZIP-0EA5E9?style=for-the-badge&logo=github&logoColor=white" alt="Source ZIP"></a>

</div>

---

---

## Demo

[![the app running](https://github.com/technicalnihilist-lgtm/vinyl-player/releases/download/v50.0/vinyl-player-demo.mp4)](https://github.com/technicalnihilist-lgtm/vinyl-player/releases/download/v50.0/vinyl-player-demo.mp4)

A 27-second look at the opening screen and the player: [`https://github.com/technicalnihilist-lgtm/vinyl-player/releases/download/v50.0/vinyl-player-demo.mp4`](https://github.com/technicalnihilist-lgtm/vinyl-player/releases/download/v50.0/vinyl-player-demo.mp4)

## Watch the introduction

A 2:19 introduction to the app and to Liquid Glass:
[`vinyl-player-intro-720p.mp4`](https://github.com/technicalnihilist-lgtm/vinyl-player/releases/download/v50.0/vinyl-player-intro-720p.mp4) · the 27-second demo: [`vinyl-player-demo.mp4`](https://github.com/technicalnihilist-lgtm/vinyl-player/releases/download/v50.0/vinyl-player-demo.mp4)

## The now-playing card

Android has no Dynamic Island — that is an iPhone feature. What Android gives an
app instead is a `MediaSession` and a media notification, and that is what shows
on the lock screen, in the notification shade, in the quick-settings media
player, and in the control centre Xiaomi, Realme and Honor build on top of it.

The page pushes the current song and play state across the bridge; the shell
builds the card and sends the card's buttons back into the player. Android 13 and
up ask for the notification permission the first time something is playing.

## Make it look how you want

Settings has a **Style** panel, so the player does not have to look the way it
ships. Everything in it is saved on the device and applied as CSS custom
properties, so a change re-themes the whole UI at once:

- **Accent** — eight colours, or pick any colour at all, or let the playing
  album's cover choose it for you
- **Background** — seven colour fields: Liquid Glass, Midnight, Sunset, Ocean,
  Forest, Mono, Candy
- **Glass** — a slider for how much frost the panels carry
- **Corners** — a slider from softly squared to fully round
- **Record** — six tints for the disc itself

## Privacy policy

Vinyl Player collects nothing. It is built without the `INTERNET` permission, so it
cannot open a network connection at all. The full policy is at
[docs/privacy.html](docs/privacy.html) — and live at
<https://technicalnihilist-lgtm.github.io/vinyl-player/privacy.html>.

## Publishing to Google Play

The Android build is Play-ready: it targets **API 36** (the level Play requires for
new apps since 31 August 2026) and ships as a signed **App Bundle**.

```bash
cd android
export JAVA_HOME=/path/to/jdk17 ANDROID_HOME=/path/to/android-sdk
export RELEASE_KEYSTORE=/path/to/vinyl-player-upload.jks
export RELEASE_STORE_PASSWORD=… RELEASE_KEY_ALIAS=vinylplayer RELEASE_KEY_PASSWORD=…
bash build.sh                                        # signed APK (sideload)
BUNDLETOOL=/path/to/bundletool-all-1.18.3.jar bash build-aab.sh   # .aab (Play)
```

Play takes the **`.aab`**, not the APK. The listing assets are in `docs/media/`
(the 1024×500 feature graphic) and `store/` (the phone screenshots).

## Download

**Download page:** <https://technicalnihilist-lgtm.github.io/vinyl-player/>
**All builds:** <https://github.com/technicalnihilist-lgtm/vinyl-player/releases/latest>

One player, a build for every platform — and every one of them runs offline.

| Platform | File | How |
|---|---|---|
| **Android** | `vinyl-player.apk` | Open it on the phone, allow "install unknown apps", then allow music access |
| **Windows** | `Vinyl-Player-*-setup.exe` · `*-portable.exe` | Run the installer, or run the portable `.exe` as-is |
| **macOS** | `Vinyl-Player-*.dmg` | Drag to Applications (Intel + Apple silicon) |
| **Linux** | `Vinyl-Player-*.AppImage` | `chmod +x` it and run |
| **iPhone / iPad** | — | Open the download page in Safari → Share → **Add to Home Screen** |
| **Any browser** | — | The download page installs as an app: own window, Start menu entry, offline |

Per-platform notes, including what each OS will ask you about unsigned builds,
are in **[docs/PLATFORMS.md](docs/PLATFORMS.md)**.

### Installing

1. Download `vinyl-player.apk` on your Android device.
2. Android will ask once — allow **"install unknown apps"** for your browser or
   file manager.
3. Open it and allow **music access** when asked. Your songs appear.

Requires **Android 5.0 (API 21) or newer**. Version 50.0, under 1 MB.

---

## What is in this repository

```
web/        the player itself — React + TypeScript + Vite, and an installable PWA
android/    the Android shell — a WebView, a MediaStore bridge, no Gradle
desktop/    the Electron shell for Windows, macOS and Linux
docs/       the download website (published with GitHub Pages)
store/      screenshots for the Google Play listing (1080 x 2160)
.github/    the workflow that builds every platform and publishes the site
```

The interface is written **once**, in `web/`. Android, Windows, macOS and Linux
all run that same build — so the player looks and behaves identically everywhere,
and there is no second UI to keep in sync.

### How the Android app works

The UI is the web app, served from a private `https://` origin
(`appassets.androidplatform.net`) that the app intercepts and answers from its
own assets. Your music reaches that UI two ways:

1. a JavaScript bridge (`window.AndroidBridge`) that reports the MediaStore
   contents as JSON, and
2. two intercepted routes — `/audio/<id>` and `/art/<id>` — that stream the song
   and its embedded cover art back **from the same origin**.

Serving the media from our own origin (rather than `content://`) keeps it
same-origin with the page, which is what lets the Web Audio analyser read it.

No music ships with the app. The APK contains only the UI.

---

## Build it yourself

### The web app

```bash
cd web
npm install
npm run build      # type-checks, then builds to web/dist
npm test           # unit tests
```

### The APK

Needs a **JDK 17** and an **Android SDK** with `platforms;android-34` and
`build-tools;34.0.0`. No Gradle, no Android Studio.

```bash
cd web && npm install && npm run build && cd ..
cd android
ANDROID_HOME=/path/to/android-sdk JAVA_HOME=/path/to/jdk-17 bash build.sh
## Publishing this on GitHub

### 1. Put the code on GitHub

Create an empty **public** repository called `vinyl-player` at
<https://github.com/new> — do **not** let GitHub add a README, .gitignore or
licence, this repo already has them.

Then, from this folder:

```bash
git init
git add .
git commit -m "Vinyl Player 50.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/vinyl-player.git
git push -u origin main
```

(Prefer the browser? On the empty repo page choose **uploading an existing
file**, drag everything in, and commit. The command line is easier with this
many files.)

### 2. Turn on the download website (GitHub Pages)

In the repository: **Settings → Pages**.

- **Source: Deploy from a branch**
- **Branch: `main`**, folder **`/docs`**
- **Save**

Wait a minute and your download page is live at:

```
https://YOUR-USERNAME.github.io/vinyl-player/
```

The APK is served straight from the repo at
`/vinyl-player/download/vinyl-player.apk`, so the Download button works with no
extra setup.

> **Or let the workflow do it.** Set **Source: GitHub Actions** instead. The
> included workflow builds the web app *and* the APK from source on every push
> to `main`, drops the fresh APK into the site, and deploys it. That way the
> published APK always matches the code.

### 3. Publish a release with the APK attached

```bash
git tag v43.0
git push origin v43.0
```

The workflow builds the APK and attaches it to a new **Release**, so people can
download it from `https://github.com/YOUR-USERNAME/vinyl-player/releases`.

### 4. (Optional) Put it on Google Play

The APK in this repo is signed with a **throwaway debug key** — perfect for
sideloading, not accepted by Play. For the store you need your own upload key:

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload \
        -keyalg RSA -keysize 2048 -validity 10000
```

Then either sign the built APK:

```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner sign \
  --ks upload.jks --out vinyl-player-release.apk android/build/vinyl-player.apk
```

or, more usually, upload an **Android App Bundle** to Play and let Google sign
it. Play also wants the screenshots from `store/` — they are already the right
size (1080 × 2160, a 2:1 frame, which is the tallest Play accepts).

---

## Permissions

| Permission | Why |
|---|---|
| `READ_MEDIA_AUDIO` (Android 13+) | read the device's music library |
| `READ_EXTERNAL_STORAGE` (maxSdk 32) | the same, on older releases |

There is deliberately **no `INTERNET` permission** — the app cannot reach the
network even if it wanted to. The WebView is also locked to the app's own
bundled content; every other navigation is refused.

---

## Notes and limitations

- Only files Android's media scanner has indexed are listed. If a song is
  missing, make sure it is in a normal Music folder and has been scanned.
- The APK is built and structurally verified (signature schemes v1/v2/v3, dex
  magic, manifest permissions, bundled UI, no bundled audio) and the web layer
  is covered by an automated browser suite, but it has not been run on a
  physical device by the author.
- Screenshots in `store/` were captured against a simulated device library.

## Licence

MIT — see [LICENSE](LICENSE).

---

---

## 🌍 Languages

<sub>Donations are <b>coming soon</b> in every language below — nothing to pay today, nothing to click.</sub>

<div align="center">

<sub><b>हिन्दी · বাংলা · मराठी · తెలుగు · தமிழ் · ગુજરાતી · ಕನ್ನಡ · മലയാളം · ਪੰਜਾਬੀ · ଓଡ଼ିଆ · অসমীয়া · اردو</b></sub>

</div>

<details>
<summary><b>🌍 Open the same message in 53 languages</b></summary>

**🇮🇳 Indian languages**

- **हिन्दी** (Hindi) — ☕ जल्द ही आ रहा है। · ⭐ अगर आपको यह ऐप और हमारा काम पसंद है, तो कृपया रिपॉजिटरी को स्टार दें और हमें फॉलो करें।
- **বাংলা** (Bengali) — ☕ খুব শিগগিরই আসছে। · ⭐ যদি আপনার এই অ্যাপ এবং আমাদের কাজ ভালো লাগে, তবে অনুগ্রহ করে রিপোজিটরিটিকে একটি স্টার দিন এবং আমাদের ফলো করুন।
- **मराठी** (Marathi) — ☕ लवकरच येत आहे. · ⭐ जर तुम्हाला हे ॲप आणि आमचं काम आवडलं असेल, तर कृपया रिपॉझिटरीला स्टार द्या आणि आम्हाला फॉलो करा.
- **తెలుగు** (Telugu) — ☕ త్వరలో రాబోతోంది. · ⭐ మీకు ఈ యాప్, మా పని నచ్చితే, దయచేసి రిపోజిటరీకి ఒక స్టార్ ఇచ్చి మమ్మల్ని ఫాలో అవ్వండి.
- **தமிழ்** (Tamil) — ☕ விரைவில் வருகிறது. · ⭐ உங்களுக்கு இந்த ஆப்பும் எங்க வேலையும் பிடிச்சிருந்தா, தயவுசெஞ்சு இந்த ரெபாசிட்டரிக்கு ஒரு ஸ்டார்…
- **ગુજરાતી** (Gujarati) — ☕ ટૂંક સમયમાં આવી રહ્યું છે. · ⭐ જો તમને આ એપ અને અમારું કામ ગમતું હોય, તો પ્લીઝ રિપોઝિટરીને સ્ટાર આપો અને અમને ફોલો કરો.
- **ಕನ್ನಡ** (Kannada) — ☕ ಶೀಘ್ರದಲ್ಲೇ ಬರುತ್ತಿದೆ. · ⭐ ನಿಮಗೆ ಈ ಆ್ಯಪ್ ಮತ್ತು ನಮ್ಮ ಕೆಲಸ ಇಷ್ಟವಾದರೆ, ದಯವಿಟ್ಟು ರೆಪೊಸಿಟರಿಗೆ ಸ್ಟಾರ್ ಕೊಡಿ ಮತ್ತು ನಮ್ಮನ್ನು ಫಾಲೋ ಮಾಡಿ.
- **മലയാളം** (Malayalam) — ☕ ഉടൻ വരുന്നു. · ⭐ നിങ്ങൾക്ക് ഈ ആപ്പും ഞങ്ങളുടെ പ്രവർത്തനവും ഇഷ്ടപ്പെട്ടെങ്കിൽ, ദയവായി റെപ്പോസിറ്ററിക്ക് ഒരു സ്റ്റാർ…
- **ਪੰਜਾਬੀ** (Punjabi) — ☕ ਜਲਦੀ ਆ ਰਿਹਾ ਹੈ। · ⭐ ਜੇ ਤੁਹਾਨੂੰ ਇਹ ਐਪ ਅਤੇ ਸਾਡਾ ਕੰਮ ਪਸੰਦ ਹੈ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਰਿਪੋਜ਼ਟਰੀ ਨੂੰ ਸਟਾਰ ਦਿਓ ਅਤੇ ਸਾਨੂੰ ਫਾਲੋ ਕਰੋ।
- **ଓଡ଼ିଆ** (Odia) — ☕ ଖୁବ୍ ଶୀଘ୍ର ଆସୁଛି। · ⭐ ଯଦି ଆପଣଙ୍କୁ ଏହି ଆପ୍ ଏବଂ ଆମର କାମ ଭଲ ଲାଗୁଛି, ତେବେ ଦୟାକରି ରିପୋଜିଟୋରୀକୁ ଗୋଟିଏ ଷ୍ଟାର୍ ଦିଅନ୍ତୁ ଏବଂ ଆମକୁ ଫଲୋ କରନ୍ତୁ।
- **অসমীয়া** (Assamese) — ☕ অতি সোনকালেই আহি আছে। · ⭐ যদি আপুনি এই এপটো আৰু আমাৰ কাম ভাল পায়, তেন্তে অনুগ্ৰহ কৰি ৰিপজিটৰীটোক এটা ষ্টাৰ দিয়ক আৰু আমাক ফ'ল' কৰক।
- **اردو** (Urdu) — ☕ جلد آرہا ہے۔ · ⭐ اگر آپ کو یہ ایپ اور ہمارا کام پسند آئے تو براہ کرم ریپازٹری کو سٹار دیں اور ہمیں فالو کریں۔
- **संस्कृतम्** (Sanskrit) — ☕ शीघ्रमेव आगच्छति।
- **मैथिली** (Maithili) — ☕ जल्दिये आबि रहल अछि।
- **कोंकणी** (Konkani) — ☕ रोखडेंच येता.
- **کٲشُر** (Kashmiri) — ☕ جَلدی یِوان چھُ۔
- **سنڌي** (Sindhi) — ☕ जल्द अची रह्यो आहे।
- **डोगरी** (Dogri) — ☕ जल्दी आ करदा ऐ।
- **ꯃꯤꯇꯩ ꯂꯣꯟ** (Manipuri) — ☕ ꯑꯊꯨꯕꯥ ꯃꯇꯝꯗꯥ ꯂꯥꯛꯀꯅꯤ꯫
- **बर’** (Bodo) — ☕ थाबैनो फैगोन।
- **ᱥᱟᱱᱛᱟᱲᱤ** (Santali) — ☕ ᱞᱚᱜᱚᱱ ᱦᱤᱡᱩᱜ ᱠᱟᱱᱟ᱾
- **नेपाली** (Nepali) — ☕ छिट्टै आउँदैछ। · ⭐ यदि तपाईंलाई यो एप र हाम्रो काम मन पर्‍यो भने, कृपया रिपोजिटरीलाई स्टार दिनुहोस् र हामीलाई फलो गर्नुहोस्।

**🌍 World languages**

- **العربية** (Arabic) — ☕ قريبًا. · ⭐ إذا أعجبك هذا التطبيق وعملنا، فيرجى منح المستودع نجمة ومتابعتنا.
- **简体中文** (Chinese (Simplified)) — ☕ 即将推出。
- **繁體中文** (Chinese (Traditional)) — ☕ 即將推出。
- **Čeština** (Czech) — ☕ Již brzy.
- **Dansk** (Danish) — ☕ Kommer snart.
- **Nederlands** (Dutch) — ☕ Binnenkort beschikbaar. · ⭐ Vind je deze app en ons werk leuk?
- **Filipino** (Filipino) — ☕ Malapit na.
- **Suomi** (Finnish) — ☕ Tulossa pian.
- **Français** (French) — ☕ Bientôt disponible. · ⭐ Si cette application et notre travail vous plaisent, mettez une étoile au dépôt et suivez-nous.
- **Deutsch** (German) — ☕ Bald verfügbar. · ⭐ Wenn dir diese App und unsere Arbeit gefallen, gib dem Repository einen Stern und folge uns.
- **Ελληνικά** (Greek) — ☕ Έρχεται σύντομα.
- **עברית** (Hebrew) — ☕ בקרוב.
- **Magyar** (Hungarian) — ☕ Hamarosan.
- **Bahasa Indonesia** (Indonesian) — ☕ Segera hadir. · ⭐ Jika kamu suka aplikasi ini dan karya kami, beri bintang pada repositori ini dan ikuti kami.
- **Italiano** (Italian) — ☕ In arrivo.
- **日本語** (Japanese) — ☕ 近日公開。 · ⭐ このアプリと私たちの仕事が気に入ったら、リポジトリにスターを付けてフォローしてください。
- **한국어** (Korean) — ☕ 곧 공개됩니다. · ⭐ 이 앱과 저희 작업이 마음에 드신다면 저장소에 스타를 눌러 주시고 팔로우해 주세요.
- **Bahasa Melayu** (Malay) — ☕ Akan datang.
- **Norsk** (Norwegian) — ☕ Kommer snart.
- **فارسی** (Persian) — ☕ به‌زودی.
- **Polski** (Polish) — ☕ Wkrótce. · ⭐ Jeśli podoba Ci się ta aplikacja i nasza praca, daj repozytorium gwiazdkę i obserwuj nas.
- **Português** (Portuguese) — ☕ Em breve.
- **Română** (Romanian) — ☕ În curând.
- **Русский** (Russian) — ☕ Скоро. · ⭐ Если вам нравится это приложение и наша работа, поставьте звёздочку репозиторию и подпишитесь на нас.
- **Español** (Spanish) — ☕ Muy pronto. · ⭐ Si te gusta esta app y nuestro trabajo, dale una estrella al repositorio y síguenos.
- **Kiswahili** (Swahili) — ☕ Inakuja hivi karibuni.
- **Svenska** (Swedish) — ☕ Kommer snart.
- **ไทย** (Thai) — ☕ เร็ว ๆ นี้
- **Türkçe** (Turkish) — ☕ Çok yakında.
- **Українська** (Ukrainian) — ☕ Незабаром.
- **Tiếng Việt** (Vietnamese) — ☕ Sắp ra mắt. · ⭐ Nếu bạn thích ứng dụng này và công việc của chúng tôi, hãy tặng kho lưu trữ một ngôi sao và theo…

</details>

