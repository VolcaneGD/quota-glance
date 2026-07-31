# Changelog

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
