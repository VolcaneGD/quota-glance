# Quota Glance

Quota Glanceは、Codexがローカルに記録した利用状況を小さな常駐ウィンドウで確認できる、Windows向けの非公式フリーソフトです。5時間枠と週間枠を同時に表示します。

> Quota GlanceはVOLCANEが独立して開発した非公式ツールです。OpenAIによる提供、承認、後援を受けた製品ではありません。

## 主な機能

- 残高・残りクレジット
- 5時間利用上限の残り割合と状態色（緑・黄・赤）
- 週間利用上限の残り割合と状態色（緑・黄・赤）
- 各制限枠のリセット日時（日本時間）と残り時間
- 確定リセット告知の予定・実施中・実施済み表示（予測は行いません）
- Windows通知、設定可能な事前通知（既定30分・10分前）、予定変更・実施済み通知
- 制限解除時の緑の発光演出と、リセット予定のWindows通知表示時の黄色の発光演出（下から上へ一度だけ通過。クレジット増加時は演出しません）
- 日本語・英語の表示切替と設定保存
- ファイル変更監視と1〜60秒で変更できるリアルタイム自動更新（既定5秒）
- 常に手前に表示
- 残高と各利用枠を要約するミニマムモード
- 通常ウィンドウの既定サイズは372×800。設定全体は折り畳み可能で、展開時は画面内で必要な高さまで拡大
- リセットスケジュールは週間情報とは独立したカードに表示。告知がない場合はカードを表示しません
- 閉じる・最小化でタスクトレイに常駐
- 使用率に応じたトレイインジケータ
- 二重起動防止と既存ウィンドウの再表示

同じ通常リセットの時刻到達と、その後の100%回復は一回のWindows通知として扱います。発光演出は初回読み込みや同じ値の再取得では再生せず、通常・ミニマム表示に対応します。Windowsのモーション軽減設定では短いフェードに切り替わります。

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

### 確定リセット告知とWindows通知

公開JSONとOpenAI公式ステータスRSSを60秒ごとに確認します。GoogleアラートRSSは補助検知用であり、検索結果の本文だけで「確定」と判定しません。任意のX APIを設定すると、自分のトークンで監視対象アカウントの原文と作者を確認できます（X側の料金が発生する場合があります）。トークンはWindowsで暗号化し、X API以外には送信しません。

直近3日以内の投稿だけを採用します。信頼できる原典で、リセット実施と対象範囲が明記され、推測表現を含まない場合に確定とします。予定は時刻・時間範囲・日付表現が必要です。時刻のない表現やタイムゾーン不明の時刻から予定時刻を推測しません。明示時刻はJST、相対時間は範囲で表示します。予定時刻を過ぎても実施済みとは自動判定しません。

通知は既定で確定告知のみです。「告知・Windows通知」を開くと検知時、事前通知の分数、実施済み・ローカル回復、参考情報の通知を設定できます。参考情報を通知するには「確定告知のみ」を解除し、「参考情報も通知」を有効にします。Windowsの通知テストもできます。通知をクリックするとアプリを開きます。同じ告知・通知種別は再起動しても繰り返し通知しません。設定・履歴は端末内に保存します。

5時間枠と週間枠の通知はそれぞれ有効・無効を切り替えられます。通常のリセット時刻到達とローカル記録での回復通知も個別設定に従います。時刻到達の通知は実際の利用枠回復を断定しません。告知に対象枠が書かれていない場合は共通告知として扱い、どちらかの枠が有効なら一度通知します。両方が無効なら告知通知も送りません。通常時刻はアプリが事前に記録した予定に限り、10分以上遅れて起動した場合は過去の時刻到達通知を出しません。

告知がない場合はカードを表示しません。カードは最初の取得から48時間で閉じます。予定カードは取得時点の残り100%だけでは閉じず、実施中・実施済みのカードは週間残り100%で閉じます。残り100%への回復はローカル記録の確認であり、OpenAI全体のリセット完了の証拠にはしません。

公開フィード（schema v3）には原典URL、作者、公開・検知日時、対象範囲、状態、時刻・範囲、確定度と改訂情報を含めます。投稿全文、画像、返信、RSS URL、APIトークンは公開しません。監視対象は `src/announcement-sources.json` で外部化しています。公式ステータスRSSと任意のX APIを監視し、Googleアラートに公式ページが含まれた場合は原典の本文・公開日を確認します。Help Center・ブログの監視ページは `officialPages` に追加できます。公式コミュニティの一般ユーザー投稿は自動で公式扱いにしません。Discord/Webhookは今回のWindows通知版には含みません。

GoogleアラートやGitHub Actionsには配信・実行の遅延があります。告知が出た瞬間の検知は保証できません。

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

Reset Announcement Watcher checks the public schema-v3 feed and official status RSS every 60 seconds. Google Alerts is a supplementary sensor and cannot independently confirm a reset. An optional user-owned X API token allows direct verification of configured accounts. Only posts published in the preceding three days are accepted. Explicit dates and timezones are preserved; relative times remain windows, and unspecified times are never predicted. Scheduled, active, completed, official incomplete and secondary information are distinguished.

Native Windows notifications default to confirmed announcements only. Detection, configurable 30/10-minute reminders, revisions, completion and local quota recovery are supported, with persistent deduplication. Local recovery is not proof of a global reset. Cards expire 48 hours after first acquisition; scheduled cards are not dismissed just because the quota was already full. Active/completed cards close at weekly 100%. No card appears without an announcement. Public metadata includes source, author, publication/detection times and classification, but never full post text, media, tokens or the private Alerts URL. Delivery depends on source and scheduler latency. Discord/Webhook delivery is not included in this release.

Quota Glance is independently developed by VOLCANE. It is not provided, endorsed, sponsored, or supported by OpenAI. See [PRIVACY.md](PRIVACY.md), [NOTICE.md](NOTICE.md), and [LICENSE](LICENSE) for details.

Download the latest Windows build from [GitHub Releases](https://github.com/VolcaneGD/quota-glance/releases/latest).
