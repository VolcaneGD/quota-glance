# Quota Glance 1.5.1

- 5時間枠・週間枠の回復検知を再起動後も維持し、Windows通知の送信失敗時は最大10分間再試行します。
- 次周期のリセット日時によって未通知の旧リセット日時が消える問題を修正しました。
- 通知処理待ちの間に利用情報が更新されても、100%へ戻った変化を取り逃さないようにしました。
- Windows通知のサウンドを明示的に有効化しました。Windows側の通知・サウンド設定や「応答不可」の影響は受けます。

# Quota Glance 1.5.0

- 確定リセット告知を、予定・実施中・実施済みに分けて表示します。予測は行いません。
- 明示された実施時刻は日本時間へ変換し、相対時間は範囲のまま表示します。
- Windows標準通知、30分前・10分前の通知、予定変更通知、再起動後の重複防止に対応しました。
- 「告知・Windows通知」で有効／無効、確定情報のみ、通知タイミング、通知テストを設定できます。
- 5時間枠と週間枠のWindows通知をそれぞれ有効・無効にできます。通常のリセット時刻到達とローカル回復にも対応します。
- 設定全体を折り畳めるようにしました。通常モードの既定サイズは372×800で、設定展開時は必要な高さへ拡大します（画面の利用可能な高さが上限）。
- リセットスケジュールを週間情報から独立したカードに分離しました。告知がない場合は非表示です。
- 公式ステータスと公開フィードを確認します。GoogleアラートRSSは補助情報で、単独では確定通知を送りません。自分のX APIは引き続き任意です。
- 週間利用枠の回復はローカル記録での確認として通知し、OpenAI全体のリセット完了とは区別します。
- 告知カードは取得から48時間で閉じます。予定カードは取得時点で残り100%でも表示され、実施中・実施済みのカードは残り100%で閉じます。
- 告知の取得は情報源の公開・配信タイミングに依存し、即時検知を保証しません。

Windows 10 / 11 x64 · Portable EXE · MIT License © 2026 VOLCANE

## Previous releases

# Quota Glance 1.4.6

## Google Alerts RSS default

- Google Alerts RSS is now the default advisory source; the public feed retains only qualifying Post IDs and detection times.
- Users can optionally save their own X API Bearer Token in Windows encrypted storage for direct local checks.

# Quota Glance 1.4.5

## Reset advisory feed privacy

- The public advisory feed now contains only a qualifying X Post ID and Quota Glance's local detection time.
- Post text, media, author data, post timestamps, and classification details are not stored, distributed, or displayed.
- The advisory card now uses generic bilingual text and opens the original source only on request.

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
