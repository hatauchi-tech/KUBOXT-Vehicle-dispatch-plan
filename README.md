# 配車計画支援アプリ

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)](https://script.google.com/)
[![Materialize CSS](https://img.shields.io/badge/Materialize-ee6e73?style=flat&logo=materialdesign&logoColor=white)](https://materializecss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

物流・運送業向けのWebベース配車管理システムです。Google Apps ScriptとGoogle Spreadsheetを使用して、配送依頼の登録から車両割り当て、運転手への自動通知まで一元管理できます。

![App Version](https://img.shields.io/badge/version-1.0.0-blue)

---

## 📋 目次

- [機能](#-機能)
- [技術スタック](#-技術スタック)
- [アーキテクチャ](#-アーキテクチャ)
- [セットアップ](#-セットアップ)
- [使用方法](#-使用方法)
- [ファイル構成](#-ファイル構成)
- [設定方法](#-設定方法)
- [トラブルシューティング](#-トラブルシューティング)
- [ライセンス](#-ライセンス)

---

## 🚀 機能

### 1. 依頼登録 (SCR-01)
- 荷主からの配送依頼を登録
- 積込・荷卸の詳細情報入力
- 依頼車種の指定
- リアルタイムバリデーション

### 2. 依頼一覧 (SCR-02)
- 登録済み依頼の一覧表示
- 多様なフィルタリング機能
  - 積込日（期間指定）
  - 荷主別
  - ステータス別（配車済/未配車）
- ソート・検索機能

### 3. 配車計画 (SCR-03)
- 未配車依頼の視覚的表示
- **インテリジェント車両マッチング**
  - 車種適合チェック
  - 稼働状況の自動確認
  - 期間重複の検出
- ワンクリック車両割り当て
- タブ切替（当日配送計画 / 今後の積込計画）

### 4. 日次通知バッチ
- 翌日の配車計画を自動メール送信
- 運転手ごとに集計・分類
- PDF形式の配車計画書を添付
- HTML形式の見やすいメール本文
- 毎日18:00に自動実行（カスタマイズ可能）

---

## 🛠️ 技術スタック

### バックエンド
- **Google Apps Script (GAS)** - サーバーサイドロジック
- **Google Spreadsheet** - データベース
- **V8 Runtime** - 最新のJavaScript構文対応

### フロントエンド
- **HTML5 / CSS3 / JavaScript (ES6+)**
- **Materialize CSS 1.0.0** - UIフレームワーク
- **Material Icons** - アイコンセット
- **Google Fonts** - タイポグラフィ

### アーキテクチャパターン
- **SPA (Single Page Application)** - ページ遷移なしの快適なUX
- **MVC風の構造** - Model(DataHandler) / View(HTML) / Controller(Code.gs, app.js)
- **RESTful API風の設計** - 統一されたレスポンス形式

---

## 🏗️ アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                      クライアント                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            index.html (SPA Base)                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │   Navigation (固定)                         │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │   #page-content (動的に切り替え)            │  │  │
│  │  │   - request-form-content.html              │  │  │
│  │  │   - request-list-content.html              │  │  │
│  │  │   - dispatch-plan-content.html             │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │   Footer (固定)                             │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            app.js (アプリロジック)                │  │
│  │  - Navigation Module                             │  │
│  │  - API Module                                    │  │
│  │  - UI Module                                     │  │
│  │  - Page Modules (RequestForm, RequestList, etc) │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ google.script.run
┌─────────────────────────────────────────────────────────┐
│                   Google Apps Script                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Code.gs (エントリーポイント・APIエンドポイント)  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  DataHandler.gs (データアクセス層)                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Utils.gs (ユーティリティ関数)                    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  NotificationBatch.gs (日次通知バッチ)            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Config.gs (設定定数)                             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Google Spreadsheet (データベース)            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  T_荷主依頼データ (トランザクション)               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  M_車両 (車両マスタ)                              │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  M_荷主マスタ (荷主マスタ)                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### データフロー

```
[ユーザー操作]
    ↓
[app.js - イベント処理]
    ↓
[API.call() - google.script.run]
    ↓
[Code.gs - apiXXX() 関数]
    ↓
[DataHandler.gs - データ操作]
    ↓
[Utils.gs - ユーティリティ]
    ↓
[Google Spreadsheet - CRUD]
    ↓
[レスポンス: { success, data, message }]
    ↓
[app.js - UI更新]
    ↓
[ユーザーへフィードバック]
```

---

## 📦 セットアップ

### 前提条件
- Googleアカウント
- Google Driveへのアクセス権限
- 基本的なスプレッドシート操作の知識

### 手順

#### 1. スプレッドシートの準備

新しいGoogle Spreadsheetを作成し、以下の3つのシートを作成してください。

**シート1: T_荷主依頼データ**

ヘッダー行（1行目）に以下を設定:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 依頼ID | 受付日 | 荷主 | 積込日 | 積込時間 | 積込地1 | 積込地2 | 品名 | 荷卸日 | 荷卸時間 | 荷卸地1 | 荷卸地2 | 依頼車種 | ナンバー | 車番 | 車種 | 運転手 |

**シート2: M_車両**

ヘッダー行（1行目）に以下を設定:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| ナンバー | 無線番号 | 積載量 | 車種 | 対応可能依頼 | 運転手 | 電話番号 | メールアドレス | 備考 |

**例:**
```
横浜501あ1234 | 101 | 10t | 大型トラック | 大型,中型 | 山田太郎 | 090-1234-5678 | yamada@example.com | 冷凍車
```

**シート3: M_荷主マスタ**

ヘッダー行（1行目）に以下を設定:

| A | B |
|---|---|
| 荷主ID | 荷主名 |

**例:**
```
C001 | 株式会社ABC物流
C002 | XYZ商事株式会社
```

#### 2. GASプロジェクトの作成

1. スプレッドシートから「拡張機能」→「Apps Script」を開く
2. デフォルトの`Code.gs`を削除
3. 本リポジトリの以下のファイルを順に追加:
   - `Config.gs`
   - `Code.gs`
   - `DataHandler.gs`
   - `Utils.gs`
   - `NotificationBatch.gs`
   - `index.html`
   - `app.html`
   - `styles.html`
   - `request-form-content.html`
   - `request-list-content.html`
   - `dispatch-plan-content.html`

#### 3. 設定の変更

`Config.gs`を開き、以下を変更:

```javascript
// スプレッドシートIDを取得（URLのd/とedit/の間の文字列）
// 例: https://docs.google.com/spreadsheets/d/【ここがID】/edit
const SPREADSHEET_ID = 'あなたのスプレッドシートID';

// メール設定（必要に応じて変更）
const EMAIL_CONFIG = {
  FROM_NAME: '配車計画システム',
  SUBJECT_PREFIX: '[配車計画]',
  CC_ADDRESS: '' // CCが必要な場合はメールアドレスを設定
};
```

#### 4. Webアプリとしてデプロイ

1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類: 「ウェブアプリ」を選択
3. 設定:
   - **説明**: 配車計画支援アプリ v1.0
   - **次のユーザーとして実行**: 自分（自分のアカウント）
   - **アクセスできるユーザー**: 
     - 組織内のみ: `DOMAIN`（推奨）
     - または 全員: `ANYONE`
4. 「デプロイ」をクリック
5. **URLをコピー**（このURLがアプリのアドレスになります）

#### 5. 権限の承認

初回アクセス時に権限の承認が必要です:
1. デプロイしたURLにアクセス
2. 「このアプリは確認されていません」→「詳細」→「（アプリ名）に移動」
3. 必要な権限を確認して「許可」

#### 6. 日次通知の設定（オプション）

運転手への自動メール送信を有効にする場合:

1. GASエディタで`NotificationBatch.gs`の`setupDailyNotificationTrigger()`関数を実行
   - 実行ログに「日次通知トリガーを設定しました」と表示されればOK
2. 確認: GASエディタの「トリガー」メニューで設定を確認できます
   - 関数: `sendDailyDispatchNotifications`
   - 実行時刻: 毎日18:00（変更可能）

**トリガーの削除方法:**
- `removeDailyNotificationTrigger()`関数を実行

---

## 📖 使用方法

### 依頼登録

1. ナビゲーションバーの「依頼登録」をクリック
2. 必須項目（*印）を入力:
   - 受付日（自動設定済み）
   - 荷主
   - 品名
   - 積込日・積込地
   - 荷卸日・荷卸地
   - 依頼車種
3. 「登録」ボタンをクリック
4. 依頼IDが自動採番され、成功メッセージが表示されます

### 依頼一覧の確認

1. 「依頼一覧」をクリック
2. フィルター機能で絞り込み:
   - 積込日の期間指定
   - 荷主別
   - ステータス（配車済/未配車）
3. 「絞り込み」をクリックして適用

### 配車計画（車両割り当て）

1. 「配車計画」をクリック
2. タブを選択:
   - **当日の配送計画**: 本日の配車状況を確認
   - **当日以降の積み込み計画**: 今後の未配車依頼を表示
3. 未配車依頼カードをクリック
4. 右側に**利用可能な車両**が自動表示されます
   - 車種が適合
   - かつ、期間が重複していない車両のみ表示
5. 車両の「割り当て」ボタンをクリック
6. 確認ダイアログで「OK」
7. 割り当て完了！依頼が未配車リストから消えます

---

## 📁 ファイル構成

```
KUBOXT-Vehicle-dispatch-plan/
│
├── README.md                          # このファイル
├── appsscript.json                    # GAS設定ファイル
│
├── バックエンド (GAS)
│   ├── Config.gs                      # 設定定数
│   ├── Code.gs                        # エントリーポイント・API
│   ├── DataHandler.gs                 # データアクセス層
│   ├── Utils.gs                       # ユーティリティ関数
│   └── NotificationBatch.gs           # 日次通知バッチ
│
├── フロントエンド (HTML)
│   ├── index.html                     # SPAベース（常に配信）
│   ├── app.html                       # クライアントロジック
│   ├── styles.html                    # カスタムCSS
│   │
│   ├── ページコンテンツ
│   │   ├── request-form-content.html     # 依頼登録画面
│   │   ├── request-list-content.html     # 依頼一覧画面
│   │   └── dispatch-plan-content.html    # 配車計画画面
│   │
│   └── 旧ファイル（参考用・削除可）
│       ├── request-form.html
│       ├── request-list.html
│       └── dispatch-plan.html
│
└── ドキュメント
    └── README.md
```

### ファイルの役割

| ファイル | 役割 | 重要度 |
|---------|------|-------|
| **Config.gs** | スプレッドシートIDやシート名などの設定 | ⭐⭐⭐ |
| **Code.gs** | doGet()、API関数、ページ配信 | ⭐⭐⭐ |
| **DataHandler.gs** | CRUD操作、ビジネスロジック | ⭐⭐⭐ |
| **Utils.gs** | 日付処理、バリデーション、ID生成 | ⭐⭐ |
| **NotificationBatch.gs** | メール送信、PDF生成 | ⭐ |
| **index.html** | SPAのベースHTML | ⭐⭐⭐ |
| **app.html** | クライアント側のメインロジック | ⭐⭐⭐ |
| **styles.html** | カスタムスタイル | ⭐⭐ |

---

## ⚙️ 設定方法

### 基本設定（Config.gs）

```javascript
// スプレッドシートID（必須）
const SPREADSHEET_ID = 'あなたのスプレッドシートID';

// シート名（変更した場合は修正）
const SHEET_NAMES = {
  REQUESTS: 'T_荷主依頼データ',
  VEHICLES: 'M_車両',
  SHIPPERS: 'M_荷主マスタ'
};

// アプリケーション名
const APP_NAME = '配車計画支援アプリ';
const APP_VERSION = '1.0.0';

// タイムゾーン
const TIMEZONE = 'Asia/Tokyo';

// 日次通知の実行時刻（0-23）
const NOTIFICATION_BATCH_HOUR = 18;

// メール設定
const EMAIL_CONFIG = {
  FROM_NAME: '配車計画システム',
  SUBJECT_PREFIX: '[配車計画]',
  CC_ADDRESS: '' // 必要に応じて設定
};
```

### デプロイ設定（appsscript.json）

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"  // または "ANYONE"
  }
}
```

**access の設定:**
- `DOMAIN`: 組織内のGoogleアカウントのみアクセス可能（推奨）
- `ANYONE`: 誰でもアクセス可能（URLを知っていれば）

---

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### ❌ 「スプレッドシートが見つかりません」エラー

**原因:** `Config.gs`のSPREADSHEET_IDが正しくない

**解決策:**
1. スプレッドシートを開く
2. URLから正しいIDをコピー
   ```
   https://docs.google.com/spreadsheets/d/【ここがID】/edit
   ```
3. `Config.gs`の`SPREADSHEET_ID`を更新
4. 再デプロイ

#### ❌ 「シートが見つかりません」エラー

**原因:** シート名が`Config.gs`の設定と一致していない

**解決策:**
1. スプレッドシートのシート名を確認
2. `Config.gs`の`SHEET_NAMES`と完全一致させる（大文字小文字も区別）

#### ❌ ページ遷移が動作しない

**原因:** ブラウザのJavaScriptがオフ、またはキャッシュの問題

**解決策:**
1. ブラウザのキャッシュをクリア（Ctrl+Shift+Del）
2. JavaScriptが有効になっているか確認
3. ページを強制再読み込み（Ctrl+F5）
4. 別のブラウザで試す

#### ❌ 車両が割り当てできない

**原因:** 以下のいずれか
- 車両の「対応可能依頼」に該当車種が含まれていない
- 車両が既に他の依頼に割り当てられている（期間重複）

**解決策:**
1. M_車両シートで車両情報を確認
2. 「対応可能依頼」列に必要な車種が含まれているか確認
   - 例: `大型,中型` （カンマ区切り、スペースなし）
3. 期間が重複している場合は、別の車両を選択

#### ❌ 日次通知メールが届かない

**原因:** 
- トリガーが設定されていない
- 車両マスタのメールアドレスが無効
- 実行権限の問題

**解決策:**
1. GASエディタの「トリガー」メニューで設定を確認
2. M_車両シートのメールアドレスを確認（正しい形式か）
3. 手動でテスト実行: `testSendNotification()`関数を実行
4. 実行ログでエラーメッセージを確認

#### ❌ 「権限が必要です」エラー

**原因:** スクリプトの実行権限が不足

**解決策:**
1. アプリのURLに再度アクセス
2. 「権限を確認」→「許可」
3. 必要に応じて管理者に承認を依頼

---

## 🐛 デバッグ方法

### ログの確認

GASエディタで「実行ログ」を確認:
1. GASエディタを開く
2. 「実行数」または「表示」→「ログ」
3. エラーメッセージやスタックトレースを確認

### ブラウザコンソールの確認

クライアント側のエラーを確認:
1. アプリを開く
2. F12キーでデベロッパーツールを開く
3. 「Console」タブでエラーメッセージを確認

### テスト関数の実行

`Code.gs`に用意されているテスト関数:
```javascript
// データベース接続テスト
testDatabaseConnection()

// すべてのテスト実行
runAllTests()

// 通知メールのテスト送信
testSendNotification()
```

---

## 🚀 今後の拡張案

- [ ] ダッシュボード機能（配車率の可視化）
- [ ] カレンダービュー
- [ ] ドライバーアプリ（モバイル対応）
- [ ] GPS連携
- [ ] 売上・経費管理
- [ ] デジタコデータの自動取り込み
- [ ] 多言語対応

---

## 🤝 貢献

バグ報告や機能提案は、Issuesまたはプルリクエストでお願いします。

---

## 📄 ライセンス

MIT License

Copyright (c) 2025 配車計画支援アプリ開発チーム

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 📞 サポート

質問や問題がある場合は、以下の方法でお問い合わせください:

- GitHub Issues: [プロジェクトのIssuesページ]
- メール: [サポートメールアドレス]

---

## 📚 参考リンク

- [Google Apps Script公式ドキュメント](https://developers.google.com/apps-script)
- [Materialize CSS公式サイト](https://materializecss.com/)
- [Google Spreadsheet API](https://developers.google.com/sheets/api)

---

**開発者**: はた (山陶)  
**最終更新**: 2025年11月6日  
**バージョン**: 1.0.0
