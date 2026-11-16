# Changelog

Every change to Vinyl Player is committed here, in the same breath as the change
itself. There is no separate release step to forget: if a fix is made, it is on
GitHub. The version number below is the one the app reports in
**Settings → More → About**, and the one stamped into the Android manifest.

---

## 153 — 16 November 2026

**Picking the same folder twice added every song in it a second time.**

"Add files" and "Add a folder" hand over whatever was picked, and every song was
given an id stamped with the moment of the import — `import-<time>-<n>`. The
playlist's duplicate check compares ids, so it never had anything to compare: two
imports of one folder produced two ids for every file, and both were added. The
list doubled. The hearts given to the first copies no longer matched the second.
And the import paid for a metadata read per file to discover a duration it had
already discovered the first time — six hundred files, six hundred decoder opens,
to learn nothing.

A file is now identified by the three things that make it that file: its name,
its size, and when it was last written. They are already on the `File` object the
picker handed over, so reading them costs nothing, and they survive being picked
again. The check happens before anything is opened, so a repeated import of a
folder is a few hundred string comparisons rather than a few hundred metadata
reads. A file that appears twice inside one selection is kept once, too.

Measured with a stand-in picker: the same three files imported twice left **six
rows and six metadata reads before, three rows and three reads after** — and the
second pick of the same folder now reads nothing at all.

Five tests cover it: the key is stable for the same file, separates files that
differ in name, size or date, only imported songs are collected, a repeated
folder adds nothing, only the genuinely new file survives a mixed pick, and a
file that appears twice in one pick is kept once.

## 152 — 15 November 2026

**Dragging the volume slider told the phone's audio system thirty times a second.**

Inside the Android shell the slider does not drive the element — it drives the
phone's media volume, so that the app's slider and the hardware keys are the same
knob. Every report of the drag went straight across the bridge: a call into the
shell, a write to the media stream, a callback from the volume observer coming back
the other way, and a state update to draw a level the finger had already moved past.
A slider reports on every `input` *and* every `change`, far more often than the
screen refreshes, so one drag was dozens of those round trips — thirty of them for
thirty reports, measured.

The newest level is kept and handed over on the next frame, which is the same thing
133 and 134 did for the list and 101 did for the seek bar: at most one write a frame,
whatever the input is doing. The last report always schedules that frame, so the
level the drag ends on is always the level the phone gets.

Measured with the app driven headlessly against a stand-in bridge, one drag of thirty
reports: **thirty bridge calls before, one after** — and the same final level, 0.68,
on both sides.

This release also adds the Play Store changelog for 152.

## 151 — 15 November 2026

**The now-playing position was copied into a ref on every render.**

The media card must be told the position without being told about the clock: the
position lands in the player state four or five times a second, and an effect that
depended on it pushed the song across the bridge just as often, which made the shell
rebuild and re-post its notification that often. So the position was copied into a
ref by an effect with no dependencies — one that therefore ran after every render,
four or five times a second, to write two numbers that were only ever read on the
handful of occasions the card is actually told something.

It is read from the audio element when the card is told, which is the same number
from the thing that is actually playing, and is right after a scrub — the state does
not follow a scrub, so the old copy could publish a position the listener had
already dragged away from. The per-render effect is gone.

Verified by driving the app headlessly with a stand-in bridge and diffing every
payload the page hands it: before and after, the same four messages, field for field.

## 150 — 15 November 2026

**A song that failed once could not be played again for the rest of the session.**

The audio element is given the next track's source as soon as the track becomes
active, and it fetches the metadata for it. If that fetch fails — a file the
provider no longer has, a card pulled out mid-scan, a decoder that cannot read the
file — the element is left holding the resource that failed, and `play()` on it
fails the same way every time after that. Pressing play again did nothing at all:
no new request, no sound, the same error message. The only way back was to move to
another song and return to this one, which nobody thinks to do when the answer looks
like "press play again".

Before the play, an element that is carrying an error is handed its source once
more, so the press is a real retry: it asks for the file again and plays it if it
arrives. A file that is genuinely unreadable fails again, one request per press.

Measured with the app driven headlessly and the shell answering the first request
for a track with a 500: before, the first press left the element in media error 4
with **one** request made and no way forward; after, the same press makes the second
request, clears the error and plays — 1.13 seconds of audio in, the track is running.

## 149 — 15 November 2026

**A rescan that found one new song re-rendered the whole library.**

The shell rescans the phone's music every time the app comes back to the
foreground, and the page maps the whole payload again — a fresh `Track` object for
every song, each with its own getters over its own closures. `TrackRow` is memoised
on the props it is given and the track is one of them, so a rescan that found one
song added, or one title edited, or one file deleted, was a new object for every
song: five thousand rows re-rendered on a full phone — five thousand `formatTime`
calls, five thousand element trees reconciled — to draw a list in which one row was
different. Unlock the phone and the app paid that.

A song whose own fields have not changed is handed back as the object it already
was, so React skips every row but the one that changed. The comparison is over
everything a row draws and everything the getters close over — title, artist, album,
source URL, duration, palette, and the picture claim, which is read back off the
track's own `artwork`/`fallbackArt` rather than stored twice. The covers a track had
already worked out come with it, because they live in that object's closure.

Five tests cover it: an unchanged rescan returns the same objects, an edited title
replaces only that one song, a track's cover survives, a changed picture claim
replaces the song either way, and a scan with nothing to reuse still builds new
objects.

## 148 — 15 November 2026

**A file with no cover was asked for its cover again every time its row came back.**

A row remembers that its own cover failed to load, which is enough while the row
stays mounted. Rows do not stay mounted: narrowing the search unmounts the ones that
stop matching, clearing it mounts them again, and every one of those new rows asked
the shell for the cover of a file that had already said it has none. Most files on a
phone carry no picture, so this was the common path, not the rare one — and the
request is not free even though it is answered from the shell's cache: a request
into the native layer, an `<img>` built to receive a 404, and a re-render to hide it.

Whether a file has a cover is a property of the file, not of the row, so it is
remembered beside them now, in one set for the page. Measured on a sixty-song
library whose files carry no art, driven headlessly: one search and one clear cost
**77 requests before, 60 after** — 49 extra requests became 32, and 60 is exactly
one per file. No file is asked twice.

## 147 — 15 November 2026

**Escape did not close the settings sheet.**

The sheet announces itself as a modal dialog, dims the player behind a scrim, and
closes when that scrim is tapped. The key that every dialog in every other app
answers — Escape — did nothing. The only ways out were the scrim, the cross in the
header and the Done button at the bottom, so a keyboard user who opened it by
mistake had to tab through the whole panel to reach one of them, and the sheet
stayed over the player until they did.

It closes on Escape now, from a listener that exists only while the sheet is open
so a stray Escape on the player itself still belongs to the browser. Measured with
the app driven headlessly: the sheet is open, Escape is pressed, and it is closed —
where before it was still open after the same press.

## 146 — 15 November 2026

