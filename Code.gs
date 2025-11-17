/**
 * =============================================================================
 * Code.gs - メインエントリーポイント
 * =============================================================================
 * * このファイルは、Google Apps Script Webアプリケーションのメインエントリーポイントです。
 * doGet()関数でHTMLを配信し、クライアントから呼び出されるAPI関数を提供します。
 * * 【設計方針】
 * - すべてのAPI関数はtry-catchでラップし、統一されたレスポンス形式を返す
 * - エラーハンドリングを徹底し、クライアントに適切なエラーメッセージを返す
 * - ログ出力で動作を追跡可能にする
 */

// =============================================================================
// Webアプリケーションのエントリーポイント
// =============================================================================

/**
 * Webアプリケーションのメインハンドラー（SPA方式）
 * @param {Object} e - イベントオブジェクト
 * @returns {HtmlOutput} HTMLOutput
 */
function doGet(e) {
  try {
    logMessage('INFO', 'doGet: アプリケーションアクセス開始 (SPA方式)');

    // ページパラメータを安全に取得（デフォルトは'dispatch-plan'）
    let page = 'dispatch-plan';

    if (e && e.parameter && e.parameter.page) {
      page = e.parameter.page;
      logMessage('INFO', 'doGet: ページパラメータ取得 - ' + page);
    } else {
      logMessage('INFO', 'doGet: デフォルトページを使用 - ' + page);
    }

    // ページ名のバリデーション
    const allowedPages = ['request-form', 'request-list', 'dispatch-plan'];
    if (!allowedPages.includes(page)) {
      logMessage('WARN', 'doGet: 無効なページ名 - ' + page + ' → デフォルトに変更');
      page = 'dispatch-plan';
    }

    // ★★★ SPA方式: index.htmlを読み込む（常に同じエントリーポイント） ★★★
    const template = HtmlService.createTemplateFromFile('index');

    // テンプレート変数を設定
    template.appName = APP_NAME;
    template.appVersion = APP_VERSION;
    template.baseUrl = ScriptApp.getService().getUrl();
    template.currentPage = page;

    logMessage('INFO', 'doGet: テンプレート評価開始 - index.html (currentPage=' + page + ')');

    // HTMLを評価して返す
    const output = template.evaluate()
      .setTitle(APP_NAME + ' - ' + getPageTitle(page))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

    logMessage('INFO', 'doGet: HTML生成成功');
    return output;

  } catch (error) {
    logMessage('ERROR', 'doGet: ' + error.toString());
    logMessage('ERROR', 'doGet: スタックトレース - ' + error.stack);

    return HtmlService.createHtmlOutput(
      '<h1>エラーが発生しました</h1>' +
      '<p><strong>エラーメッセージ:</strong> ' + error.message + '</p>' +
      '<p><strong>詳細:</strong> ' + error.toString() + '</p>' +
      '<p>GAS実行ログを確認してください。</p>'
    );
  }
}

/**
 * ページタイトルを取得
 * @param {string} page - ページ名
 * @returns {string} ページタイトル
 */
function getPageTitle(page) {
  const titles = {
    'request-form': '依頼登録',
    'request-list': '依頼一覧',
    'dispatch-plan': '配車計画'
  };
  return titles[page] || '配車計画';
}

/**
 * ★★★ SPA方式: ページコンテンツを動的に取得 ★★★
 * クライアント側からgoogle.script.runで呼び出される
 * @param {string} pageName - ページ名 ('request-form', 'request-list', 'dispatch-plan')
 * @returns {string} ページコンテンツのHTML
 */
function getPageContent(pageName) {
  try {
    logMessage('INFO', 'getPageContent: ページコンテンツ取得開始 - ' + pageName);

    // ページ名のバリデーション
    const validPages = ['request-form', 'request-list', 'dispatch-plan'];
    if (!validPages.includes(pageName)) {
      logMessage('WARN', 'getPageContent: 無効なページ名 - ' + pageName);
      return '<div class="card red lighten-4"><div class="card-content">' +
             '<p class="red-text"><i class="material-icons left">error</i>エラー: 無効なページ名です</p>' +
             '</div></div>';
    }

    // -content.htmlファイルを読み込む
    const filename = pageName + '-content';
    const template = HtmlService.createTemplateFromFile(filename);
    const content = template.evaluate().getContent();

    logMessage('INFO', 'getPageContent: ページコンテンツ取得成功 - ' + filename + ' (length: ' + content.length + ')');
    return content;

  } catch (error) {
    logMessage('ERROR', 'getPageContent: ページコンテンツ取得失敗 - ' + pageName);
    logMessage('ERROR', 'getPageContent: エラー詳細 - ' + error.toString());

    return '<div class="card red lighten-4"><div class="card-content">' +
           '<h5 class="red-text"><i class="material-icons left">error</i>ページの読み込みに失敗しました</h5>' +
           '<p><strong>ページ名:</strong> ' + pageName + '</p>' +
           '<p><strong>エラー:</strong> ' + error.message + '</p>' +
           '<p>GAS実行ログを確認してください。</p>' +
           '</div></div>';
  }
}

