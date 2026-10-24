package com.hubclue.vinylplayer;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Insets;
import android.database.ContentObserver;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.MediaMetadataRetriever;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.LruCache;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.view.Display;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * A music player for the songs already on the device.
 *
 * The UI is the bundled web app, served from a private https:// origin that we
 * intercept and answer from the APK's own assets. The device's music library is
 * exposed to that UI in two ways:
 *
 *   1. a small JavaScript bridge (window.AndroidBridge) that reports the
 *      MediaStore contents as JSON, and
 *   2. two extra intercepted routes — /audio/&lt;id&gt; and /art/&lt;id&gt; — which stream
 *      the song and its embedded cover art back from our own origin.
 *
 * Serving the media from our own origin keeps it same-origin with the page, so
 * the Web Audio analyser can read it and the visualiser reacts for real.
 *
 * No music ships with the app; nothing is downloaded.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int REQ_AUDIO = 1001;

    private WebView web;
    /** Serialised library, read from the JS thread and written from the UI thread. */
    private volatile String libraryJson = "{\"permission\":\"unknown\",\"scanning\":true,\"tracks\":[]}";
    private final LruCache<String, byte[]> artCache = new LruCache<>(64);

    // ------------------------------------------------------- now playing card
    // Android has no Dynamic Island — that is an iPhone feature. The system's
    // own equivalent is a MediaSession plus a media notification, which is what
    // shows on the lock screen, in the notification shade, in the quick-settings
    // media player, and in the control centre Xiaomi, Realme and Honor build on
    // top of it.
    private static final String CHANNEL_ID = "vinyl.playback";
    private static final int NOTIFICATION_ID = 4711;
    private static final int REQ_NOTIFICATIONS = 1002;
    private MediaSession session;
    private String npTitle = "";
    private String npArtist = "";
    private String npAlbum = "";
    private boolean npPlaying = false;
    /** What the card last showed, so an unchanged push costs nothing. */
    private String lastPublished = "\u0000";
    private long npPositionMs = 0;
    private long npDurationMs = 0;
    // ------------------------------------------------------------- volume
    // HTMLMediaElement.volume is a separate knob from the phone's media volume,
    // and a WebView cannot read the system one. So the shell owns it: the app's
    // slider sets the system media volume, and a hardware volume press comes
    // back the other way, which is what "reacts to the phone's volume" means.
    private AudioManager audio;
    private ContentObserver volumeObserver;
    private double lastSystemVolume = -1;

    private final BroadcastReceiver mediaReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action != null) {
                sendToPage(action);
            }
        }
    };

    // ------------------------------------------------------------------ setup
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#05060C"));
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new LocalClient());

        // The WebView goes inside a plain holder, and the holder is what gets
        // padded. Padding the WebView directly does not reliably move the page:
        // it renders into its own bounds, so the app kept drawing under the
        // clock. A holder genuinely shrinks the WebView's box.
        FrameLayout holder = new FrameLayout(this);
        holder.setBackgroundColor(Color.parseColor("#05060C"));
        holder.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(holder);

        // Android 15 forces every app to draw edge to edge, so the window no
        // longer keeps itself clear of the status and navigation bars. Left
        // alone, the player bar ends up under the navigation bar, or a band of
        // bare window shows beneath it. Measure the bars and hand their heights
        // to the stylesheet, which pads the layout by exactly that much.
        applyEdgeToEdge();
        watchSystemBars(holder);
        setupNowPlaying();
        setupSystemVolume();

        requestHighRefreshRate();

        if (savedInstanceState == null) {
            web.loadUrl(START_URL);
        } else {
            web.restoreState(savedInstanceState);
        }

        // Ask for the music library straight away; the UI also offers a button.
        if (hasAudioPermission()) {
            scanLibraryAsync();
        } else if (Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{audioPermission()}, REQ_AUDIO);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Pick up music added while the app was in the background.
        if (hasAudioPermission()) scanLibraryAsync();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        try {
            unregisterReceiver(mediaReceiver);
        } catch (IllegalArgumentException ignored) {
            // never registered, or already gone
        }
        if (volumeObserver != null) {
            getContentResolver().unregisterContentObserver(volumeObserver);
        }
        if (web != null) {
            web.removeJavascriptInterface("AndroidBridge");
            web.destroy();
        }
        super.onDestroy();
    }

    /**
     * Ask for the display's fastest mode (e.g. 120 Hz) at the current
     * resolution, so scrolling and the animations are not pinned to 60.
     *
     * A 60 Hz panel simply has no faster mode to pick, and nothing is forced —
     * this only ever moves *up* to a mode the panel already advertises.
     */
    /**
     * Follow the display, do not fight it.
     *
     * This used to force the highest refresh mode the panel supports. That
     * ignores what the system is actually asking for, so when the system dropped
     * to 60Hz — for battery, or because "smooth display" is off — the app kept
     * pulling it back up and the two disagreed. Doing nothing is the correct
     * behaviour: Android already runs the app at whatever rate the system has
     * chosen, including 120Hz when it is set to that.
     */
    private void requestHighRefreshRate() {
        // Intentionally empty. Kept so the call site reads clearly.
    }

    // ------------------------------------------------------- system bars
    /** Draw behind the system bars — which Android 15 requires anyway. */
    private void applyEdgeToEdge() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
        } else {
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) {
            // Otherwise Android paints its own scrim behind the gesture bar and
            // the bottom of the app looks like it has a grey strip under it.
            w.setNavigationBarContrastEnforced(false);
            w.setStatusBarContrastEnforced(false);
        }
    }

    private int insetTop = -1;
    private int insetBottom = -1;

    /**
     * Keep the page clear of the system bars.
     *
     * The WebView is padded by exactly the bar heights rather than the page being
     * told about them over the bridge: the bridge call only lands after the first
     * paint, which is why the topbar used to end up underneath the clock. Padding
     * the view is immediate and cannot be missed.
     */
    private void watchSystemBars(View holder) {
        holder.setOnApplyWindowInsetsListener((view, insets) -> {
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                top = bars.top;
                bottom = bars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            if (top != insetTop || bottom != insetBottom) {
                insetTop = top;
                insetBottom = bottom;
                view.setPadding(0, top, 0, bottom);
            }
            // The bars are accounted for by the padding, so the WebView itself
            // keeps the whole window and nothing is left uncovered.
            if (Build.VERSION.SDK_INT >= 30) {
                return WindowInsets.CONSUMED;
            }
            return insets.consumeSystemWindowInsets();
        });
        holder.requestApplyInsets();
    }

    // ------------------------------------------------------------- volume
    private void setupSystemVolume() {
        audio = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (audio == null) {
            return;
        }
        volumeObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
            @Override
            public void onChange(boolean selfChange) {
                pushSystemVolume();
            }
        };
        getContentResolver().registerContentObserver(
                Settings.System.getUriFor("volume_music"), false, volumeObserver);
        pushSystemVolume();
    }

    private double systemVolumeFraction() {
        int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        if (max <= 0) {
            return 1;
        }
        return (double) audio.getStreamVolume(AudioManager.STREAM_MUSIC) / max;
    }

    /** Hand the phone's media volume to the page, which moves its slider to match. */
    private void pushSystemVolume() {
        final double f = systemVolumeFraction();
        if (Math.abs(f - lastSystemVolume) < 0.001) {
            return;
        }
        lastSystemVolume = f;
        web.post(() -> web.evaluateJavascript(
                "window.vinylNative && window.vinylNative.systemVolume"
                        + " && window.vinylNative.systemVolume(" + f + ")", null));
    }

    // ---------------------------------------------------------- now playing
    /** The session the system media controls are attached to. */
    private void setupNowPlaying() {
        session = new MediaSession(this, "VinylPlayer");
        session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
                | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                sendToPage("play");
            }

            @Override
            public void onPause() {
                sendToPage("pause");
            }

            @Override
            public void onSkipToNext() {
                sendToPage("next");
            }

            @Override
            public void onSkipToPrevious() {
                sendToPage("previous");
            }

            @Override
            public void onStop() {
                sendToPage("pause");
            }
        });
        session.setActive(true);

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Now playing", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("The song that is playing");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

        // The buttons on the media card come back here, then straight into the page.
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.hubclue.vinylplayer.PLAY");
        filter.addAction("com.hubclue.vinylplayer.PAUSE");
        filter.addAction("com.hubclue.vinylplayer.NEXT");
        filter.addAction("com.hubclue.vinylplayer.PREV");
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(mediaReceiver, filter, RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(mediaReceiver, filter);
        }
    }

    /** Calls back into the page so the media buttons drive the real player. */
    private void sendToPage(String action) {
        runOnUiThread(() -> web.evaluateJavascript(
                "window.vinylNative && window.vinylNative.mediaAction"
                        + " && window.vinylNative.mediaAction('" + action + "')", null));
    }

    private PendingIntent actionIntent(String action) {
        Intent i = new Intent("com.hubclue.vinylplayer." + action);
        i.setPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(this, action.hashCode(), i, flags);
    }

    /**
     * Build the card from whatever the page last told us. Called on every track
     * change and every play/pause, so the system controls always match the app.
     */
    private void publishNowPlaying() {
        MediaMetadata.Builder meta = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, npTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, npArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, npAlbum)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, Math.max(0, npDurationMs));
        session.setMetadata(meta.build());

        session.setPlaybackState(new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                        | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT
                        | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO)
                .setState(npPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        Math.max(0, npPositionMs), npPlaying ? 1f : 0f)
                .build());

        // Rebuilding and re-posting the notification is not free, and the page
        // can push several times a second. If nothing the card shows has
        // changed, leave it alone.
        String visible = npTitle + "\u0000" + npArtist + "\u0000" + npAlbum + "\u0000" + npPlaying;
        if (visible.equals(lastPublished)) {
            return;
        }
        lastPublished = visible;

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                != PackageManager.PERMISSION_GRANTED) {
            // Ask the first time something is actually playing, which is the
            // moment the card becomes useful.
            if (npPlaying) {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},
                        REQ_NOTIFICATIONS);
            }
            return;
        }

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        // Resolved by name rather than through R: this project compiles its Java
        // with javac before aapt2 has generated R, so R is not on the classpath.
        int smallIcon = getResources().getIdentifier("ic_note", "drawable", getPackageName());
        if (smallIcon == 0) {
            smallIcon = getApplicationInfo().icon;
        }
        b.setSmallIcon(smallIcon)
                .setContentTitle(npTitle.isEmpty() ? "Vinyl Player" : npTitle)
                .setContentText(npArtist.isEmpty() ? "" : npArtist)
                .setSubText(npAlbum.isEmpty() ? null : npAlbum)
                .setOngoing(npPlaying)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(PendingIntent.getActivity(this, 0,
                        new Intent(this, MainActivity.class),
                        (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
                                | PendingIntent.FLAG_UPDATE_CURRENT))
                .addAction(new Notification.Action.Builder(null, "Previous",
                        actionIntent("PREV")).build())
                .addAction(new Notification.Action.Builder(null, npPlaying ? "Pause" : "Play",
                        actionIntent(npPlaying ? "PAUSE" : "PLAY")).build())
                .addAction(new Notification.Action.Builder(null, "Next",
                        actionIntent("NEXT")).build())
                .setStyle(new Notification.MediaStyle()
                        .setMediaSession(session.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify(NOTIFICATION_ID, b.build());
    }

    // ------------------------------------------------------------ permissions
    private String audioPermission() {
        return Build.VERSION.SDK_INT >= 33
                ? "android.permission.READ_MEDIA_AUDIO"
                : Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT < 23) return true; // granted at install time
        return checkSelfPermission(audioPermission()) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_AUDIO) scanLibraryAsync();
    }

    // -------------------------------------------------------------- the library
    private void scanLibraryAsync() {
        new Thread(() -> {
            final String json = buildLibraryJson();
            runOnUiThread(() -> {
                libraryJson = json;
                pushLibrary();
            });
        }, "library-scan").start();
    }

    private String buildLibraryJson() {
        if (!hasAudioPermission()) {
            return "{\"permission\":\"denied\",\"tracks\":[]}";
        }

        JSONArray tracks = new JSONArray();
        String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
        };

        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    MediaStore.Audio.Media.IS_MUSIC + " != 0",
                    null,
                    MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC");

            if (cursor != null) {
                int idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID);
                int titleCol = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                int durationCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);

                while (cursor.moveToNext()) {
                    if (idCol < 0) break;
                    JSONObject o = new JSONObject();
                    o.put("id", String.valueOf(cursor.getLong(idCol)));
                    o.put("title", orEmpty(titleCol >= 0 ? cursor.getString(titleCol) : null));
                    o.put("artist", orEmpty(artistCol >= 0 ? cursor.getString(artistCol) : null));
                    o.put("album", orEmpty(albumCol >= 0 ? cursor.getString(albumCol) : null));
                    long ms = durationCol >= 0 ? cursor.getLong(durationCol) : 0L;
                    o.put("duration", ms / 1000.0);
                    // We don't know whether a file carries a picture without
                    // opening it, so claim art and let the UI fall back to its
                    // generated cover if /art/<id> has nothing to send.
                    o.put("hasArt", true);
                    tracks.put(o);
                }
            }
        } catch (Exception ignored) {
            // Unreadable library — report what we have rather than crashing.
        } finally {
            if (cursor != null) cursor.close();
        }

        try {
            JSONObject root = new JSONObject();
            root.put("permission", "granted");
            root.put("tracks", tracks);
            return root.toString();
        } catch (Exception e) {
            return "{\"permission\":\"granted\",\"tracks\":[]}";
        }
    }

    private static String orEmpty(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        if (trimmed.isEmpty() || "<unknown>".equalsIgnoreCase(trimmed)) return "";
        return trimmed;
    }

    /** Tell the page that the library changed. */
    private void pushLibrary() {
        if (web == null) return;
        web.post(() -> web.evaluateJavascript(
                "window.vinylNative && window.vinylNative.refresh()", null));
    }

    private void openAppSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {
            // Nothing to open — stay put.
        }
    }

    /**
     * The app is fully offline: the WebView is only ever allowed to load our own
     * bundled content. Anything else is refused outright rather than opened.
     */
    private boolean blockExternal(Uri url) {
        return url == null || !HOST.equals(url.getHost());
    }

    // ------------------------------------------------------------------ bridge
    public class Bridge {
        @JavascriptInterface
        public String getLibrary() {
            return libraryJson;
        }

        @JavascriptInterface
        public boolean isAndroid() {
            return true;
        }

        @JavascriptInterface
        public void refresh() {
            runOnUiThread(MainActivity.this::scanLibraryAsync);
        }

        @JavascriptInterface
        public void requestPermission() {
            runOnUiThread(() -> {
                if (hasAudioPermission()) {
                    scanLibraryAsync();
                } else if (Build.VERSION.SDK_INT >= 23) {
                    requestPermissions(new String[]{audioPermission()}, REQ_AUDIO);
                }
            });
        }

        /**
         * Called by the page whenever the song or the play state changes. The
         * payload is the same shape the player already uses: title, artist,
         * album, playing, position and duration.
         */
        @JavascriptInterface
        public void nowPlaying(String json) {
            try {
                JSONObject o = new JSONObject(json);
                npTitle = o.optString("title", "");
                npArtist = o.optString("artist", "");
                npAlbum = o.optString("album", "");
                npPlaying = o.optBoolean("playing", false);
                npPositionMs = o.optLong("position", 0);
                npDurationMs = o.optLong("duration", 0);
            } catch (Exception e) {
                return;
            }
            runOnUiThread(MainActivity.this::publishNowPlaying);
        }

    /** The page asks for a level; that becomes the phone's media volume. */
    @JavascriptInterface
    public void setSystemVolume(double fraction) {
        if (audio == null) {
            return;
        }
        int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        double clamped = Math.max(0, Math.min(1, fraction));
        int level = (int) Math.round(clamped * max);
        lastSystemVolume = max > 0 ? (double) level / max : 1;
        audio.setStreamVolume(AudioManager.STREAM_MUSIC, level, 0);
    }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(MainActivity.this::openAppSettings);
        }
    }

    // ------------------------------------------------------- content serving
    private class LocalClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (url == null || !HOST.equals(url.getHost())) return null;
            if (!"GET".equalsIgnoreCase(request.getMethod())) return null;

            String path = url.getPath();
            if (path == null || path.isEmpty()) path = "/index.html";

            if (path.startsWith("/audio/")) {
                return serveAudio(Uri.decode(path.substring("/audio/".length())), request.getRequestHeaders());
            }
            if (path.startsWith("/art/")) {
                return serveArt(Uri.decode(path.substring("/art/".length())));
            }
            if ("/".equals(path)) path = "/index.html";
            return serveAsset(path, request.getRequestHeaders());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return blockExternal(request.getUrl());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return blockExternal(Uri.parse(url));
        }
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    /** Stream a song straight out of the device's media store, with range support. */
    private WebResourceResponse serveAudio(String id, Map<String, String> reqHeaders) {
        ParcelFileDescriptor pfd = null;
        try {
            long numericId = Long.parseLong(id);
            Uri uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, numericId);
            pfd = getContentResolver().openFileDescriptor(uri, "r");
            if (pfd == null) return notFound();

            long total = pfd.getStatSize();
            InputStream raw = new ParcelFileDescriptor.AutoCloseInputStream(pfd);

            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");

            if (total > 0) {
                long start = 0L;
                long end = total - 1;
                boolean ranged = false;

                String range = reqHeaders == null ? null : reqHeaders.get("Range");
                if (range != null && range.startsWith("bytes=")) {
                    String spec = range.substring(6).trim();
                    int dash = spec.indexOf('-');
                    if (dash >= 0) {
                        String a = spec.substring(0, dash).trim();
                        String b = spec.substring(dash + 1).trim();
                        try {
                            if (!a.isEmpty()) start = Long.parseLong(a);
                            if (!b.isEmpty()) end = Long.parseLong(b);
                        } catch (NumberFormatException nfe) {
                            start = 0L;
                            end = total - 1;
                        }
                        if (start < 0) start = 0;
                        if (start >= total) start = total - 1;
                        if (end >= total || end < start) end = total - 1;
                        ranged = true;
                    }
                }

                skipFully(raw, start);
                long length = end - start + 1;

                if (ranged) {
                    headers.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
                    headers.put("Content-Length", Long.toString(length));
                    return new WebResourceResponse("audio/mpeg", null, 206, "Partial Content",
                            headers, new BoundedStream(raw, length));
                }
                headers.put("Content-Length", Long.toString(total));
                return new WebResourceResponse("audio/mpeg", null, 200, "OK",
                        headers, new BoundedStream(raw, total));
            }

            return new WebResourceResponse("audio/mpeg", null, raw);
        } catch (Exception e) {
            if (pfd != null) {
                try {
                    pfd.close();
                } catch (IOException ignored) {
                    // already closed
                }
            }
            return notFound();
        }
    }

    /** The cover art embedded in the file itself, if there is any. */
    private WebResourceResponse serveArt(String id) {
        byte[] art = artCache.get(id);
        if (art == null) {
            art = readEmbeddedArt(id);
            if (art != null && art.length > 0) artCache.put(id, art);
        }
        if (art == null || art.length == 0) return notFound();

        boolean isPng = art.length > 8
                && (art[0] & 0xFF) == 0x89 && art[1] == 'P' && art[2] == 'N' && art[3] == 'G';

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Length", Integer.toString(art.length));
        headers.put("Cache-Control", "max-age=86400");
        return new WebResourceResponse(isPng ? "image/png" : "image/jpeg", null, 200, "OK",
                headers, new ByteArrayInputStream(art));
    }

    private byte[] readEmbeddedArt(String id) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            long numericId = Long.parseLong(id);
            Uri uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, numericId);
            retriever.setDataSource(this, uri);
            return retriever.getEmbeddedPicture();
        } catch (Exception e) {
            return null;
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
                // nothing to release
            }
        }
    }

    /** Files bundled inside the APK (the web UI itself). */
    private WebResourceResponse serveAsset(String path, Map<String, String> reqHeaders) {
        AssetManager am = getAssets();
        String assetPath = "www" + path;

        long total = -1L;
        try (AssetFileDescriptor afd = am.openFd(assetPath)) {
            total = afd.getLength();
        } catch (IOException ignored) {
            // Compressed or missing; fall through to a plain stream.
        }

        try {
            InputStream raw = am.open(assetPath, AssetManager.ACCESS_RANDOM);
            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");

            if (total > 0) {
                long start = 0L;
                long end = total - 1;
                boolean ranged = false;

                String range = reqHeaders == null ? null : reqHeaders.get("Range");
                if (range != null && range.startsWith("bytes=")) {
                    String spec = range.substring(6).trim();
                    int dash = spec.indexOf('-');
                    if (dash >= 0) {
                        String a = spec.substring(0, dash).trim();
                        String b = spec.substring(dash + 1).trim();
                        try {
                            if (!a.isEmpty()) start = Long.parseLong(a);
                            if (!b.isEmpty()) end = Long.parseLong(b);
                        } catch (NumberFormatException nfe) {
                            start = 0L;
                            end = total - 1;
                        }
                        if (start < 0) start = 0;
                        if (start >= total) start = total - 1;
                        if (end >= total || end < start) end = total - 1;
                        ranged = true;
                    }
                }

                skipFully(raw, start);
                long length = end - start + 1;

                if (ranged) {
                    headers.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
                    headers.put("Content-Length", Long.toString(length));
                    return new WebResourceResponse(mimeFor(path), null, 206, "Partial Content",
                            headers, new BoundedStream(raw, length));
                }
                headers.put("Content-Length", Long.toString(total));
                return new WebResourceResponse(mimeFor(path), null, 200, "OK",
                        headers, new BoundedStream(raw, total));
            }

            return new WebResourceResponse(mimeFor(path), null, raw);
        } catch (IOException e) {
            return notFound();
        }
    }

    private static long skipFully(InputStream in, long n) throws IOException {
        long remaining = n;
        while (remaining > 0) {
            long skipped = in.skip(remaining);
            if (skipped <= 0) {
                if (in.read() == -1) break;
                remaining--;
            } else {
                remaining -= skipped;
            }
        }
        return n - remaining;
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".m4a") || p.endsWith(".aac")) return "audio/mp4";
        if (p.endsWith(".ogg") || p.endsWith(".opus")) return "audio/ogg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    /** A read-only view of `in` limited to `limit` bytes. */
    private static class BoundedStream extends FilterInputStream {
        private long remaining;

        BoundedStream(InputStream in, long limit) {
            super(in);
            this.remaining = limit;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = super.read();
            if (b != -1) remaining--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int toRead = (int) Math.min(len, remaining);
            int r = super.read(b, off, toRead);
            if (r > 0) remaining -= r;
            return r;
        }

        @Override
        public long skip(long n) throws IOException {
            long s = super.skip(Math.min(n, remaining));
            remaining -= s;
            return s;
        }

        @Override
        public int available() throws IOException {
            return (int) Math.min(super.available(), remaining);
        }
    }
}