**Tab walked into the settings sheet while it was closed.**

The sheet slides down out of the window when it is dismissed, and it is taken out
of the pointer's way with `pointer-events: none`. That stops a thumb. It does not
stop a Tab key: the buttons inside the closed sheet are still in the document, so
they are still in the tab order. Counted, on the app with a playlist open: **35 of
the 75 tab stops were inside the closed sheet** — Close, six switches, every accent
swatch, the mood buttons, three sliders, the record colours, Done and Reset.

So a keyboard user tabbing across the player left the visible interface after the
last transport button and walked through a panel that was off the bottom of the
screen, where Enter toggled a setting they could not see. `aria-hidden` was already
on the layer and does not affect focus.

The layer is `visibility: hidden` while it is closed, which takes the whole subtree
out of the tab order and out of the paint, with the change delayed by 0.32s so the
sheet finishes its slide first — and cancelled the moment it opens, so the slide up
is exactly what it was. Same 40 visible tab stops as before, and the sheet's box
and pixels are unchanged (measured: same rect, same screenshot).

## 145 — 15 November 2026

**The visualiser clamped every bar three times a frame.**

137 took the `Math.pow` out of the reflection pass by working out the bars' heights
once and sharing them. It left the clamp behind: `Math.min(1, levels[i])` was still
called in the pass that builds the heights, again in the body pass, and again in the
reflection — three times per bar, a hundred and eight calls a frame, thirty frames
a second, to arrive at one number per bar.

The clamped level is written into a table alongside the height now, in the pass that
already reads it, and both drawing passes read it from there. Same clamp, same
value, same pixels; three thousand fewer `Math.min` calls a second.

## 144 — 15 November 2026

**One corrupted key in the store could take the whole theme away.**

The style is read back from the local store one field at a time, and the check for
the background mood and the record's disc was `p.mood in MOODS`. That is true for
every key an object inherits as well as the ones it has: `constructor`, `toString`,
`hasOwnProperty`, `valueOf`. So a store holding `{"mood":"constructor"}` — a
half-written entry, a hand-edited one, or anything that ever writes to the same
key — was accepted, and `MOODS['constructor']` is a function.

`styleVars` then read `a`, `b`, `c` and the three blob colours off that function,
all of them `undefined`, and handed the stylesheet `--bg-a: undefined` and friends.
The app did not crash: it painted with no background colours at all, and the only
way back was to find the Style panel and press Reset — which, since the style it
compared against was the poisoned one, did not look like it was needed.

Both tables are checked for the key they actually own now, so a value the app does
not understand is dropped and the default kept. Reading a stored style is a pure
exported function too, `parseStyle`, so the rules can be tested without a store:
four tests cover a round trip, the six shapes that are not a style at all, a field
of the wrong type being dropped on its own, and the four inherited keys that used
to poison the theme.

## 143 — 15 November 2026

**Pressing Next on the last song told the bar the song had restarted.**

With repeat off, the end of the list is the end of the list: `step()` answers a
Next there by staying exactly where it is, and a Previous at the first track does
the same. The reducer turned that answer into a new state anyway — `currentTime:
0`, a fresh `nonce`, the status of a track that is loading.

Nothing moves the audio element in that case. The play effect only seeks when the
element has ended, which it has not, so the song carried on from where it was
while the state said 0:00 — the bar snapped back to the start of the song, and
snapped forward again a quarter of a second later when the next `timeupdate`
arrived. On a phone that reads as a restart that never happened.

A step that resolves to the track already playing now returns the state it was
given, which is both the truth and one fewer re-render of the whole app. Six tests
cover it: Next at the end and Previous at the start are no-ops, a real step still
moves and still zeroes the position, both directions still wrap with repeat on,
and a one-song library still answers Next with nothing.

## 142 — 12 November 2026

**The art cache was bounded by count, and never remembered a miss.**

Covers are read out of the files and kept in an `LruCache` of sixty-four
*entries*. A cover is often 200–500 KB, so sixty-four of them is up to twenty
megabytes of the app's heap held for artwork that has been scrolled past — a count
says nothing about how much memory that is.

And a file with no embedded picture was never remembered at all: only a hit was
cached, so every request for a track without art re-opened the file and ran
`MediaMetadataRetriever` over it again to discover, again, that there was nothing
to send. Most files on a phone carry no embedded art, so that was the common path,
not the rare one.

The cache is bounded by bytes now — eight megabytes of artwork, whatever that is
in covers — and remembers the files that have none, so each is read once.

This release also adds the Play Store changelog for 142.

## 141 — 12 November 2026

**Seeking into a song read the file one byte at a time.**

Serving a range request means positioning the stream at the byte the player asked
for. The skip fell back to `in.read()` — a single byte — whenever
`InputStream.skip` returned nothing, and a `ParcelFileDescriptor` stream is exactly
the kind that does: it is a pipe, not a file, and it has no position to seek to. So
seeking to five minutes into a ten-megabyte track performed five million
single-byte reads before the first sample came back, and the seek took as long as
the file was big.

The fallback reads through an eight-kilobyte buffer, so the same seek costs a few
hundred reads. The bytes handed to the player are identical and in the same order;
only the number of calls needed to reach them changes.

## 140 — 12 November 2026

**Every cold start scanned the library twice.**

`onCreate` asks for a scan, and `onResume` asks for another — and `onCreate` is
always followed by `onResume`, so opening the app ran two full MediaStore queries
and built the whole library JSON twice, the second starting while the first was
still reading, for a list that could not have changed in between. On a large
library that is the most expensive thing the app does on launch, and it was paid
twice.

One scan runs at a time now. A request that arrives during a scan is remembered
and run once the running one has published, so a permission granted mid-scan, or
a refresh the listener asked for, is still honoured — it waits instead of racing.

## 139 — 12 November 2026

**The offline shell precached 374 KB of icons the page never reads.**

Installing the service worker downloaded and wrote every file in its shell list:
the two icons the page itself asks for, and the three 512-pixel launcher icons
that only the operating system reads — 179 KB, 167 KB and 37 KB of PNG stored on
the device at install time for something no page load ever requests.

The two the page uses stay in the shell. The launcher icons are still cached, by
the same fetch handler, the first time the browser asks for them while installing
the app. Nothing about installing or running the app changes; there is just less
written on the first launch.

## 138 — 12 November 2026

**Reading the phone's library built a string per song just to hash it.**

A device track's palette is chosen from `hashOf(title + artist)`. On a library of
three thousand songs that is three thousand concatenated strings allocated during
the scan — each one immediately garbage — to arrive at a number that is simply the
character codes of the two strings one after the other, which is exactly what the
hash walks.

`hashOfPair` walks them in turn and allocates nothing. The palette a song gets is
unchanged, which a test now pins: the same title and artist still land in the same
one of the eight.

## 137 — 12 November 2026

**The visualiser worked out every bar's height twice a frame.**

