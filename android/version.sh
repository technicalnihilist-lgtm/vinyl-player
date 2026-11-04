#!/usr/bin/env bash
#
# The version the APK and the App Bundle are stamped with.
#
# Both build scripts used to carry it as a hard-coded default — 102 / 102.0 —
# which nothing ever updated. package.json moved on with every release and the
# manifest did not, so every APK claimed to be version 102 no matter what the app
# said in Settings. Play refuses a bundle whose versionCode has not gone up, and
# Android treats two different builds as the same version.
#
# So the number is read from the repository's package.json, the one the web build
# already stamps into the app, and there is a single place left to change it.
#
#   vinyl_version <repo-root>   ->  "<versionCode> <versionName>"   e.g. "103 103.0"
#
# VERSION_CODE / VERSION_NAME in the environment still win, for a one-off build.

vinyl_version() {
  local pkg="$1/package.json" major minor
  [ -f "$pkg" ] || return 1
  major="$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([0-9][0-9]*\)\..*/\1/p' "$pkg" | head -1)"
  minor="$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"[0-9][0-9]*\.\([0-9][0-9]*\)\..*/\1/p' "$pkg" | head -1)"
  [ -n "$major" ] || return 1
  printf '%s %s\n' "$major" "${major}.${minor:-0}"
}
