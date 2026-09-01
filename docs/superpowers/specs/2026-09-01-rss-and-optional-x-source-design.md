# RSS and Optional X Source Design

## Goal

Use the VOLCANE-managed Google Alerts RSS feed as the default reset-advisory source. Let a user optionally supply their own X API Bearer Token locally for a fresher direct check.

## Data flow

1. GitHub Actions reads `GOOGLE_ALERT_RSS_URL` only from Actions Secrets and downloads Atom/RSS XML.
2. The collector accepts only links matching `https://x.com/thsottiaux/status/<numeric-id>`, applies the existing reset/Codex classifier to the feed entry title and summary in memory, and writes only `{ postId, detectedAt }` to the public feed.
3. The desktop app reads that public feed by default. It never stores or displays RSS entry text.
4. A user may enable the optional direct source by supplying their own X API Bearer Token. The token is encrypted with Electron `safeStorage`, stays local, and is sent only to `api.x.com`.
5. A direct X response is normalized to the same `{ postId, detectedAt }` event shape. If it is unavailable or fails, the app continues using the public RSS-backed feed.

## Privacy and safety

- No RSS text, author data, media, or X post timestamps enter the public JSON or renderer.
- The renderer receives only token status, never the token.
- A clear action removes the local encrypted token.
- User-owned token use is opt-in and is not enabled by default.

## Verification

- Unit tests prove RSS entries publish only identifiers and local detection timestamps.
- Unit tests prove direct X results use the same public-safe event shape and fall back on failure.
- Contract tests prove the renderer cannot retrieve a secret value.
- GitHub Actions is manually dispatched using the configured RSS secret before release.