Each frame draws the bars and then their reflection, and both passes asked for the
same number: `Math.min(1, level)` and `Math.pow(level, 0.82) * maxH`. So the
reflection re-derived, for all thirty-six bars, a height the body pass had
computed a moment earlier — thirty-six `Math.pow` calls and seventy-two clamps a
frame, at thirty frames a second, to arrive at numbers that were already in hand.

The heights are worked out once a frame into a table the two passes share. The
pixels are identical — the same numbers raised to the same power — and the
reflection now costs one multiply per bar.

## 136 — 12 November 2026

**Every heart tap copied the whole likes map to store it.**

The effect that saves the hearts passed `likedEntries(state.liked)` to the writer,
which walks the map and builds a second one holding only the entries that are
`true`. Since 131 an un-like removes its key, so `liked` already holds exactly
that — the copy was an object as large as the list of liked songs, built on every
tap, to produce the blob `JSON.stringify` was about to walk anyway.

`state.liked` is handed to the writer directly. The stored JSON is byte for byte
what it was, because the map it is written from already contained nothing else.

## 135 — 12 November 2026

**Scrolling the list with a wheel measured the panel on every pointer frame.**

`scroll` does not bubble, so the glass surface caught it on the window — which
also caught the playlist's own scrolling. Scrolling the list with a wheel is
exactly when the pointer is over the panel and moving, so every scroll event threw
away the panel's cached box, and the next pointer frame measured it again with
`getBoundingClientRect` — right after two custom properties had been written to
the surface, which is a forced style recalc and layout, on every frame of the
scroll.

A scroll that happens *inside* the surface cannot move the surface, and the panel
never scrolls itself — the list inside it does — so those are ignored now. A
scroll of the page, a resize, and a change in the surface's own size still forget
the box, and the highlight still follows the pointer from the same rectangle.

## 134 — 12 November 2026

**Dragging the list with a mouse scrolled it more than once a frame.**

The mouse drag that scrolls the playlist wrote `scrollTop` on every
`pointermove`. A mouse reports far more often than the screen refreshes, so one
frame of a drag could carry several synchronous scroll writes — each of them a
scroll of a list thousands of rows tall, all but the last thrown away before
anything was painted.

The newest position is recorded and applied once a frame now, and the position the
drag ended on is applied immediately on release, so the list cannot stop a frame
short of the pointer. The drag still scrolls to exactly where it scrolled to
before; there are just fewer writes on the way.

## 133 — 12 November 2026

**Pressing play rebuilt every row in the list.**

`isPlaying` was handed to every row, and a row's props are what decide whether
React skips it — so a new value re-rendered all of them: on a full phone, five
thousand rows rebuilt to draw one equaliser. Only the playing row draws anything
from it; every other row used it for nothing at all.

The list now passes it to the row it belongs to and leaves the rest with `false`,
which is what they were already drawing. A play or a pause re-renders the playing
row and nothing else. The markup is unchanged: the equaliser still animates on the
playing row, and only there.

## 132 — 11 November 2026

**The playlist ran a highlight nothing in it drew.**

The glass surfaces carry a specular highlight that follows the pointer: `useSheen`
tracks the pointer and writes its position into `--mx` and `--my` on the surface,
at most once a frame. The panel has one. The list inside it was given the same
treatment — and nothing in the list reads either property. The only rule that uses
them is the glass surface's own highlight, and the list is not glass and contains
none.

So every pointer move across the playlist wrote two inherited custom properties on
the list, which invalidates the style of everything under it — every row, thousands
of them on a full phone — to move a highlight that does not exist there. The hook
is gone from the list; the panel still tracks the pointer, which is where the
highlight is actually drawn. The pixels are identical, because nothing was drawing
them from the list in the first place.

This release also adds the Play Store changelog for 132.

## 131 — 11 November 2026

**Un-liking a song kept a key for it forever.**

A like was stored as a boolean per song, so un-liking wrote `false` rather than
removing anything. The map therefore grew with every song that had ever been
tried, not with the songs that are liked: like a song, change your mind, and the
key stayed, in memory and — until the next save dropped it — in storage as well.

`liked` is copied on every tap, handed to the playlist on every render and
serialised on every save, so a listener who had worked through a few thousand songs
carried a map that was mostly the word "false". Un-liking removes the key now, so
the map holds exactly the songs that are liked — which is what the stored blob has
always contained, and what every reader already assumed.

Three tests cover it: a like marks the song, an un-like leaves nothing behind, and
the songs that are still liked keep their hearts.

## 130 — 11 November 2026

**Any key dismissed the splash, including Tab.**

The opening screen is a button — press it and it goes — so it listens for a key
press as well as a tap. It left on *any* key: Tab, Shift, a stray letter, a
modifier. Pressing Tab to move the focus onto the GitHub link on that screen
dismissed the screen instead, and took the focus with it, so the one link on it
could not be reached from a keyboard at all.

It leaves on Enter and Space now, which is what activating a button means, and
ignores everything else. The tap-to-leave behaviour, and the timer that leaves on
its own, are untouched.

## 129 — 11 November 2026

**Every song's cover was built before the first row could be drawn.**

A device track carries two covers: the picture inside the file, served from the
app's own origin, and a procedural gradient to fall back on when there is no
picture — which is most of the time. Both were built while the library was being
read, for every song on the phone.

The gradient is about three hundred characters of CSS worked out from a hash and
five multiplications, and the artwork URL is a concat and an `encodeURIComponent`.
On a library of three thousand songs that is six thousand strings — well over a
megabyte of them — built during the scan, before a single row was on screen, for
covers that only the dozen rows in view ever read. Each is now built the first
time something asks for it, and the same string is answered afterwards. The
library arrives sooner and the heap holds the covers of the rows that exist.

The picture itself is unchanged, and so is the fallback: the same gradient from
the same hash, drawn by the same CSS.

## 128 — 11 November 2026

**Every row rebuilt its length twice, from scratch, on every render.**

`formatTime` is the busiest function in the interface: every row of the playlist
draws the length of its song — once beside the title, once inside the label a
screen reader reads — and the seek bar draws two more. Each call built its answer
from nothing: two `Math.floor`s, a `String`, a `padStart` and a template literal.
On a library of a few thousand songs that is a few thousand string builds per
render pass, for numbers that had not changed and would not change.

It is memoised now, keyed by the whole second that gets drawn, so 254.43 and 254.9
share the entry their answer comes from. A library has far fewer distinct song
lengths than it has songs, and a song whose metadata has not been read yet is `0`
on every row — the two cases the cache is for. It holds 512 entries and empties
itself when full, so it cannot grow with a player that has been left running.

The row also formats its length once instead of twice. The strings it draws are
byte for byte what they were; there are just fewer of them built.

## 127 — 11 November 2026

**A queued highlight frame could outlive the surface it was drawn on.**

The specular highlight is applied at most once per frame: a pointer move records
where the pointer is and queues a frame, and that frame writes the position into
the surface's custom properties. The queue was a boolean, so the frame it started
could not be called back.

