# Quota Glance 1.4.4

## Reset advisory timeout

- The reset advisory now closes 48 hours after it was first displayed, even if weekly usage or credit balance changes in the meantime.
- It still closes immediately when the weekly quota returns to 100%.

# Quota Glance 1.4.3

## Reset advisory feed

- Added an advisory card for qualifying public reset announcements; it is hidden when no recent announcement exists.
- Only posts from the preceding three days are eligible for the public feed.
- The card closes automatically when the weekly quota returns to 100%, or after 48 hours without a weekly-quota change.
- The reset-advisory card is available in both standard and minimum modes.

# Quota Glance 1.4.2

## System-metric reliability

- CPU and memory are now collected through separate Windows CIM queries.
- If a later CPU, MEM, GPU, or TEMP sample is unavailable, the app retains the last successfully collected value instead of replacing it with `--`.
- A metric remains `--` only until its first successful collection.

## Downloads

- `Quota-Glance-Windows-x64.exe` — portable Windows executable
- `SHA256SUMS.txt` — SHA-256 checksum

## Notes

- Supports Windows 10 and Windows 11 (64-bit).
- Windows SmartScreen may show a warning because this is an unsigned free application.
- Quota Glance only reads local Codex usage records; it does not use an OpenAI API key.
