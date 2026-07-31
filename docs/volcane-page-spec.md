# Quota Glance 配布ページ仕様

`https://volcane.pages.dev/volc-icon-editor`と同じ情報設計で掲載するための完成原稿です。

## パンくず

Home / Quota Glance

## ヒーロー

- アイコン: `assets/icon.png`
- 製品名: `Quota Glance`
- 説明: `Codexの残りクレジット、週間使用率、次回リセットを小さく見やすく表示するデスクトップユーティリティ。`
- ボタン: `⬇ Download for Windows`
- リンク: `https://github.com/VolcaneGD/quota-glance/releases/latest/download/Quota-Glance-Windows-x64.exe`
- 注意書き: `※インストール不要。未署名のため、初回実行時にWindows SmartScreenの警告が表示される場合があります。`
- シェアボタン: `このツールをシェアする`
- スクリーンショット: `assets/quota-glance-screenshot-ja.png`

## Overview

「Quota Glance」は、Codexがローカルに記録した残りクレジット、週間利用上限、次回リセット日時を、コンパクトなウィンドウで確認するためのWindows向けフリーソフトです。ウィンドウは常に手前に表示でき、閉じたり最小化したりしてもタスクトレイへ常駐します。

## 主な機能

- **クレジット残高**: Codexが記録した最新の残りクレジットを表示。
- **週間利用上限**: 使用率と残り割合をプログレスバーで表示。
- **次回リセット**: 日本時間の日時とリセットまでの残り時間を表示。
- **日本語・英語**: ワンクリックで切り替え、選択内容を端末内に保存。
- **タスクトレイ常駐**: 使用率に応じたインジケータと、クリックによる再表示に対応。
- **ローカル完結**: 広告、テレメトリー、アクセス解析、外部へのデータ送信なし。

## 使い方

1. **ダウンロード**: 「Download for Windows」からポータブル版EXEを保存します。
2. **起動**: ダウンロードしたEXEを任意の場所から実行します。
3. **言語切替**: 右上の`EN`または`JA`を押します。
4. **常駐**: 閉じるまたは最小化でタスクトレイへ格納します。
5. **再表示・終了**: トレイアイコンをクリックして再表示し、右クリックメニューから完全終了できます。

## データについて

Quota GlanceはCodexの認証トークンやAPIキーを読みません。端末内のCodexセッションから利用状況に関する情報だけを読み取り、画面へ表示します。公式APIへ独自問い合わせするアプリではないため、表示はCodexが最後にローカルへ記録した時点の情報です。

## 動作環境

Windows 10 / 11（64bit）。CodexデスクトップアプリまたはCodex CLIを利用し、ローカルセッションが保存されている環境。

## 免責表示

Quota GlanceはVOLCANEが独立して開発した非公式ツールであり、OpenAIによる提供、承認、後援、提携、サポートを受けた製品ではありません。

## MORE DESKTOP APPS

既存のVOLC Icon Editor、VOLC Sprite Sheet Converterなどのカードへ接続します。