Two things followed. Leaving the surface resets the highlight to its resting place
— and the frame queued by the move just before the pointer left then ran, a
fraction of a second later, and put the highlight back under where the pointer had
been. And when the surface went away entirely — the settings sheet closing, the
panel unmounting — the frame still ran, writing two custom properties into an
element that was no longer in the document.

The frame is held as a handle now. It is cancelled when the pointer leaves, before
the resting highlight is written, and cancelled again when the hook is torn down.
Nothing else about the highlight changes.

## 126 — 11 November 2026

**Space did nothing when a button had the focus.**

Space is the player's play/pause key, and the app takes it for the whole document:
the handler cancels the browser's default action and toggles playback. But Space is
also how a keyboard activates whatever has focus. So with the focus on any button —
the palette or settings button in the top bar, a tab at the bottom, a row in the
playlist, a switch in the settings sheet, **Done**, **Reset** — pressing Space
produced no click at all, and started or stopped the music instead. A keyboard user
could tab to the settings sheet and then not close it.

The handler now leaves Space alone when the focus is on something that activates
with it: buttons, links, the seek slider, the switches and the menu items. With the
focus on nothing, or on a plain part of the layout, Space still plays and pauses
exactly as before.

## 125 — 11 November 2026

**A phone standing still recalculated the whole document's style, sixty times a second.**

The 4D tilt is two custom properties, `--tilt-x` and `--tilt-y`, written on the
root element and inherited by everything under it — which is what makes one write
lean the record, the glass and both parallax layers at once. It also means a write
to either of them invalidates the style of the whole document.

Both were written on every frame of the ease. At the tail of an ease the value
moves by less than the four decimals that get written, so the document was
recalculated, in full, to say exactly what it already said. And every orientation
event started a fresh ease, and a phone reports its orientation many times a
second while it is standing still — or held level — with the same numbers each
time, so a still phone paid for a full style recalculation per frame to draw a
tilt that had not moved.

The hook remembers what it last told the document and writes only when the string
would differ, and an event whose target is already reached starts no frame at all.
The tilt itself is unchanged: the same easing, the same clamp, the same angles on
the same elements.

## 124 — 11 November 2026

**The blob cache never forgot anything.**

A `data:` source cannot be played and analysed at the same time — the analyser
needs a same-origin URL — so it is turned into a Blob URL first, and that URL is
kept, because decoding the same source twice is work with nothing to show for it.

The map holding them was never trimmed. Every data-URI source that was ever played
kept its Blob — the decoded copy of the whole audio file — alive for as long as the
app was open, so a listener working through a long playlist accumulated tens of
megabytes that nothing could free. It holds the eight most recently asked-for
sources now, drops the rest, and calls `URL.revokeObjectURL` on each one it drops,
which is the call that actually hands the memory back.

A source that is asked for again moves to the back of the queue, so the one being
dropped is always one nothing is playing. Five tests cover it: a repeated source
is answered from the cache, an old one is decoded afresh, the source just asked for
survives the trim, and the cache never holds more than the limit.

## 123 — 11 November 2026

**A resize wiped the visualiser and nothing drew it again.**

Giving a canvas a new width or height is how it is cleared — it comes back blank,
with everything drawn on it gone. Only the paint loop ever drew on it, and that
loop is deliberately asleep in two ordinary situations: while the player is paused
and the bars have come to rest, and whenever reduced motion is on, where it never
starts at all.

So rotating the phone, or resizing a desktop window, with the player paused left an
empty rectangle where the bars had been, and it stayed empty until playback
started. The resize handler now repaints the frame it just cleared, through the
same `step()` the loop uses, whenever no frame is already scheduled. Nothing is
drawn twice: a running loop redraws on its own next frame.

## 122 — 7 November 2026

**Pressing play while it was playing re-rendered the app.**

Three things ask the player to play or pause: the buttons on the system's media
card, the shell echoing a hardware button back into the page, and the element's own
events. Each of them reached the reducer and got a brand-new state object back, even
when the player was already doing exactly what was asked — and a new state object is
a re-render of the whole app, which on a tick's worth of interface is work nobody
asked for.

`PLAY` now answers with the state it was given when it is already playing with no
error to clear, and `PAUSE` does the same when it is already paused. Everything
that is a real change still goes through exactly as before: play starts a paused
player, play after an error retries and clears the message, pause stops a playing
one. There is a test for each of the five cases.

## 121 — 7 November 2026

**The song's title, artist and heart were rebuilt on every playback tick.**

The position lives in the player state and lands there four or five times a
second, so the app re-renders just as often. 100 and 106 took the settings sheet,
the tab bar, the options bar, the ambient background, the transport row and the
volume slider out of that re-render. Three things were left in it: the title and
artist in the top bar, the title and artist under the record, and the heart beside
the transport controls — seven elements, four or five times a second, to draw a
song that had not changed and a heart that had not been pressed.

They are memoised components now, in `components/NowPlaying.tsx`, given the track
and the two things the heart draws rather than the whole state. A playback tick
rebuilds none of them. The markup is unchanged element for element: the same two
spans in the top bar, the same heading and line under the record, the same button
with the same classes and the same handler.

## 120 — 7 November 2026

**Importing a folder built one audio element per file.**

Adding a folder of songs reads each file's duration from its own metadata, six
files at a time. Each read built its own `<audio>` element and dropped it once it
answered, so a folder of five hundred songs built and threw away five hundred media
elements — each one created, wired to a decoder and torn down inside the WebView
before the next could start.

The reads share six elements now. Six is not a guess: it is the number of probes
that run in parallel, so it is also the most that can ever be in use at once, and
the pool is the same constant. A probe hands its element back when it has answered,
with its listeners taken off first so a reused element cannot answer for the file it
was given a moment ago. The duration is still read from the file itself, the rows
still come out in the order the files were picked, and the element still lets go of
its media resource between files, as 90 fixed.

## 119 — 7 November 2026

**The glass highlight forced a layout on every pointer frame.**

The specular highlight follows the pointer across a glass surface, and it is
driven from a per-frame update — at most one write a frame, which is right. But
each of those frames began by measuring the surface with
`getBoundingClientRect`, right after the previous frame had written two custom
properties to it: a forced style recalc and layout, up to sixty times a second,
on two surfaces at once (the panel and the list inside it).

The box is measured once and kept. It is forgotten when the layout can have
changed — the window resizing, anything scrolling, or the surface itself changing
size, which a ResizeObserver reports, so the panel's collapse and a change in row
count are both covered — and measured again on the next move. A pointer crossing
the glass now does no measuring at all; the highlight still follows it exactly as
before, from the same rectangle.

## 118 — 7 November 2026

**A keystroke re-rendered the list to draw the highlight where it already was.**

The highlight behind the playing row is re-measured whenever the rows can have
moved: a track change, a tab, a search, a library update. Every measurement built
a fresh `{ y, h }` object, and a fresh object is a new value to React even when the
row has not shifted a pixel — so typing one character of a search re-rendered the
whole list section, creating and comparing an element for every row in it, to draw
the highlight in exactly the place it was already in. On a full phone that is five
thousand elements per keystroke; on a rescan it happened again, on every return to
the app.

