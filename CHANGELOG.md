# Changelog

## 1.4.2 - 2026-08-06

- Kept the last successfully collected system metric when a later sample is unavailable.
- Switched CPU and memory collection to independent Windows CIM queries, so one failed metric does not discard the other.

## 1.4.1 - 2026-08-06

- Fixed the opacity range slider so its track fill always follows its own thumb.
- Kept GPU, CPU, MEM, and TEMP visible in minimum mode.
- Increased the compact window height so all remaining-quota cards stay visible.

## 1.4.0 - 2026-08-06

- Added compact GPU, CPU, memory, and NVIDIA temperature monitoring.
- Added color-coded metric values and `--` unavailable states.
- Added a 40–100% window opacity setting and persistent window preferences.
- Reduced Compact View type and padding.

## 1.3.0 - 2026-08-03

- Changed five-hour and weekly cards to show remaining percentage rather than used percentage.
- Added remaining-capacity colors: green at 50% or more, yellow from 31% to 49%, and red at 30% or less.
- Added a saved minimum mode that condenses the balance and both remaining-capacity cards into a small window.

## 1.2.0 - 2026-08-01

- Added a saved 1–60 second refresh interval slider, defaulting to 5 seconds.
- The latest-fetch label now reflects each actual local scan instead of the timestamp embedded in the source record.
- Reduced file-change debounce latency and immediately refreshes after changing the interval.
- Replaced the runtime tray SVG with opaque, high-contrast Windows tray PNG assets.

## 1.1.0 - 2026-07-31

- Added simultaneous display of the Codex five-hour and weekly usage windows.
- Added separate reset times and countdowns for both usage windows.
- Detects each window by its recorded duration, preserving compatibility with older weekly-only session data.
- Updated the tray indicator and tooltip to include the five-hour window when available.

## 1.0.0 - 2026-07-31

- Initial public release of Quota Glance.
- Added local Codex credit balance and weekly usage display.
- Added next reset time and countdown in Japan Standard Time.
- Added Japanese and English UI switching with saved preference.
- Added always-on-top mode, tray residency, and usage indicator.
- Added local-only data access with no telemetry or network transmission.
