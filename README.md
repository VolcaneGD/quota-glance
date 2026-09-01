# Quota Glance

Quota Glanceは、Codexがローカルに記録した利用状況を小さな常駐ウィンドウで確認できる、Windows向けの非公式フリーソフトです。5時間枠と週間枠を同時に表示します。

> Quota GlanceはVOLCANEが独立して開発した非公式ツールです。OpenAIによる提供、承認、後援を受けた製品ではありません。

## 主な機能

- 残高・残りクレジット
- 5時間利用上限の残り割合と状態色（緑・黄・赤）
- 週間利用上限の残り割合と状態色（緑・黄・赤）
- 各制限枠のリセット日時（日本時間）と残り時間
- OpenAIの公開告知をもとにしたリセット可能性の通知（該当告知がある場合のみ）
- 日本語・英語の表示切替と設定保存
- ファイル変更監視と1〜60秒で変更できるリアルタイム自動更新（既定5秒）
- 常に手前に表示
- 残高と各利用枠を要約するミニマムモード
- 閉じる・最小化でタスクトレイに常駐
- 使用率に応じたトレイインジケータ
- 二重起動防止と既存ウィンドウの再表示

## 対応環境

- Windows 10またはWindows 11（64ビット）
- CodexデスクトップアプリまたはCodex CLIを利用し、ローカルセッションが保存されている環境

## 使い方

1. [GitHub Releases](https://github.com/VolcaneGD/quota-glance/releases/latest)から`Quota-Glance-Windows-x64.exe`をダウンロードします。
2. 任意の場所から実行します。インストールは不要です。
3. 右上の`EN`または`JA`で表示言語を切り替えます。
4. `更新頻度`スライダーで自動更新を1〜60秒に調整できます。
5. 閉じるボタンまたは最小化ボタンで通知領域に格納します。
6. 通知領域のインジケータをクリックすると再表示されます。

完全に終了する場合は、通知領域のインジケータを右クリックして`終了`または`Quit`を選択してください。

## データ取得と制約

Quota Glanceは認証トークンやAPIキーを読みません。`%CODEX_HOME%\sessions`、または未設定時の`%USERPROFILE%\.codex\sessions`にCodex自身が保存した最新の`rate_limits`情報だけを抽出します。テレメトリー、広告、解析機能はありません。

表示値は「Codexが最後に利用状況をローカルへ記録した時点」の情報です。独立した公式APIからリアルタイム取得しているわけではありません。Codexを利用していない間にサーバー側だけで値が変わった場合は、次にCodexが応答を受け取ったときに同期されます。また、将来Codexのローカル記録形式が変更された場合、一時的に値を取得できなくなる可能性があります。

### リセット可能性の通知

アプリは既定でGoogleアラートRSSから生成された公開JSONフィードを定期的に取得します。フィードには、直近3日以内に検知された告知の投稿IDと、アプリ側の検知時刻だけが含まれます。RSSやXの投稿本文、画像、作者情報、投稿時刻は保存・配布・表示しません。利用者は任意で自分のX API Bearer Tokenを登録し、端末上で直接確認する方式へ切り替えられます。トークンはWindowsの暗号化ストレージにだけ保存され、X APIへの通信以外には使用されません。

フィードを運用する開発者は、リポジトリの`GOOGLE_ALERT_RSS_URL` Actions secretを設定してください。RSS URLはGitHub Actions内でのみ使用し、生成される公開フィードには含まれません。

## Windowsの警告について

現在の配布版はコード署名されていません。Windows SmartScreenが警告を表示する場合があります。配布ページに掲載されたSHA-256チェックサムとダウンロードファイルの値を照合してください。

## 開発

```powershell
npm.cmd install
npm.cmd test
npm.cmd start
```

公開用実行ファイルとチェックサムを生成する場合：

```powershell
npm.cmd run release
```

## ライセンス

[MIT License](LICENSE) © 2026 VOLCANE

プライバシーについては[PRIVACY.md](PRIVACY.md)、商標と非公式ツールの表示については[NOTICE.md](NOTICE.md)を参照してください。

---

## English

Quota Glance is an unofficial freeware utility for Windows that displays usage information recorded locally by Codex in a compact always-available window.

It shows the remaining credit balance, five-hour and weekly usage windows, separate reset times, and countdowns. When a qualifying public announcement is available, it can also show a reset advisory card. The interface and tray menu can be switched between Japanese and English. Quota Glance does not read authentication tokens or use analytics.

The advisory reads a public JSON feed generated from Google Alerts RSS by default. It contains only an eligible Post ID and the app's detection time for announcements detected during the preceding three days; it does not store, distribute, or display RSS or X post text, media, author data, or post timestamps. Users may optionally save their own X API Bearer Token in Windows encrypted storage to perform a direct local check. No card is shown when no recent announcement is available. A displayed card is hidden when the weekly quota returns to 100%, or 48 hours after it was first displayed. Usage or credit-balance changes do not extend that 48-hour timer.

Quota Glance is independently developed by VOLCANE. It is not provided, endorsed, sponsored, or supported by OpenAI. See [PRIVACY.md](PRIVACY.md), [NOTICE.md](NOTICE.md), and [LICENSE](LICENSE) for details.

Download the latest Windows build from [GitHub Releases](https://github.com/VolcaneGD/quota-glance/releases/latest).