The measurement now answers with the object it already had when the numbers are
the same, which is what lets React skip the render. A row that really moved still
gets a new lens and still slides, and the measurement is still taken after layout,
so nothing appears a frame late.

## 117 — 7 November 2026

**The list's row indices were built on every keystroke for the arrow keys.**

The arrow keys step through the rows you can actually see, so the list kept a
second array beside the filtered one: the library index of every visible row, in
display order. It was built with the render — and the render happens on every
keystroke of a search. On a library of five thousand songs, each character typed
allocated a five-thousand-entry array (40 KB) for a list of indices that only the
arrow keys ever read.

It is collected inside the key handler now, which is the one place that needs it.
Typing a search allocates nothing extra; pressing an arrow key allocates the array
it is about to walk, exactly as before.

## 116 — 7 November 2026

**The visualiser measured its bars on every frame.**

The bars' geometry — the gap between them, their width, the baseline they stand
on, the tallest one, and where each of the thirty-six starts — was worked out
inside the paint. None of it changes between one frame and the next: it depends on
the canvas size alone. So the visualiser recomputed it thirty times a second, at
about a hundred and forty multiplications and a dozen clamps a frame, twice over
for the reflection, to arrive at the numbers it already had.

It is measured once per resize now, along with the gradients, and each bar's x is
kept in a table of thirty-six. The pixels are identical — the same numbers, worked
out once instead of thirty times a second.

## 115 — 7 November 2026

**The import note's timer outlived the note.**

Adding a folder of songs says how many it added, in a note that clears itself
after five seconds. The timer that cleared it was fired into the void —
`window.setTimeout(() => setNotice(null), 5000)`, with nothing keeping hold of it.
So adding a second folder within five seconds meant the *first* add's timer wiped
the second note about a second after it appeared, and the timer also outlived the
app, setting state on a screen that was no longer mounted.

The timer is held now: a new note cancels the old one's timer before setting its
own, and it is cleared when the app unmounts. The splash screen's tap-to-leave
timer — the same shape, the same problem — is held the same way.

The note still appears when a folder is added and still goes after five seconds;
what changed is that it goes when *its* five seconds are up.

## 114 — 7 November 2026

**A rescan re-rolled the shuffle order.**

With shuffle on, the play order was thrown away and re-rolled whenever the list
changed — and the Android shell replaces the whole list every time the app comes
back to the foreground. So the sequence you had been listening to did not survive
putting the phone down: unlock it, and the song that was about to play was a
different one, and Next went somewhere new.

`SET_LIBRARY` rebuilt the order with a fresh `shuffled()` of the new list. It now
carries the sequence across, translating it from the old indices to the new ones
through the track ids, which are what a rescan actually preserves. A song that has
left the library drops out of the order, and a song that is new to it goes on the
end. Only an order that was never built — an empty library — is shuffled afresh.

Five tests cover it: an identical rescan changes nothing, a reordered library
follows each song to its new index, a removed song drops out, added songs are
appended in order, and an empty order still gets shuffled.

## 113 — 7 November 2026

**Turning shuffle off built the play order, then never read it.**

Turning shuffle *off* built the play order, and then never read it. With shuffle
off the order is the library order, index for index — 111 stopped allocating it
in the unshuffled path everywhere for exactly that reason — but the one remaining
place still made it: the toggle itself. On a 5,000-song library, turning shuffle
off allocated a 5,000-entry array (40 KB, and the numbers 0 to 4,999) to say
nothing at all, and dropped the shuffled order on the floor at the same time.

The order is left empty when shuffle goes off, which is the state 111 established
for it: empty until shuffle is turned on, and empty again the moment it is turned
off. A test turns shuffle on over 500 tracks and off again, and checks the order
is gone.

## 113 — 7 November 2026

**Turning shuffle off built the play order, then never read it.**

Turning shuffle *off* built the play order, and then never read it. With shuffle
off the order is the library order, index for index — 111 stopped allocating it
in the unshuffled path everywhere for exactly that reason — but the one remaining
place still made it: the toggle itself. On a 5,000-song library, turning shuffle
off allocated a 5,000-entry array (40 KB, and the numbers 0 to 4,999) to say
nothing at all, and dropped the shuffled order on the floor at the same time.

The order is left empty when shuffle goes off, which is the state 111 established
for it: empty until shuffle is turned on, and empty again the moment it is turned
off. A test turns shuffle on over 500 tracks and off again, and checks the order
is gone.

## 112 — 4 November 2026

**The element's repeated events re-rendered the app to show what was already there.**

A track change fires `durationchange` and then `loadedmetadata`, both carrying the
same duration, and each one replaced the state — two full re-renders of the app to
draw the same number twice. A seek is followed by a `timeupdate` at the place it
sought to, and `playing` fires again after every buffer recovery, each reporting the
status the player already had. The volume slider sends its last value again when a
drag runs past the end.

The reducer answers all four of those with the state it was given when nothing
actually changed, which is what lets React skip the render. A changed value still
goes through exactly as before, un-muting still clears the mute even when the number
is the same, and there are tests for each case.

## 111 — 4 November 2026

**The play order was built even when shuffle was off.**

With shuffle off the play order is the library order, index for index — the array
says nothing the index does not. It was built anyway, on the first render, on every
import, and on every library rescan: `range(n)` makes an array of n numbers, so a
5,000-song library allocated a 5,000-entry array (37 KB, measured) to hold the
numbers 0 to 4,999, and handed the previous one to the collector. The shell rescans each
time the app comes back to the foreground, so that was a rescan-sized allocation
every time the phone was unlocked.

The order is empty until shuffle is turned on, which is the only time it is read.
Turning shuffle on builds it exactly as before, and with shuffle on an import still
appends to it. Tests cover all four transitions: on, off, and adding tracks either
way.

## 110 — 4 November 2026

**Adding songs threw the list back to whatever was playing.**

Keeping the playing row in view was an effect that depended on `tracks` — and
`tracks` is a new array every time the library changes: an import, a folder added,
or the rescan the Android shell runs each time the app comes back to the foreground.
So the list scrolled itself back to the playing song whenever the library changed,
even though the playing song had not moved, yanking the list away from wherever the
listener was reading. On a rescan that happens on every return to the app.

It watches the active track's id now, which is what it actually cares about. The
scroll happens when the song changes, and a library update leaves the list where it
is. It also means the smooth scroll is no longer fired on every rescan.

## 109 — 4 November 2026

**Dragging Depth alone left the Style panel's Reset button dead.**

The panel decides whether to offer a Reset by comparing the current Style with the
defaults, field by field — and Depth was not in the list. Move the Depth slider, and
Reset stayed disabled: the only way back to the default look was to drag the slider
back to exactly 60 by hand, guessing at the number.

