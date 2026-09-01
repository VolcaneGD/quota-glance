# プライバシーポリシー / Privacy Policy

最終更新日: 2026年9月1日

## 日本語

Quota Glanceは、利用者の個人情報、認証情報、利用統計を収集・保存・送信しません。広告、テレメトリー、クラッシュレポート、アクセス解析機能も含みません。

本ソフトウェアは、利用状況を表示するため、利用者の端末内にあるCodexのローカルセッションファイルを読み取ります。読み取った内容から利用上限、リセット日時、クレジット状態に関する`rate_limits`情報だけを抽出し、端末内の画面とタスクトレイに表示します。セッション本文、プロンプト、回答、認証トークン、APIキーを外部へ送信することはありません。

表示言語の設定とリセット通知の表示状態は端末内だけで保存されます。リセット可能性の通知機能では、公開JSONフィードを定期取得します。この通信には通常のネットワーク接続情報（IPアドレスなど）が配信元に届く可能性がありますが、認証情報、Codexセッションの内容、利用量、端末識別子を送信しません。フィードは公開されたOpenAI関連告知を補助的に表示するためだけに使用します。

## English

Quota Glance does not collect, store, or transmit personal information, credentials, or usage analytics. It contains no advertising, telemetry, crash reporting, or analytics services.

To display usage information, the software reads Codex session files stored locally on the user's device. It extracts only `rate_limits` information related to usage limits, reset times, and credit status for local display in the window and system tray. It does not transmit session content, prompts, responses, authentication tokens, or API keys.

The selected language and reset-advisory display state are stored only on the device. For the optional reset-advisory feature, the app periodically fetches a public JSON feed. The feed contains only a qualifying Post ID and the app's detection time; it does not contain post text, media, author data, or post timestamps. Its host may receive ordinary network connection data such as an IP address, but the app does not transmit credentials, Codex session content, usage values, or device identifiers. The feed is used only to display a supplemental advisory based on public OpenAI-related announcements.

Publisher: VOLCANE

Website: https://volcane.pages.dev/