/**
 * HTMLファイルのインクルード関数
 * @param {string} filename - ファイル名（拡張子なし）
 * @returns {string} HTMLコンテンツ
 */
function include(filename) {
  try {
    logMessage('INFO', 'include: ファイル読み込み開始 - ' + filename);
    const content = HtmlService.createHtmlOutputFromFile(filename).getContent();
    logMessage('INFO', 'include: ファイル読み込み成功 - ' + filename + ' (length: ' + content.length + ')');
    return content;
  } catch (error) {
    logMessage('ERROR', 'include: ファイル読み込み失敗 - ' + filename);
    logMessage('ERROR', 'include: エラー詳細 - ' + error.toString());
    return '<div style="padding: 20px; background-color: #ffebee; border: 1px solid #f44336; border-radius: 4px;">' +
           '<h3 style="color: #d32f2f; margin-top: 0;">ファイルの読み込みに失敗しました</h3>' +
           '<p><strong>ファイル名:</strong> ' + filename + '</p>' +
           '<p><strong>エラー:</strong> ' + error.message + '</p>' +
           '<p>ファイル名が正しいか、GASプロジェクトにファイルが存在するか確認してください。</p>' +
           '</div>';
  }
}

// =============================================================================
// クライアントAPIエンドポイント - マスタデータ取得
// =============================================================================

/**
 * すべての荷主データを取得（API）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetAllShippers() {
  try {
    const shippers = getAllShippers();
    return {
      success: true,
      data: shippers,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetAllShippers: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * すべての車両データを取得（API）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetAllVehicles() {
  try {
    const vehicles = getAllVehicles();
    return {
      success: true,
      data: vehicles,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetAllVehicles: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * ユニークな依頼車種リストを取得（API）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetUniqueRequestTypes() {
  try {
    const types = getUniqueRequestTypes();
    return {
      success: true,
      data: types,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetUniqueRequestTypes: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * ★★★ NEW: ユニークな住所リストを取得（API）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetUniqueAddresses() {
  try {
    const addresses = getUniqueAddresses();
    return {
      success: true,
      data: addresses,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetUniqueAddresses: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * ★★★ NEW: 荷主のお気に入り情報を取得（API）
 * @param {string} shipperId - 荷主ID
 * @returns {Object} { success: boolean, data: Object, message: string }
 */