The comparison is one exported function now, checking every key of the default
Style, so a setting added later cannot be left out of it. Its own test walks each
field in turn — Depth included, at both ends of its range — and asserts the panel
sees it as a change.

## 108 — 4 November 2026

**Searching lowercased the whole library on every keystroke.**

The filter compares the query against each song's title and artist, case-insensitively,
so it called `toLowerCase()` twice per track — two fresh strings per song, on every
character typed. A few thousand songs is a few thousand short-lived strings per
keystroke, none of which had changed since the last one.

The lowercased text is built once per library and cached against the library array,
which is replaced whenever the tracks change and so cannot go stale. Nothing is
built until there is a query. Measured on a 5,000-track library: 0.99 ms per search
becomes 0.51 ms (1.9×), and the 10,000 strings allocated per search become none —
the first search pays 3.7 ms to build the index and every search after it reuses it.

The existing test that checks the filter against the map-then-filter version it
replaced still passes, and a new one checks that a second search of the same library
answers identically.

## 107 — 4 November 2026

**With shuffle on, every track change scanned the whole play order.**

97 took the library-sized array out of the unshuffled path. The shuffled one still
asked `order.indexOf(currentIndex)` for the playing track's position — a linear
scan of the play order on every next, previous and end-of-track. Shuffle on with a
few thousand songs is a few thousand comparisons per press, right on the path a
track change takes.

The positions are read from a map built once per order and cached against the array
itself, which is replaced wholesale whenever the order changes and so cannot go
stale. Measured with shuffle on, stepping from the last position in the order —
the worst case for a scan: 7,570 ns becomes 245 ns on a 5,000-track order (31×),
and 1,833 ns becomes 149 ns on a 1,000-track one (12×).

A test walks orders of every size, from every position, in both directions, through
every repeat mode, and includes an index that is not in the order at all, so the map
is proven to answer exactly what the scan answered.

## 106 — 4 November 2026

**The transport row and the volume slider were rebuilt four times a second.**

The settings sheet, the tab bar, the options bar and the ambient background were
memoised in 100, which left the controls under the progress bar out. They are
memoised now — but the transport row was being handed the whole player state, and
that object is replaced on every playback tick because the position lives in it, so
a memo alone would have changed nothing. It is given the six values it actually
draws instead, all of them stable while a song plays, and `actions` was already one
stable object.

A tick now rebuilds neither the transport row (27 elements, five of them buttons)
nor the volume control (7) — 34 elements that were rebuilt four or five times a
second to draw exactly the same picture. Counted, not estimated: both components
rendered to markup and their elements counted.

## 105 — 4 November 2026

**Every cover in the list drew itself twice on the way in.**

`Artwork` kept a plain `failed` flag and cleared it in an effect keyed on the track
id. An effect runs after the paint, so each cover mounted, painted, then re-rendered
itself once to say "not failed" — which it already was. On a library of a few
hundred songs that is a few hundred extra renders, and as many extra reconciliations
of the `<img>` inside them, before the list has settled.

The flag names the track that failed instead, so the reset is part of the answer and
there is no effect at all. Every cover renders once on mount, and a cover that fails
still falls back to its gradient exactly as before.

## 104 — 4 November 2026

**Opening the app still wrote the style it had just read.**

The settings and the hearts stopped writing their freshly loaded value back on the
first run in 96, through the shared helper in `utils/persist.ts`. The style was
left behind: it kept its own copy of the timer, and its effect fired on mount with
the value it had read a millisecond earlier. So every launch still cost a write to
the local store to save exactly what was already there.

It uses the shared helper now — one fewer disk write per launch, and the last of
the three stores to be brought in line.

## 103 — 4 November 2026

**The APK was permanently version 102, whatever the app said.**

Both Android build scripts carried the version as a default in the script itself —
`VERSION_CODE=102`, `VERSION_NAME=102.0` — and nothing ever passed anything else.
package.json moved on with every release, the app's Settings screen showed the new
number, and the manifest kept claiming 102. Android treats two builds with the same
versionCode as the same version, and Play refuses an App Bundle whose versionCode
has not gone up, so this would have blocked the next upload outright.

The number now comes from package.json — the same file the web build stamps into
the app — through one small `android/version.sh` both scripts share. An explicit
`VERSION_CODE` / `VERSION_NAME` in the environment still wins, for a one-off build.

## 102 — 2 November 2026

**Songs you added by hand no longer vanish when the app rescans the library.**

The Android shell rescans the phone's music every time the app comes back to the
foreground, and a rescan replaces the playlist with what it found. What it found
is only ever the phone's own music — so a folder of files you had added by hand
was wiped out of the list the next time you unlocked your phone and came back.
The imported tracks are kept now, appended after the device's, with nothing
duplicated and no track appearing twice.

The same guard covers the other direction: if a rescan comes back empty (the
permission was revoked, or the scan found nothing), the imported songs are still
there instead of the whole list — and whatever was playing — being cleared.

## 101 — 2 November 2026

**Dragging the progress bar no longer forces a layout on every move.**

The rail's box was measured inside the function that turns a finger position
into a time — so every `pointermove` called `getBoundingClientRect`, which is a
forced synchronous layout, and then set state, and then seeked the audio element.
A drag across the bar did that a hundred times, in the middle of the most
latency-sensitive gesture in the app.

The box is now measured once, when the drag starts, and again once when it ends.
The position is applied at most once a frame through `requestAnimationFrame`, so a
pointer that reports faster than the screen refreshes — a stylus, a 240 Hz touch
panel — no longer queues up seeks the audio element has to work through. Nothing
moves on screen any earlier than a frame could have shown it.

## 100 — 2 November 2026

**The playback tick no longer rebuilds the interface around it.**

The position lives in the player state, and it lands there several times a
second, so the whole app re-renders just as often. Everything in that re-render
that does not depend on the position was being rebuilt anyway: the settings
sheet — all six switches and the entire Style panel, 144 elements on its own —
the tab bar, the options bar and the ambient background, 183 elements in total,
four or more times a second, for a number that only the progress bar reads.

Those four are memoised components now, and the handlers they are given are
stable (`useCallback`) so the memo can actually take effect. The count above is
measured: the four components rendered to markup and their elements counted.

## 99 — 2 November 2026

**Reduced motion is respected from the first frame.**

The setting was read in an effect that ran after the first paint, so the app
started in its full-motion state and corrected itself a frame later. Anyone who
has told their phone to reduce motion got the launch animation, the drifting
glass and the record's spin for that frame — and paid for a re-render and a style
recalc to switch it all off again. The answer is now read synchronously, before
the first render, so nothing is animated unless it should be.

The change listener also falls back to `addListener` where `addEventListener` is
missing on a `MediaQueryList`, which is the case on the older WebViews the app
still supports — there the listener was silently never attached, so toggling the
system setting while the app was open did nothing.

## 98 — 2 November 2026

**The list is filtered in one pass.**

Building the visible rows went through every song twice: once to wrap it as
`{ track, index }`, once to throw most of those wrappers away. On a library of a
few thousand songs that is a few thousand short-lived objects per keystroke, all
of them straight into the young generation for the collector to sweep.

