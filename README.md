# 配車計画支援アプリ

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)](https://script.google.com/)
[![Materialize CSS](https://img.shields.io/badge/Materialize-ee6e73?style=flat&logo=materialdesign&logoColor=white)](https://materializecss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

物流・運送業向けのWebベース配車管理システムです。Google Apps Script (GAS) とGoogle Spreadsheetをデータベースとして使用し、配送依頼の登録から車両割り当て、運転手への自動通知まで一元管理できます。完全Webベースで動作し、サーバー構築不要で導入できます。

![App Version](https://img.shields.io/badge/version-3.3-blue)

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

### 1. 依頼登録・編集 (SCR-01)
- **新規登録**: 荷主からの配送依頼を登録
- **編集モード**: 既存依頼の内容を修正
- **削除機能**: 不要な依頼を削除（依頼一覧画面から）
- **積込・荷卸の詳細情報入力**: 日付、時間、場所1・場所2、品名
- **依頼車種の指定**: 大型、中型などの車種を選択
- **リアルタイムバリデーション**: 必須項目チェック、日付整合性確認
- **住所オートコンプリート** (v3.3新機能): 過去の入力履歴から自動補完
- **荷主別お気に入り機能** (v3.3新機能): 荷主選択時に最頻値を自動表示

### 2. 依頼一覧 (SCR-02)
- **一覧表示**: 登録済み依頼をテーブル形式で表示
- **多様なフィルタリング機能**:
  - 積込日（期間指定: 開始日〜終了日）
  - 荷主別フィルター
  - ステータス別（配車済/未配車/すべて）
- **アクション**: 各行から編集・削除ボタンで直接操作
- **ステータス表示**: チップで配車済/未配車を色分け表示
- **件数表示**: フィルター適用後の件数をリアルタイム表示

### 3. 配車計画 (SCR-03)
- **2タブ構成**:
  - **当日の配送計画タブ**: 本日の配車確定済み依頼を車両ごとに表示
  - **当日以降の積み込み計画タブ**: 未配車依頼を一覧表示し、車両を割り当て
- **インテリジェント車両マッチング**:
  - 車種適合チェック（車両マスタの「対応可能依頼」との照合）
  - 稼働状況の自動確認
  - 期間重複の検出（積込日〜荷卸日の範囲で重複チェック）
- **ワンクリック車両割り当て**: 利用可能な車両のみ表示し、ボタン一つで割り当て
- **配車解除機能**: 当日タブから配車を解除し、未配車に戻す

### 4. 日次通知バッチ
- **翌日の配車計画を自動メール送信**: 毎日18:00に実行（Config.gsでカスタマイズ可能）
- **運転手ごとに集計・分類**: 車両ナンバー単位で依頼を集約
- **PDF形式の配車計画書を添付**: HTMLからPDF生成し、メールに添付
- **HTML形式の見やすいメール本文**: テーブル形式で業務内容を表示
- **車両マスタのメールアドレス使用**: M_車両シートのメールアドレス列から送信先を取得
- **トリガー管理関数付き**: `setupDailyNotificationTrigger()` / `removeDailyNotificationTrigger()`

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
- **SPA (Single Page Application)** - ページ遷移なしの快適なUX、`getPageContent()`による動的HTML読み込み
- **レイヤードアーキテクチャ**:
  - **Presentation Layer** (app.html): ナビゲーション、UI制御、ページモジュール
  - **API Layer** (Code.gs): エントリーポイント、APIエンドポイント群
  - **Business Logic Layer** (DataHandler.gs): CRUD操作、ビジネスロジック
  - **Utility Layer** (Utils.gs): 共通関数、バリデーション
  - **Data Layer** (Google Spreadsheet): データ永続化
- **統一されたAPIレスポンス形式**: `{ success: boolean, data: any, message: string }`

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

#### 1. ページ遷移フロー (SPA)
```
[ユーザーがナビリンクをクリック]
    ↓
[Navigation.navigateToPage(pageName, state)]
    ↓
[google.script.run.getPageContent(pageName)]
    ↓
[Code.gs - getPageContent() 関数]
    ↓
[HtmlService.createTemplateFromFile(pageName + '-content')]
    ↓
[HTMLコンテンツを返却]
    ↓
[#page-content に HTML を挿入]
    ↓
[App.initPage(state) でページ初期化]
    ↓
[Materialize CSS コンポーネント初期化]
```

#### 2. データ操作フロー
```
[ユーザー操作（フォーム送信、ボタンクリック等）]
    ↓
[app.html - イベントハンドラー（RequestForm, RequestList, DispatchPlan）]
    ↓
[API.call(functionName, ...args) - Promise ベース]
    ↓
[google.script.run.apiXXX(...args)]
    ↓
[Code.gs - apiXXX() 関数（APIエンドポイント）]
    ↓
[DataHandler.gs - ビジネスロジック・CRUD操作]
    ├─ getAllRequests() / getUnassignedRequests()
    ├─ createRequest() / updateRequest() / deleteRequest()
    ├─ assignVehicleToRequest() / unassignVehicleFromRequest()
    └─ getAvailableVehiclesForRequest() (車種・期間チェック)
    ↓
[Utils.gs - 補助関数]
    ├─ getSpreadsheet() / getSheet() / getSheetData()
    ├─ validateRequestData()
    ├─ formatDate() / formatTime()
    ├─ isDateRangeOverlapping() (期間重複チェック)
    └─ generateRequestId() (採番)
    ↓
[Google Spreadsheet - データ読み書き]
    ├─ T_荷主依頼データ
    ├─ M_車両
    └─ M_荷主マスタ
    ↓
[レスポンス: { success: boolean, data: any, message: string }]
    ↓
[app.html - Promise 解決後の処理]
    ├─ UI.showSuccess() / UI.showError() (トースト通知)
    ├─ UI.showLoading() / UI.hideLoading() (ローディング表示)
    └─ ページ再読み込み / テーブル再描画
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
├── README.md                          # このファイル (プロジェクトドキュメント)
├── appsscript.json                    # GAS設定ファイル (V8ランタイム、タイムゾーン等)
│
├── バックエンド (GAS)
│   ├── Config.gs                      # 設定定数 (スプレッドシートID、シート名、カラム定義)
│   ├── Code.gs                        # エントリーポイント (doGet、APIエンドポイント群)
│   ├── DataHandler.gs                 # データアクセス層 (CRUD操作、ビジネスロジック)
│   ├── Utils.gs                       # ユーティリティ関数 (日付処理、バリデーション、ID生成)
│   └── NotificationBatch.gs           # 日次通知バッチ (メール送信、PDF生成、トリガー管理)
│
└── フロントエンド (HTML)
    ├── index.html                     # SPAベーステンプレート (ナビゲーション、フッター)
    ├── app.html                       # クライアントロジック (app.js: API通信、UI制御、ページモジュール)
    ├── styles.html                    # カスタムCSS (レイアウト、カード、テーブル等のスタイル)
    │
    └── ページコンテンツ (SPA用の動的読み込みHTML)
        ├── request-form-content.html     # 依頼登録・編集画面 (フォーム、オートコンプリート)
        ├── request-list-content.html     # 依頼一覧画面 (テーブル、フィルター、編集・削除ボタン)
        └── dispatch-plan-content.html    # 配車計画画面 (2タブ: 当日計画/未配車依頼)
```

### ファイルの役割詳細

| ファイル | 役割 | 主要機能 | 重要度 |
|---------|------|---------|-------|
| **Config.gs** | 設定定数管理 | スプレッドシートID、シート名、カラムインデックス定義、エラーメッセージ | ⭐⭐⭐ |
| **Code.gs** | APIエンドポイント | doGet()、getPageContent()、api* 関数群（30以上のAPI関数） | ⭐⭐⭐ |
| **DataHandler.gs** | データアクセス層 | getAllRequests()、createRequest()、assignVehicleToRequest()、getAvailableVehiclesForRequest() 等 | ⭐⭐⭐ |
| **Utils.gs** | ユーティリティ | getSpreadsheet()、formatDate()、validateRequestData()、isDateRangeOverlapping()、generateRequestId() | ⭐⭐⭐ |
| **NotificationBatch.gs** | 日次通知 | sendDailyDispatchNotifications()、createDispatchPlanPdf()、setupDailyNotificationTrigger() | ⭐⭐ |
| **index.html** | SPAベース | ナビゲーションバー、モバイルメニュー、フッター、APP_CONFIG定義 | ⭐⭐⭐ |
| **app.html** | クライアントロジック | Navigation、API、UI、RequestForm、RequestList、DispatchPlan モジュール (1380行) | ⭐⭐⭐ |
| **styles.html** | スタイル定義 | カスタムCSS（カード、テーブル、ローディング、レスポンシブ対応） | ⭐⭐ |
| **request-form-content.html** | 依頼フォーム | 入力フォーム、住所オートコンプリート、日付・時刻ピッカー | ⭐⭐⭐ |
| **request-list-content.html** | 依頼一覧 | テーブル表示、フィルター、編集・削除ボタン | ⭐⭐⭐ |
| **dispatch-plan-content.html** | 配車計画 | 2タブUI、未配車カード、車両選択パネル | ⭐⭐⭐ |

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

## 💡 実装詳細・技術ノート

### 1. ID生成ロジック (Utils.gs)
依頼IDは `generateRequestId()` 関数で自動採番されます。
- **フォーマット**: `REQ{YYYYMMDD}-{連番4桁}`
- **例**: `REQ20251117-0001`
- **採番方式**: 日付ごとに連番をリセット（当日の最大連番+1）

### 2. 車両割り当てロジック (DataHandler.gs)
`getAvailableVehiclesForRequest()` 関数が以下の条件で利用可能な車両を抽出します:
1. **車種適合チェック**: 車両マスタの「対応可能依頼」列(カンマ区切り)に依頼車種が含まれるか
2. **期間重複チェック**: `isDateRangeOverlapping()` により、積込日〜荷卸日の範囲で他の依頼と重複していないか

### 3. SPA実装方式 (index.html, app.html)
- **初回レンダリング**: `doGet()` が `index.html` を評価し、初期ページの `getPageContent(currentPage)` を埋め込み
- **ページ遷移**: `Navigation.navigateToPage()` が `google.script.run.getPageContent(pageName)` を呼び出し、HTMLを動的に取得
- **状態管理**: `AppState` オブジェクトでマスタデータ、選択中の依頼などを保持
- **ナビゲーション重複防止**: `_navigating` フラグで連続クリックを防止

### 4. 日付シリアライゼーション (Code.gs)
GASとクライアント間でDateオブジェクトをやり取りする際の注意点:
- **GAS → Client**: `formatDate()` / `formatTime()` でISO文字列に変換
- **Client → GAS**: `new Date(dateString)` でDateオブジェクトに復元
- **理由**: `google.script.run` はDateオブジェクトを直接シリアライズできないため

### 5. PDF生成方式 (NotificationBatch.gs)
`createDispatchPlanPdf()` 関数の処理:
1. HTMLコンテンツを文字列として生成（テーブル、スタイル含む）
2. `Utilities.newBlob(htmlContent, 'text/html')` でHTML Blobを作成
3. `.getAs('application/pdf')` でPDFに変換
4. `.setName()` でファイル名を設定し、メール添付

### 6. オートコンプリート実装 (app.html, v3.3)
Materialize CSS の Autocomplete コンポーネントを使用:
- **データソース**: `apiGetUniqueAddresses()` でT_荷主依頼データから過去の住所を取得
- **対象フィールド**: 積込地1/2、荷卸地1/2
- **オプション**: `minLength: 1`（1文字から候補表示）、`limit: 5`（最大5件表示）

### 7. トリガー管理 (NotificationBatch.gs)
日次通知のトリガー設定:
```javascript
// トリガーの作成
setupDailyNotificationTrigger()  // 毎日18時に sendDailyDispatchNotifications() を実行

// トリガーの削除
removeDailyNotificationTrigger()
```

### 8. エラーハンドリング方針
- **すべてのAPI関数**: try-catch でラップし、`{ success: false, message: error.message }` を返却
- **クライアント側**: `API.call()` が Promise を返し、失敗時は reject
- **ユーザーへのフィードバック**: `UI.showError()` / `UI.showSuccess()` でトースト通知

### 9. パフォーマンス最適化
- **一括取得**: `getAllRequests()` で全件取得後、クライアント側でフィルタリング
- **Promiseの並列実行**: マスタデータ取得時に `Promise.all([...])` を使用
- **キャッシュ**: `AppState` にマスタデータをキャッシュし、ページ遷移時に再利用

---

## 🚀 今後の拡張案

- [ ] ダッシュボード機能（配車率の可視化、月次レポート）
- [ ] カレンダービュー（カレンダー形式で配車計画を表示）
- [ ] ドライバーアプリ（モバイル対応、スマホから配車確認・完了報告）
- [ ] GPS連携（リアルタイム位置追跡）
- [ ] 売上・経費管理（運送売上、燃料費等の自動計算）
- [ ] デジタコデータの自動取り込み（運行記録の自動入力）
- [ ] 多言語対応（英語、中国語等）
- [ ] CSVエクスポート/インポート機能
- [ ] 車両稼働率分析レポート
- [ ] プッシュ通知（LINE連携等）

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
**最終更新**: 2025年11月17日
**バージョン**: 3.3 (住所オートコンプリート機能追加)

---

## 📊 技術仕様サマリー

| 項目 | 詳細 |
|------|------|
| **ランタイム** | Google Apps Script V8 |
| **言語** | JavaScript (ES6+), HTML5, CSS3 |
| **データベース** | Google Spreadsheet (3シート) |
| **UIフレームワーク** | Materialize CSS 1.0.0 |
| **アーキテクチャ** | SPA (Single Page Application) |
| **通信方式** | `google.script.run` (非同期Promise) |
| **認証** | Google OAuth (自動) |
| **デプロイ** | Webアプリ (executeAs: USER_ACCESSING) |
| **総コード量** | 約3,500行 (GAS: 1,200行 / HTML+JS: 2,300行) |

---

## 🏆 主要な技術的特徴

1. **完全サーバーレス**: インフラ構築不要、GASのみで動作
2. **リアルタイムデータ同期**: Spreadsheetを直接読み書きし、常に最新データを表示
3. **レスポンシブデザイン**: PC・タブレット・スマホ対応
4. **エラーハンドリング**: 全API関数で統一されたエラー処理
5. **拡張性**: モジュール化された設計で機能追加が容易
6. **日本語完全対応**: UI、ログ、エラーメッセージすべて日本語
