/**
 * =============================================================================
 * Utils.gs - ユーティリティ関数集
 * =============================================================================
 * 
 * このファイルは、アプリケーション全体で使用される汎用的な関数を提供します。
 * 日付操作、ID生成、バリデーション、スプレッドシート操作などを含みます。
 * 
 * 【設計方針】
 * - 防御的プログラミング: すべての入力を検証し、エラーハンドリングを実装
 * - 単一責任の原則: 各関数は1つの明確な責任のみを持つ
 * - 再利用性: どの機能からも利用できる汎用的な設計
 */

// =============================================================================
// スプレッドシート操作関数
// =============================================================================

/**
 * スプレッドシートオブジェクトを取得
 * @returns {SpreadsheetApp.Spreadsheet} スプレッドシートオブジェクト
 * @throws {Error} スプレッドシートが見つからない場合
 */
function getSpreadsheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      throw new Error(ERROR_MESSAGES.SPREADSHEET_NOT_FOUND);
    }
    return ss;
  } catch (error) {
    Logger.log('Error in getSpreadsheet: ' + error.toString());
    throw new Error(ERROR_MESSAGES.SPREADSHEET_NOT_FOUND);
  }
}

/**
 * 指定されたシート名のシートを取得
 * @param {string} sheetName - 取得するシート名
 * @returns {SpreadsheetApp.Sheet} シートオブジェクト
 * @throws {Error} シートが見つからない場合
 */
function getSheet(sheetName) {
  // 入力検証
  if (!sheetName || typeof sheetName !== 'string') {
    throw new Error('シート名が不正です');
  }
  
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(ERROR_MESSAGES.SHEET_NOT_FOUND + sheetName);
    }
    
    return sheet;
  } catch (error) {
    Logger.log('Error in getSheet: ' + error.toString());
    throw error;
  }
}

/**
 * シートの全データを2次元配列で取得
 * @param {string} sheetName - シート名
 * @returns {Array<Array>} データの2次元配列（ヘッダー行を含む）
 */