It is one loop now, allocating only for the rows that survive. Measured on a
5,000-track library over 1,000 filter calls: 0.680 ms per call becomes 0.528 ms
(1.29×), and the wrappers created per call fall from 5,000 to 1,602 — the number
that actually match. A test asserts the new function returns exactly what the old
one did, across the empty query, a title match, an artist match, the Liked tab
and both together.

## 97 — 2 November 2026

**Changing track no longer builds the whole play order to answer one step.**

`step()` — what "next", "previous" and the end of a track all go through — built
the play order first and then walked it. With shuffle off that order is the
library order, index for index, so the array was built only to be indexed once:
an array as long as the library, allocated and thrown away on every track change.

Measured on a 5,000-track library over 200,000 steps: 575 µs per step building
the order becomes 62 ns reading the index — 9,241× — and 39 KB of array per press
is no longer allocated at all. The shuffled path is untouched: with shuffle on
the order really is arbitrary, and it is still walked exactly as before.

A test walks every combination of library size, position, direction, repeat mode
and end-of-track against the old implementation, so the shortcut is proven to
return the same step in every case.

## 96 — 2 November 2026

**Opening the app no longer writes the settings it just read.**

Both stores ran their save effect the moment the app mounted — with the value
they had loaded a millisecond earlier. So every launch cost two disk writes (the
settings and the style) to store exactly what was already there, before the
listener had touched anything.

The first run is now skipped, and the debounce moved into one shared, tested
helper (`utils/persist.ts`) used by all three stores — settings, style and the
hearts. One place that decides when a write happens, instead of three copies of
the same timer.

## 95 — 2 November 2026

**The hearts are remembered.**

Liking a song was the one thing in the player that was purely the listener's own
opinion, and it was the one thing never saved: the heart filled in, the Liked tab
filled up, and closing the app threw all of it away. The likes now live in the
local store beside the settings and the style, under the same rules — only
`id: true` entries are written, and anything that is not a real like is ignored
when it is read back, so a half-written entry cannot un-like a song.

The write is debounced by a quarter of a second, so tapping through a dozen
hearts is one write rather than a dozen, and it does not write at all until
something has actually been changed.

## 94 — 2 November 2026

**The arrow keys move through the list you are looking at.**

The playlist steps by one through the library when you press up or down. With a
tab or a search filtering the list, "one more in the library" is a song that is
not on screen: three search results showing, down arrow pressed, and the
selection landed on a fourth track that was not one of them — the lens vanished
and the list scrolled to a row that was not there.

Stepping now happens through the rows actually visible, in display order, and
stops at either end rather than wrapping. If the playing track has been filtered
away, the first press lands on the nearest visible row in the direction you are
going, so the key always does something you can see.

The step itself is a pure function in `utils/playlist.ts` with its own tests.

## 93 — 2 November 2026

**A seek you did not finish no longer throws the song back to the start.**

Letting go of the progress bar publishes where the finger was. A gesture the
system takes away — an incoming call, a swipe in from the edge, the notification
shade coming down over the bar — arrives as `pointercancel` instead, and that
event carries no position at all: its `clientX` is 0. The bar treated it exactly
like a release, so it seeked to zero and the track audibly restarted. A cancelled
drag now ends where the finger last was.

The rail arithmetic also moved into `utils/timeline.ts`, a pure function with its
own tests: a pointer past either end clamps to that end, and a rail that has not
been laid out yet resolves to the start of the track rather than `NaN`.

## 74 — 25 October 2026

**The options live in one floating bar, and nowhere else.**

Modelled on the segmented control in the Liquid Glass prototype the design came
from: one translucent capsule holding its own items, with the rim and the lift on
the capsule rather than on each button. Three separate glass pills became one
surface with three plain buttons inside it — tidier, and one less thing to draw.

**The glass is flatter, and lighter because of it.**

The 26px white halo and the 30px lift are gone. What is left is one hairline, one
lit edge, one soft shadow, and the accent bleed at the base. That is closer to the
material in the reference — and a wide blur sitting behind every glass surface was
the most expensive thing on the screen, so removing it is a real saving rather
than a cosmetic one. The bundle came down with it, 197.5 KB to 196.6 KB.

## 73 — 25 October 2026

**Why the app felt heavy on open — found it.**

Every track's fallback cover was an SVG data URI with **two Gaussian blur filters
inside it, one at a 46px radius**. On a library of a few hundred songs that is a
few hundred blurred SVGs to rasterise before the list could settle. The same
picture is now a plain CSS gradient: no image, no data URI, no filter, nothing to
decode. A cover went from about a kilobyte of markup plus a blur pass to roughly
150 bytes of gradient.

**And the opening screen held for nearly six seconds.** It waits 2.4 now — the
animation is the same, you just get to your music sooner.

### Gen 5 glass

- **The bar is simple on purpose.** It is the thing you look at while listening,
  so it is one clean capsule: a hairline rim, one lit edge, and a shadow with no
  halo. Everything else can carry the heavier treatment.
- **The panels are not.** Three things changed: a brighter lit edge, a hairline
  that reads as a real bevel, and a faint **accent-tinted bleed at the base** —
  which is what makes the material look like it is picking up colour from behind
  it rather than sitting on top. That bleed follows whatever colour the Style
  panel is set to.
- A second, tighter highlight just inside the top edge: the light catching the
  thickness of the material rather than its surface.

## 72 — 25 October 2026

**The opening screen said "Version 50".** It was a hard-coded string in the splash
component, written once when the app launched and never touched again — so it
said 50 through twenty-two releases. It reads the real version now, the same one
`package.json` carries and the build stamps in, so it cannot drift again.

**The website needed editing by hand for every release.** The version and the APK
size were typed into `docs/index.html`. The page now reads them from the latest
GitHub release, so a new release updates the page by itself. The download links
already pointed at `releases/latest`. If the call fails — offline, or GitHub
rate-limiting — the static text stands and nothing breaks.

Three more optimisations:

- **Storage writes are debounced.** Dragging the glass or corner slider wrote to
  local storage on every step of the drag. One write, a moment later, is the same
  thing.
- **The pointer sheen only runs where there is a real pointer.** `pointermove`
  fires for touch too, including while scrolling, so it was doing a
  `getBoundingClientRect` and two style writes on every scroll frame to move a
  highlight nobody could see on a phone. It is limited to fine pointers and to
  one write per frame now.
- **The row stagger moved into CSS.** Every row carried an inline custom property
  to stagger its entrance. `nth-child` does the same job, and a library of a few
  hundred songs no longer carries a style object per row.

## 71 — 25 October 2026

**Every build is signed with the upload key now.**

This is the one that matters. Until now the workflow never handed `build.sh` an
uplaod key, so every release fell back to a throwaway debug key — **and a
different one each run**:

```
v60 release APK  ->  cert b5e944c4...   (Android Debug)
v70 release APK  ->  cert a0295694...   (Android Debug)
```