function apiGetShipperFavorites(shipperId) {
  try {
    const favorites = getShipperFavorites(shipperId);
    return {
      success: true,
      data: favorites,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetShipperFavorites: ' + error.toString());
    return {
      success: false,
      data: {},
      message: error.message
    };
  }
}

// =============================================================================
// クライアントAPIエンドポイント - 依頼データ操作
// =============================================================================

/**
 * ★★★ NEW: 依頼IDで単一の依頼データを取得（API）
 * @param {string} requestId - 取得する依頼ID
 * @returns {Object} { success: boolean, data: Object, message: string }
 */
function apiGetRequestById(requestId) {
  try {
    const request = getRequestById(requestId);
    
    if (!request) {
      return {
        success: false,
        data: null,
        message: '依頼データが見つかりません'
      };
    }
    
    // 日付をISO文字列に変換（JSONシリアライズ対応）
    const serializedRequest = {
      ...request,
      receivedDate: formatDate(request.receivedDate, 'yyyy-MM-dd'),
      loadDate: formatDate(request.loadDate, 'yyyy-MM-dd'),
      loadTime: formatTime(request.loadTime, 'HH:mm'),
      unloadDate: formatDate(request.unloadDate, 'yyyy-MM-dd'),
      unloadTime: formatTime(request.unloadTime, 'HH:mm')
    };
    
    return {
      success: true,
      data: serializedRequest,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetRequestById: ' + error.toString());
    return {
      success: false,
      data: null,
      message: error.message
    };
  }
}


/**
 * すべての依頼データを取得（API）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetAllRequests() {
  try {
    const requests = getAllRequests();
    
    // 日付をISO文字列に変換（JSONシリアライズ対応）
    const serializedRequests = requests.map(req => ({
      ...req,
      receivedDate: formatDate(req.receivedDate, 'yyyy-MM-dd'),
      loadDate: formatDate(req.loadDate, 'yyyy-MM-dd'),
      loadTime: formatTime(req.loadTime, 'HH:mm'),
      unloadDate: formatDate(req.unloadDate, 'yyyy-MM-dd'),
      unloadTime: formatTime(req.unloadTime, 'HH:mm')
    }));
    
    return {
      success: true,
      data: serializedRequests,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetAllRequests: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * ★★★ NEW: 指定日の配車確定済み依頼を取得（API）
 * @param {string} dateString - 対象日付 (YYYY-MM-DD)
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetAssignedRequestsByDate(dateString) {
  try {
    const targetDate = new Date(dateString);
    const requests = getAssignedRequestsByDate(targetDate);
    
    // 日付をISO文字列に変換
    const serializedRequests = requests.map(req => ({
      ...req,
      receivedDate: formatDate(req.receivedDate, 'yyyy-MM-dd'),
      loadDate: formatDate(req.loadDate, 'yyyy-MM-dd'),
      loadTime: formatTime(req.loadTime, 'HH:mm'),
      unloadDate: formatDate(req.unloadDate, 'yyyy-MM-dd'),
      unloadTime: formatTime(req.unloadTime, 'HH:mm')
    }));
    
    return {
      success: true,
      data: serializedRequests,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetAssignedRequestsByDate: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * 未配車の依頼データを取得（API）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetUnassignedRequests() {
  try {
    const requests = getUnassignedRequests();
    
    const serializedRequests = requests.map(req => ({
      ...req,
      receivedDate: formatDate(req.receivedDate, 'yyyy-MM-dd'),
      loadDate: formatDate(req.loadDate, 'yyyy-MM-dd'),
      loadTime: formatTime(req.loadTime, 'HH:mm'),
      unloadDate: formatDate(req.unloadDate, 'yyyy-MM-dd'),
      unloadTime: formatTime(req.unloadTime, 'HH:mm')
    }));
    
    return {
      success: true,
      data: serializedRequests,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetUnassignedRequests: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * 日付範囲で依頼データを取得（API）
 * @param {string} startDate - 開始日（YYYY-MM-DD）
 * @param {string} endDate - 終了日（YYYY-MM-DD）
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetRequestsByDateRange(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const requests = getRequestsByDateRange(start, end);
    
    const serializedRequests = requests.map(req => ({
      ...req,
      receivedDate: formatDate(req.receivedDate, 'yyyy-MM-dd'),
      loadDate: formatDate(req.loadDate, 'yyyy-MM-dd'),
      loadTime: formatTime(req.loadTime, 'HH:mm'),
      unloadDate: formatDate(req.unloadDate, 'yyyy-MM-dd'),
      unloadTime: formatTime(req.unloadTime, 'HH:mm')
    }));
    
    return {
      success: true,
      data: serializedRequests,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetRequestsByDateRange: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

/**
 * 新しい依頼を登録（API）
 * @param {string} requestDataJson - 依頼データのJSON文字列
 * @returns {Object} { success: boolean, requestId: string, message: string }
 */
function apiCreateRequest(requestDataJson) {
  try {
    // JSON文字列をパース
    const requestData = JSON.parse(requestDataJson);
    
    // 日付文字列をDateオブジェクトに変換
    if (requestData.receivedDate) {
      requestData.receivedDate = new Date(requestData.receivedDate);
    }
    if (requestData.loadDate) {
      requestData.loadDate = new Date(requestData.loadDate);
    }
    if (requestData.unloadDate) {
      requestData.unloadDate = new Date(requestData.unloadDate);
    }
    
    // 依頼を登録
    const result = createRequest(requestData);
    return result;
    
  } catch (error) {
    logMessage('ERROR', 'apiCreateRequest: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * ★★★ NEW: 依頼を更新（API）
 * @param {string} requestDataJson - 依頼データのJSON文字列（requestIdを含む）
 * @returns {Object} { success: boolean, message: string }
 */
function apiUpdateRequest(requestDataJson) {
  try {
    // JSON文字列をパース
    const requestData = JSON.parse(requestDataJson);
    
    // 日付文字列をDateオブジェクトに変換
    if (requestData.receivedDate) {
      requestData.receivedDate = new Date(requestData.receivedDate);
    }
    if (requestData.loadDate) {
      requestData.loadDate = new Date(requestData.loadDate);
    }
    if (requestData.unloadDate) {
      requestData.unloadDate = new Date(requestData.unloadDate);
    }
    
    // 依頼を更新
    const result = updateRequest(requestData);
    return result;
    
  } catch (error) {
    logMessage('ERROR', 'apiUpdateRequest: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * ★★★ NEW: 依頼を削除（API）
 * @param {string} requestId - 削除する依頼ID
 * @returns {Object} { success: boolean, message: string }
 */
function apiDeleteRequest(requestId) {
  try {
    const result = deleteRequest(requestId);
    return result;
  } catch (error) {
    logMessage('ERROR', 'apiDeleteRequest: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * ★★★ NEW: 複数の依頼を一括登録（API）
 * @param {string} requestsArrayJson - 依頼データ配列のJSON文字列
 * @returns {Object} { success: boolean, requestIds: Array, message: string }
 */
function apiCreateRequestBatch(requestsArrayJson) {
  try {
    // JSON文字列をパース
    const requestsArray = JSON.parse(requestsArrayJson);

    // 各依頼の日付文字列をDateオブジェクトに変換
    const parsedRequests = requestsArray.map(requestData => {
      const parsed = { ...requestData };
      if (parsed.receivedDate) {
        parsed.receivedDate = new Date(parsed.receivedDate);
      }
      if (parsed.loadDate) {
        parsed.loadDate = new Date(parsed.loadDate);
      }
      if (parsed.unloadDate) {
        parsed.unloadDate = new Date(parsed.unloadDate);
      }
      return parsed;
    });

    // 一括登録を実行
    const result = createRequestBatch(parsedRequests);
    return result;

  } catch (error) {
    logMessage('ERROR', 'apiCreateRequestBatch: ' + error.toString());
    return {
      success: false,
      requestIds: [],
      message: error.message
    };
  }
}


/**
 * 依頼に車両を割り当て（API）
 * @param {string} requestId - 依頼ID
 * @param {string} vehicleNumber - 車両ナンバー
 * @returns {Object} { success: boolean, message: string }
 */
function apiAssignVehicle(requestId, vehicleNumber) {
  try {
    const result = assignVehicleToRequest(requestId, vehicleNumber);
    return result;
  } catch (error) {
    logMessage('ERROR', 'apiAssignVehicle: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 依頼の車両割り当てを解除（API）
 * @param {string} requestId - 依頼ID
 * @returns {Object} { success: boolean, message: string }
 */
function apiUnassignVehicle(requestId) {
  try {
    const result = unassignVehicleFromRequest(requestId);
    return result;
  } catch (error) {
    logMessage('ERROR', 'apiUnassignVehicle: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 指定された依頼に割り当て可能な車両を取得（API）
 * @param {string} requestDataJson - 依頼データのJSON文字列
 * @returns {Object} { success: boolean, data: Array, message: string }
 */
function apiGetAvailableVehicles(requestDataJson) {
  try {
    const requestData = JSON.parse(requestDataJson);
    
    // 日付文字列をDateオブジェクトに変換
    if (requestData.loadDate) {
      requestData.loadDate = new Date(requestData.loadDate);
    }
    if (requestData.unloadDate) {
      requestData.unloadDate = new Date(requestData.unloadDate);
    }
    
    const vehicles = getAvailableVehiclesForRequest(requestData);
    
    return {
      success: true,
      data: vehicles,
      message: ''
    };
  } catch (error) {
    logMessage('ERROR', 'apiGetAvailableVehicles: ' + error.toString());
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// =============================================================================
// 設定・情報取得
// =============================================================================

/**
 * アプリケーション情報を取得（API）
 * @returns {Object} アプリケーション情報
 */
function apiGetAppInfo() {
  return {
    success: true,
    data: {
      appName: APP_NAME,
      version: APP_VERSION,
      timezone: TIMEZONE
    },
    message: ''
  };
}

// =============================================================================
// テスト関数
// =============================================================================

/**
 * データベース接続テスト
 * @returns {Object} テスト結果
 */
function testDatabaseConnection() {
  try {
    const ss = getSpreadsheet();
    const sheetsInfo = Object.entries(SHEET_NAMES).map(([key, sheetName]) => {
      try {
        const sheet = ss.getSheetByName(sheetName);
        return {
          name: sheetName,
          exists: !!sheet,
          rows: sheet ? sheet.getLastRow() : 0
        };
      } catch (error) {
        return {
          name: sheetName,
          exists: false,
          error: error.message
        };
      }
    });
    
    return {
      success: true,
      message: 'データベース接続成功',
      sheets: sheetsInfo
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * すべてのテストを実行
 */
function runAllTests() {
  Logger.log('=== テスト開始 ===');
  
  // データベース接続テスト
  const dbTest = testDatabaseConnection();
  Logger.log('データベーステスト: ' + (dbTest.success ? 'PASS' : 'FAIL'));
  logData('データベース情報', dbTest);
  
  // ユーティリティ関数テスト
  const emailTest = isValidEmail('test@example.com');
  Logger.log('メールバリデーション: ' + (emailTest ? 'PASS' : 'FAIL'));
  
  const dateTest = formatDate(new Date(), 'yyyy-MM-dd');
  Logger.log('日付フォーマット: ' + (dateTest ? 'PASS' : 'FAIL'));
  
  Logger.log('=== テスト完了 ===');
}