function getSheetData(sheetName) {
  try {
    const sheet = getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    // データが存在しない場合は空配列を返す
    if (lastRow === 0 || lastCol === 0) {
      return [];
    }
    
    // 全データを取得（ヘッダー行を含む）
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    return data;
    
  } catch (error) {
    Logger.log('Error in getSheetData: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
  }
}

/**
 * シートのデータをオブジェクト配列として取得
 * @param {string} sheetName - シート名
 * @returns {Array<Object>} オブジェクトの配列（ヘッダー行をキーとする）
 */
function getSheetAsObjects(sheetName) {
  try {
    const data = getSheetData(sheetName);
    
    if (data.length === 0) {
      return [];
    }
    
    // 1行目をヘッダーとして使用
    const headers = data[0];
    
    // 2行目以降をデータとしてオブジェクト化
    const objects = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return objects;
    
  } catch (error) {
    Logger.log('Error in getSheetAsObjects: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
  }
}

/**
 * シートの最終行に新しいデータを追加
 * @param {string} sheetName - シート名
 * @param {Array} rowData - 追加する行データの配列
 * @returns {boolean} 成功した場合true
 */
function appendRowToSheet(sheetName, rowData) {
  // 入力検証
  if (!Array.isArray(rowData) || rowData.length === 0) {
    throw new Error('行データが不正です');
  }
  
  try {
    const sheet = getSheet(sheetName);
    sheet.appendRow(rowData);
    return true;
    
  } catch (error) {
    Logger.log('Error in appendRowToSheet: ' + error.toString());
    throw new Error(ERROR_MESSAGES.SAVE_ERROR + error.message);
  }
}

/**
 * 指定した行のデータを更新
 * @param {string} sheetName - シート名
 * @param {number} rowIndex - 行インデックス（1始まり）
 * @param {Array} rowData - 更新する行データの配列
 * @returns {boolean} 成功した場合true
 */
function updateRow(sheetName, rowIndex, rowData) {
  // 入力検証
  if (!rowIndex || rowIndex < 1) {
    throw new Error('行インデックスが不正です');
  }
  if (!Array.isArray(rowData) || rowData.length === 0) {
    throw new Error('行データが不正です');
  }
  
  try {
    const sheet = getSheet(sheetName);
    const range = sheet.getRange(rowIndex, 1, 1, rowData.length);
    range.setValues([rowData]);
    return true;
    
  } catch (error) {
    Logger.log('Error in updateRow: ' + error.toString());
    throw new Error(ERROR_MESSAGES.UPDATE_ERROR + error.message);
  }
}

// =============================================================================
// ID生成・採番関数
// =============================================================================

/**
 * 依頼IDを自動生成
 * @param {string} [prefix='REQ'] - プレフィックス
 * @returns {string} 生成された依頼ID (例: REQ20251029-0001)
 * @description 日付 + 連番形式でIDを生成
 */
function generateRequestId(prefix = 'REQ') {
  try {
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const lastRow = sheet.getLastRow();
    
    // 現在の日付を取得 (YYYYMMDD形式)
    const today = new Date();
    const dateStr = Utilities.formatDate(today, TIMEZONE, 'yyyyMMdd');
    
    // 本日のIDが既に存在するか確認
    let sequenceNumber = 1;
    
    if (lastRow > 1) {
      // 既存データから本日のIDを検索
      const data = sheet.getRange(2, REQUEST_COLUMNS.REQUEST_ID + 1, lastRow - 1, 1).getValues();
      const todayIds = data
        .flat()
        .filter(id => id && String(id).includes(dateStr));
      
      if (todayIds.length > 0) {
        // 最後の連番を取得して+1
        const lastId = todayIds[todayIds.length - 1];
        const lastSeq = parseInt(lastId.split('-')[1]) || 0;
        sequenceNumber = lastSeq + 1;
      }
    }
    
    // ID生成: プレフィックス + 日付 + ハイフン + 4桁連番
    const requestId = `${prefix}${dateStr}-${String(sequenceNumber).padStart(4, '0')}`;
    return requestId;
    
  } catch (error) {
    Logger.log('Error in generateRequestId: ' + error.toString());
    // エラーの場合はタイムスタンプベースのIDを返す
    return `${prefix}${new Date().getTime()}`;
  }
}

// =============================================================================
// 日付・時刻関数
// =============================================================================

/**
 * 日付を指定フォーマットで文字列化
 * @param {Date|string} date - 日付オブジェクトまたは文字列
 * @param {string} [format='yyyy-MM-dd'] - 日付フォーマット
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(date, format = 'yyyy-MM-dd') {
  try {
    // 入力検証
    if (!date) {
      return '';
    }
    
    // 文字列の場合はDateオブジェクトに変換
    const dateObj = (date instanceof Date) ? date : new Date(date);
    
    // 無効な日付の場合
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    return Utilities.formatDate(dateObj, TIMEZONE, format);
    
  } catch (error) {
    Logger.log('Error in formatDate: ' + error.toString());
    return '';
  }
}

/**
 * 時刻を指定フォーマットで文字列化
 * @param {Date|string} time - 時刻オブジェクトまたは文字列
 * @param {string} [format='HH:mm'] - 時刻フォーマット
 * @returns {string} フォーマットされた時刻文字列
 */
function formatTime(time, format = 'HH:mm') {
  try {
    if (!time) {
      return '';
    }
    
    const timeObj = (time instanceof Date) ? time : new Date(time);
    
    if (isNaN(timeObj.getTime())) {
      return '';
    }
    
    return Utilities.formatDate(timeObj, TIMEZONE, format);
    
  } catch (error) {
    Logger.log('Error in formatTime: ' + error.toString());
    return '';
  }
}

/**
 * 日付範囲が重複しているかチェック
 * @param {Date} start1 - 期間1の開始日
 * @param {Date} end1 - 期間1の終了日
 * @param {Date} start2 - 期間2の開始日
 * @param {Date} end2 - 期間2の終了日
 * @returns {boolean} 重複している場合true
 */
function isDateRangeOverlapping(start1, end1, start2, end2) {
  try {
    // 入力検証
    if (!start1 || !end1 || !start2 || !end2) {
      return false;
    }
    
    // Date型に変換
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    // 重複判定: (start1 <= end2) && (start2 <= end1)
    return (s1 <= e2) && (s2 <= e1);
    
  } catch (error) {
    Logger.log('Error in isDateRangeOverlapping: ' + error.toString());
    return false;
  }
}

/**
 * 現在の日付を取得（タイムゾーン考慮）
 * @returns {Date} 現在の日付
 */
function getCurrentDate() {
  const now = new Date();
  return new Date(
    Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd')
  );
}

// =============================================================================
// バリデーション関数
// =============================================================================

/**
 * 文字列が空でないかチェック
 * @param {any} value - チェックする値
 * @returns {boolean} 空でない場合true
 */
function isNotEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * メールアドレスの形式をチェック
 * @param {string} email - メールアドレス
 * @returns {boolean} 有効な形式の場合true
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // メールアドレスの正規表現パターン
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
}

/**
 * 日付オブジェクトが有効かチェック
 * @param {any} date - チェックする日付
 * @returns {boolean} 有効な日付の場合true
 */
function isValidDate(date) {
  if (!date) {
    return false;
  }
  
  const dateObj = (date instanceof Date) ? date : new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * 依頼データのバリデーション
 * @param {Object} requestData - 依頼データオブジェクト
 * @returns {Object} { isValid: boolean, errors: Array<string> }
 */
function validateRequestData(requestData) {
  const errors = [];
  
  // 必須項目のチェック
  if (!isNotEmpty(requestData.shipper)) {
    errors.push('荷主が選択されていません');
  }
  
  if (!isValidDate(requestData.loadDate)) {
    errors.push('積込日が正しく入力されていません');
  }
  
  if (!isNotEmpty(requestData.loadPlace1)) {
    errors.push('積込地1が入力されていません');
  }
  
  if (!isNotEmpty(requestData.productName)) {
    errors.push('品名が入力されていません');
  }
  
  if (!isValidDate(requestData.unloadDate)) {
    errors.push('荷卸日が正しく入力されていません');
  }
  
  if (!isNotEmpty(requestData.unloadPlace1)) {
    errors.push('荷卸地1が入力されていません');
  }
  
  if (!isNotEmpty(requestData.requestType)) {
    errors.push('依頼車種が選択されていません');
  }
  
  // 日付の論理チェック
  if (isValidDate(requestData.loadDate) && isValidDate(requestData.unloadDate)) {
    const loadDate = new Date(requestData.loadDate);
    const unloadDate = new Date(requestData.unloadDate);
    
    if (loadDate > unloadDate) {
      errors.push('荷卸日は積込日以降の日付を指定してください');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// =============================================================================
// 配列・オブジェクト操作関数
// =============================================================================

/**
 * 配列をプロパティでフィルタリング
 * @param {Array<Object>} array - フィルタリング対象の配列
 * @param {string} property - フィルタリングするプロパティ名
 * @param {any} value - フィルタリング値
 * @returns {Array<Object>} フィルタリング結果
 */
function filterByProperty(array, property, value) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  return array.filter(item => item[property] === value);
}

/**
 * 配列をプロパティでソート
 * @param {Array<Object>} array - ソート対象の配列
 * @param {string} property - ソートするプロパティ名
 * @param {boolean} [ascending=true] - 昇順の場合true
 * @returns {Array<Object>} ソート結果
 */
function sortByProperty(array, property, ascending = true) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  const sorted = [...array].sort((a, b) => {
    if (a[property] < b[property]) {
      return ascending ? -1 : 1;
    }
    if (a[property] > b[property]) {
      return ascending ? 1 : -1;
    }
    return 0;
  });
  
  return sorted;
}

/**
 * カンマ区切り文字列を配列に変換
 * @param {string} str - カンマ区切り文字列
 * @returns {Array<string>} 配列
 */
function splitByComma(str) {
  if (!str || typeof str !== 'string') {
    return [];
  }
  
  return str.split(',').map(item => item.trim()).filter(item => item !== '');
}

// =============================================================================
// ログ関数
// =============================================================================

/**
 * タイムスタンプ付きログ出力
 * @param {string} level - ログレベル（INFO, ERROR, WARNINGなど）
 * @param {string} message - ログメッセージ
 */
function logMessage(level, message) {
  const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  Logger.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * データをJSON形式でログ出力
 * @param {string} label - ラベル
 * @param {any} data - ログ出力するデータ
 */
function logData(label, data) {
  Logger.log(`${label}: ${JSON.stringify(data, null, 2)}`);
}