Android refuses to install an APK over one signed with a different key, so the
v70 update could never install over v60. The app stayed on 60, the store kept
offering an update that could never land, and Play would have rejected the App
Bundle as well.

The workflow now writes the upload key from `KEYSTORE_BASE64` and passes the
`RELEASE_*` variables to both the APK and the App Bundle builds. Without that
secret it warns loudly rather than failing quietly. `build.sh` also keeps the
debug keystore it generates instead of making a new one every run.

**If the app on your phone was signed with a debug key, uninstall it once** — the
correctly-signed build will not install over it. After that, every update
installs normally.

## 70 — 24 October 2026

**Only the first screenful animates in.** Every row ran the entrance animation,
so a long library kept animating for seconds after it was already on screen. The
first fourteen rows animate; the rest simply appear.

## 69 — 24 October 2026

**An unchanged now-playing payload is no longer sent.** The page compared
nothing, so an identical payload crossed the bridge each time the effect ran.

## 68 — 24 October 2026

**Dead custom properties removed.** `--glass-blur`, `--glass-sat`,
`--glass-tint`, `--glass-tint-2` and `--r-lg` were declared and never read.

## 67 — 24 October 2026

**The drift stops when nothing is playing.** Three continuous compositor
animations ran whether or not any music was playing. They now pause while the
player is idle.

## 66 — 24 October 2026

**The list no longer chains its scroll to the page.** `overscroll-behavior:
contain` stops it handing the scroll on at the ends, which reads as a jolt.

## 65 — 24 October 2026

**Album art decodes off the main thread.** `loading="lazy"` and
`decoding="async"` on every cover image.

## 64 — 24 October 2026

**The glass halo trimmed.** A 44px blur behind every glass surface became 26px.

## 63 — 24 October 2026

**The visualiser runs at 30fps, not 60.** It was a full canvas redraw every
frame for a difference nobody can see.

## 62 — 24 October 2026

**Off-screen rows are skipped entirely.** `content-visibility: auto` with
`contain-intrinsic-size` means a library of a few hundred songs no longer lays
out and paints the whole library to show ten rows.

## 61 — 24 October 2026

**A real bug: the third ambient blob ignored the Style setting.** `--blob-3` was
declared but never read, so changing the background mood left that one blob on
its old colour.

## 60 — 24 October 2026

**The volume now follows the phone.** `HTMLMediaElement.volume` is a separate
knob from the phone's media volume, and a WebView cannot read the system one, so
the two never matched. Inside the shell the shell owns it: moving the app's
slider sets the phone's media volume, and a hardware volume press comes back the
other way and moves the slider. In a browser nothing changes — the slider drives
the element, as before.

**The refresh rate now follows the system.** The app used to force the highest
refresh mode the panel supports, which ignores what the system is actually asking
for: when the system dropped to 60Hz the app kept pulling it back up and the two
disagreed. It now leaves the display alone and runs at whatever rate the system
has chosen, including 120Hz when it is set to that.

## 59 — 24 October 2026

**The stutter.** Two causes, both real.

The now-playing effect depended on `state.currentTime`, which changes on every
`timeupdate` — several times a second. That pushed the song across the bridge
that often, and the shell rebuilt and re-posted the media notification just as
often. The position now lives in a ref, so the push happens when the song or the
play state changes, which is all the card needs; it extrapolates the position
itself. The shell also skips the rebuild entirely when nothing the card shows has
changed.

The three drifting colour blobs each carried a `filter: blur(56px)` while
animating. Three screen-sized layers paying for a 56px blur every frame is one
of the most expensive things a phone GPU can be asked to do. A radial gradient is
already soft, so the blur is gone and the gradient stops carry the softness. The
glass lift shadow was also trimmed from a 46px to a 30px blur.

The progress bar also glided nowhere between timeupdates; it steps a few times a
second. It now eases between them.

## 58 — 24 October 2026

**The app now says which version it is.** The foot of the settings sheet shows
it, so it can be checked against what is on GitHub at a glance. It is stamped in
at build time from `package.json`, so it cannot drift.

**A changelog.** Every version, and what changed in it, in one file.

## 57 — 24 October 2026

**The player bar could still run off the right of the screen.**
The wrap that was meant to fix this sat behind a `max-width` media query, which
depends on the reported viewport width being what we expect — and it is not
always. Wrapping is now unconditional and the capsules never shrink, so if the
two do not fit side by side they take a line each at any width. Below 380px the
controls step down a size as well. Checked at 320, 360, 412, 480, 540 and 620.

**The app still drew underneath the clock.**
Padding the WebView directly does not reliably move the page: it renders into
its own bounds, so the padding did nothing. The WebView now sits inside a plain
holder, and the holder is what gets padded.

## 56 — 24 October 2026

**The player bar spilled out of the panel.**
The transport capsule and the volume capsule together need about 386px; inside
the panel of a 360px screen there is about 300px. The row was `nowrap` and the
panel does not clip, so both pushed out through its edge.

**The topbar ran out of room.** Style, settings and fullscreen became one
overflow menu.

**System bars.** The heights are handed to the layout rather than assumed.

## 55 — 24 October 2026

**The now-playing card.** Android has no Dynamic Island, so this uses what
Android has: a `MediaSession` and a media notification — the lock screen, the
notification shade, the quick-settings media player, and the control centre
Xiaomi, Realme and Honor build on top of it. The card's own buttons drive the
real player. The notification permission is asked the first time something
plays.

**Fixed a silent bug:** the shell keeps one object on `window.vinylNative`, and
the library-refresh hook was replacing it wholesale — which would have unhooked
the media buttons.

## 54 — 24 October 2026

**Edge to edge.** Android 15 forces every app to draw edge to edge. The insets
that come with it were never handled, so on a phone with a navigation bar the
player bar sat underneath it or left a band of bare window below the panel.

## 53 — 24 October 2026

**Make it look how you want.** A Style panel in settings: accent (eight presets,
any colour at all, or taken from the playing cover art), seven background colour
fields, a glass-strength slider, a corner-roundness slider, and six record tints.
All of it saved on the device.

## 52 — 24 October 2026

**The glitchy player bar.** The specular rim was a gradient border drawn with
`mask-composite: exclude`. Android WebView never implemented mask-composite
properly: where it is missing the mask is dropped and the pseudo-element paints
as a hard-edged bright rectangle across the whole panel. The rim now lives in
inset box-shadows, which follow `border-radius` everywhere and cannot fail.

## 51 — 24 October 2026

**Play-ready.** `targetSdk` and `compileSdk` 36 — Play refuses new apps below
this since 31 August 2026. Signed with a real upload key. `build-aab.sh`
assembles the App Bundle with bundletool, which Play requires for new apps. A
privacy policy page and the 1024×500 feature graphic.

## 50 — 24 October 2026

The version the channel launched with: Liquid Glass throughout, the staged
opening screen, the 120 Hz work, and the snappier motion.
