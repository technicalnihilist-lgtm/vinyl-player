# Mirroring this project to GitLab

GitHub is the source of truth. GitLab is a copy.

## Why there is no button for this

There is no GitLab connector wired into this workspace, so the code cannot be
pushed to GitLab from here — it has to be imported once by you. After that it
keeps itself in step without anyone touching it.

## 1. Import it (once, about two minutes)

GitLab can import a repository straight from GitHub. On GitLab **Free** this is
available:

**Option A — by URL (no GitHub account needed, works because the repo is public)**

1. GitLab → **Create new** → **New project/repository** → **Import project**
2. **Repository by URL**
3. Git repository URL:
   ```
   https://github.com/technicalnihilist-lgtm/vinyl-player.git
   ```
4. Pick a namespace and name, **Create project**

**Option B — the GitHub importer (brings issues and releases too)**

1. GitLab → **Create new** → **New project/repository** → **Import project** → **GitHub**
2. **Authorize with GitHub** (or paste a GitHub personal access token with the
   `repo` scope)
3. Tick `vinyl-player` → **Import**

Either way you get the whole repository, history included.

## 2. Keep it in step

GitLab **Free has no pull mirroring** — that starts at Premium. So the repository
carries a `.gitlab-ci.yml` that does the same thing with a scheduled pipeline:

1. **Settings → Access tokens** → create a project access token with the
   `write_repository` scope
2. **Settings → CI/CD → Variables** → add it as `MIRROR_TOKEN`, masked
3. **Build → Pipeline schedules** → add one, hourly or daily

The `mirror` job then pulls GitHub's `main` and pushes it to GitLab on that
schedule. Every version pushed to GitHub turns up here by itself.

## 3. What runs where

| | GitHub | GitLab |
|---|---|---|
| Source of truth | yes | mirror |
| Builds the APK and App Bundle | yes (Actions) | — |
| Publishes the release | yes | — |
| Typecheck, tests, web build | yes | yes (the `build` job) |
| Feeds Orion Store | yes | — |

Orion Store reads public GitHub releases, so it follows GitHub. The GitLab copy
is for the code and the pipeline, not for the release downloads.

## If you would rather not run a schedule

Re-importing takes two minutes and does the same thing by hand: **Create new →
Import project → Repository by URL** with the same URL. GitLab creates a fresh
copy each time.
