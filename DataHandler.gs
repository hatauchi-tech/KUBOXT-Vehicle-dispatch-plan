/**
 * =============================================================================
 * DataHandler.gs - データアクセス層
 * =============================================================================
 * * このファイルは、スプレッドシートへのデータアクセスを抽象化し、
 * ビジネスロジックとデータ層を分離します。
 * * 【設計方針】
 * - 単一データソースの原則: すべてのデータアクセスはこの層を経由
 * - エラーハンドリング: すべての関数でtry-catchを実装
 * - データ整合性: 書き込み前にバリデーションを実施
 */

/**
 * 依頼IDで行インデックスを検索
 * @param {SpreadsheetApp.Sheet} sheet - 検索対象シート
 * @param {string} requestId - 依頼ID
 * @returns {number} - 行インデックス（1始まり）、見つからない場合-1
 */
function findRowIndexByRequestId(sheet, requestId) {
  try {
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === requestId) {
        return i + 2; // ヘッダー行(1) + 0始まりインデックス(i) + 1 = i + 2
      }
    }
    return -1;
  } catch (error) {
    logMessage('ERROR', 'findRowIndexByRequestId: ' + error.toString());
    return -1;
  }
}

// =============================================================================
// 依頼データ関連 (T_荷主依頼データ)
// =============================================================================

/**
 * ★★★ 依頼IDで単一の依頼データを取得
 * @param {string} requestId - 依頼ID
 * @returns {Object|null} 依頼データオブジェクト、見つからない場合null
 */
function getRequestById(requestId) {
  try {
    logMessage('INFO', `getRequestById: 依頼データ取得開始 (ID: ${requestId})`);
    
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const rowIndex = findRowIndexByRequestId(sheet, requestId);
    
    if (rowIndex === -1) {
      logMessage('WARN', `getRequestById: 依頼が見つかりません (ID: ${requestId})`);
      return null;
    }
    
    const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // M_荷主マスタから荷主IDを取得（荷主名での逆引き）
    const allShippers = getAllShippers();
    const shipper = allShippers.find(s => s.shipperName === row[REQUEST_COLUMNS.SHIPPER]);
    const shipperId = shipper ? shipper.shipperId : '';

    const request = {
      rowIndex: rowIndex,
      requestId: row[REQUEST_COLUMNS.REQUEST_ID],
      receivedDate: row[REQUEST_COLUMNS.RECEIVED_DATE],
      shipper: row[REQUEST_COLUMNS.SHIPPER],
      shipperId: shipperId, // ★ 荷主IDを追加
      loadDate: row[REQUEST_COLUMNS.LOAD_DATE],
      loadTime: row[REQUEST_COLUMNS.LOAD_TIME],
      loadPlace1: row[REQUEST_COLUMNS.LOAD_PLACE1],
      loadPlace2: row[REQUEST_COLUMNS.LOAD_PLACE2],
      productName: row[REQUEST_COLUMNS.PRODUCT_NAME],
      unloadDate: row[REQUEST_COLUMNS.UNLOAD_DATE],
      unloadTime: row[REQUEST_COLUMNS.UNLOAD_TIME],
      unloadPlace1: row[REQUEST_COLUMNS.UNLOAD_PLACE1],
      unloadPlace2: row[REQUEST_COLUMNS.UNLOAD_PLACE2],
      requestType: row[REQUEST_COLUMNS.REQUEST_TYPE],
      vehicleNumber: row[REQUEST_COLUMNS.VEHICLE_NUMBER],
      vehiclePlate: row[REQUEST_COLUMNS.VEHICLE_PLATE],
      vehicleType: row[REQUEST_COLUMNS.VEHICLE_TYPE],
      driverName: row[REQUEST_COLUMNS.DRIVER_NAME]
    };
    
    logMessage('INFO', `getRequestById: 依頼データ取得成功 (ID: ${requestId})`);
    return request;
    
  } catch (error) {
    logMessage('ERROR', 'getRequestById: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
  }
}


/**
 * すべての依頼データを取得
 * @returns {Array<Object>} 依頼データの配列
 */
function getAllRequests() {
  try {
    logMessage('INFO', 'getAllRequests: 依頼データ取得開始');
    
    const data = getSheetData(SHEET_NAMES.REQUESTS);
    
    if (data.length <= 1) {
      return [];
    }
    
    // M_荷主マスタを先に取得（変換用）
    const allShippers = getAllShippers();
    
    const requests = data.slice(1).map((row, index) => {
      // 荷主名から荷主IDを逆引き
      const shipper = allShippers.find(s => s.shipperName === row[REQUEST_COLUMNS.SHIPPER]);
      const shipperId = shipper ? shipper.shipperId : '';
      
      return {
        rowIndex: index + 2, // スプレッドシートの実際の行番号
        requestId: row[REQUEST_COLUMNS.REQUEST_ID],
        receivedDate: row[REQUEST_COLUMNS.RECEIVED_DATE],
        shipper: row[REQUEST_COLUMNS.SHIPPER],
        shipperId: shipperId, // ★ 荷主IDを追加
        loadDate: row[REQUEST_COLUMNS.LOAD_DATE],
        loadTime: row[REQUEST_COLUMNS.LOAD_TIME],
        loadPlace1: row[REQUEST_COLUMNS.LOAD_PLACE1],
        loadPlace2: row[REQUEST_COLUMNS.LOAD_PLACE2],
        productName: row[REQUEST_COLUMNS.PRODUCT_NAME],
        unloadDate: row[REQUEST_COLUMNS.UNLOAD_DATE],
        unloadTime: row[REQUEST_COLUMNS.UNLOAD_TIME],
        unloadPlace1: row[REQUEST_COLUMNS.UNLOAD_PLACE1],
        unloadPlace2: row[REQUEST_COLUMNS.UNLOAD_PLACE2],
        requestType: row[REQUEST_COLUMNS.REQUEST_TYPE],
        vehicleNumber: row[REQUEST_COLUMNS.VEHICLE_NUMBER],
        vehiclePlate: row[REQUEST_COLUMNS.VEHICLE_PLATE],
        vehicleType: row[REQUEST_COLUMNS.VEHICLE_TYPE],
        driverName: row[REQUEST_COLUMNS.DRIVER_NAME]
      };
    });
    
    logMessage('INFO', `getAllRequests: ${requests.length}件の依頼を取得`);
    return requests;
    
  } catch (error) {
    logMessage('ERROR', 'getAllRequests: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
  }
}

/**
 * ★★★ NEW: 指定日の配車確定済み依頼を取得
 * @param {Date} targetDate - 対象日付
 * @returns {Array<Object>} 配車確定済み依頼の配列
 */
function getAssignedRequestsByDate(targetDate) {
  try {
    logMessage('INFO', `getAssignedRequestsByDate: 取得開始 (対象日: ${targetDate.toDateString()})`);
    
    // すべての依頼を取得
    const allRequests = getAllRequests();
    
    // 指定日付 & 配車確定済み（vehicleNumberが入力済み）の依頼をフィルタリング
    const filtered = allRequests.filter(request => {
      // 積込日が対象日付と一致
      const loadDate = new Date(request.loadDate);
      const isSameDate = loadDate.toDateString() === targetDate.toDateString();
      
      // 車両が割り当てられている
      const isAssigned = isNotEmpty(request.vehicleNumber);
      
      return isSameDate && isAssigned;
    });
    
    logMessage('INFO', `getAssignedRequestsByDate: ${filtered.length}件の配車確定依頼を取得`);
    return filtered;
    
  } catch (error) { // ★★★ 修正箇所 ★★★
    logMessage('ERROR', 'getAssignedRequestsByDate: ' + error.toString());
    throw error;
  }
}


/**
 * 特定の日付範囲の依頼データを取得
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {Array<Object>} フィルタリングされた依頼データ
 */
function getRequestsByDateRange(startDate, endDate) {
  try {
    const allRequests = getAllRequests();
    
    // 日付範囲でフィルタリング
    const filtered = allRequests.filter(request => {
      const loadDate = new Date(request.loadDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return loadDate >= start && loadDate <= end;
    });
    
    logMessage('INFO', `getRequestsByDateRange: ${filtered.length}件の依頼を取得`);
    return filtered;
    
  } catch (error) {
    logMessage('ERROR', 'getRequestsByDateRange: ' + error.toString());
    throw error;
  }
}

/**
 * 未配車の依頼データを取得
 * @returns {Array<Object>} 未配車の依頼データ
 */
function getUnassignedRequests() {
  try {
    const allRequests = getAllRequests();
    
    // ナンバーが空の依頼をフィルタリング
    const unassigned = allRequests.filter(request => 
      !isNotEmpty(request.vehicleNumber)
    );
    
    logMessage('INFO', `getUnassignedRequests: ${unassigned.length}件の未配車依頼を取得`);
    return unassigned;
    
  } catch (error) {
    logMessage('ERROR', 'getUnassignedRequests: ' + error.toString());
    throw error;
  }
}

/**
 * 新しい依頼を登録
 * @param {Object} requestData - 依頼データオブジェクト
 * @returns {Object} { success: boolean, requestId: string, message: string }
 */
function createRequest(requestData) {
  try {
    logMessage('INFO', 'createRequest: 依頼登録開始');
    
    // ★ 荷主IDから荷主名を取得
    const shipper = getShipperById(requestData.shipper); // requestData.shipper は shipperId
    if (!shipper) {
      return { success: false, message: '指定された荷主が見つかりません' };
    }
    const shipperName = shipper.shipperName;
    
    // バリデーション
    const validation = validateRequestData(requestData);
    if (!validation.isValid) {
      return {
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR + validation.errors.join(', '),
        errors: validation.errors
      };
    }
    
    // 依頼IDを生成
    const requestId = generateRequestId();
    
    // スプレッドシートに追加する行データを構築
    const rowData = [
      requestId,                           // 依頼ID
      requestData.receivedDate || new Date(), // 受付日
      shipperName,                         // ★ 荷主名
      requestData.loadDate,                // 積込日
      requestData.loadTime,                // 積込時間
      requestData.loadPlace1,              // 積込地1
      requestData.loadPlace2 || '',        // 積込地2
      requestData.productName,             // 品名
      requestData.unloadDate,              // 荷卸日
      requestData.unloadTime,              // 荷卸時間
      requestData.unloadPlace1,            // 荷卸地1
      requestData.unloadPlace2 || '',      // 荷卸地2
      requestData.requestType,             // 依頼車種
      '',                                  // ナンバー（空）
      '',                                  // 車番（空）
      '',                                  // 車種（空）
      ''                                   // 運転手（空）
    ];
    
    // スプレッドシートに追加
    appendRowToSheet(SHEET_NAMES.REQUESTS, rowData);
    
    logMessage('INFO', `createRequest: 依頼を登録しました (ID: ${requestId})`);
    
    return {
      success: true,
      requestId: requestId,
      message: SUCCESS_MESSAGES.SAVE_SUCCESS
    };
    
  } catch (error) {
    logMessage('ERROR', 'createRequest: ' + error.toString());
    return {
      success: false,
      message: ERROR_MESSAGES.SAVE_ERROR + error.message
    };
  }
}

/**
 * ★★★ NEW: 複数の依頼を一括登録
 * @param {Array<Object>} requestsArray - 依頼データオブジェクトの配列
 * @returns {Object} { success: boolean, requestIds: Array, message: string }
 */
function createRequestBatch(requestsArray) {
  try {
    logMessage('INFO', `createRequestBatch: 一括登録開始 (件数: ${requestsArray.length})`);

    if (!requestsArray || requestsArray.length === 0) {
      return {
        success: false,
        requestIds: [],
        message: '登録する依頼データがありません'
      };
    }

    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const requestIds = [];
    const rowsData = [];

    // 連番の開始値を取得（最初のIDを生成）
    const firstRequestId = generateRequestId();
    const dateStr = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd');
    const firstSeqNum = parseInt(firstRequestId.split('-')[1]);

    // 各依頼データを処理
    for (let i = 0; i < requestsArray.length; i++) {
      const requestData = requestsArray[i];

      // ★ 荷主IDから荷主名を取得
      const shipper = getShipperById(requestData.shipper);
      if (!shipper) {
        return {
          success: false,
          requestIds: [],
          message: `依頼${i + 1}件目: 指定された荷主が見つかりません`
        };
      }
      const shipperName = shipper.shipperName;

      // バリデーション
      const validation = validateRequestData(requestData);
      if (!validation.isValid) {
        return {
          success: false,
          requestIds: [],
          message: `依頼${i + 1}件目: ${ERROR_MESSAGES.VALIDATION_ERROR}${validation.errors.join(', ')}`,
          errors: validation.errors
        };
      }

      // 連番のIDを生成
      const seqNum = firstSeqNum + i;
      const requestId = `REQ${dateStr}-${String(seqNum).padStart(4, '0')}`;
      requestIds.push(requestId);

      // 行データを構築
      const rowData = [
        requestId,                           // 依頼ID
        requestData.receivedDate || new Date(), // 受付日
        shipperName,                         // ★ 荷主名
        requestData.loadDate,                // 積込日
        requestData.loadTime,                // 積込時間
        requestData.loadPlace1,              // 積込地1
        requestData.loadPlace2 || '',        // 積込地2
        requestData.productName,             // 品名
        requestData.unloadDate,              // 荷卸日
        requestData.unloadTime,              // 荷卸時間
        requestData.unloadPlace1,            // 荷卸地1
        requestData.unloadPlace2 || '',      // 荷卸地2
        requestData.requestType,             // 依頼車種
        '',                                  // ナンバー（空）
        '',                                  // 車番（空）
        '',                                  // 車種（空）
        ''                                   // 運転手（空）
      ];

      rowsData.push(rowData);
    }

    // 一括でスプレッドシートに追加
    if (rowsData.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsData.length, rowsData[0].length).setValues(rowsData);
    }

    logMessage('INFO', `createRequestBatch: ${requestIds.length}件の依頼を一括登録しました (IDs: ${requestIds[0]} ～ ${requestIds[requestIds.length - 1]})`);

    return {
      success: true,
      requestIds: requestIds,
      message: SUCCESS_MESSAGES.SAVE_SUCCESS
    };

  } catch (error) {
    logMessage('ERROR', 'createRequestBatch: ' + error.toString());
    return {
      success: false,
      requestIds: [],
      message: ERROR_MESSAGES.SAVE_ERROR + error.message
    };
  }
}

/**
 * ★★★ NEW: 依頼データを更新
 * @param {Object} requestData - 依頼データオブジェクト (requestIdを含む)
 * @returns {Object} { success: boolean, message: string }
 */
function updateRequest(requestData) {
  try {
    logMessage('INFO', `updateRequest: 依頼更新開始 (ID: ${requestData.requestId})`);

    // ★ 荷主IDから荷主名を取得
    const shipper = getShipperById(requestData.shipper); // requestData.shipper は shipperId
    if (!shipper) {
      return { success: false, message: '指定された荷主が見つかりません' };
    }
    const shipperName = shipper.shipperName;
    
    // バリデーション
    const validation = validateRequestData(requestData);
    if (!validation.isValid) {
      return {
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR + validation.errors.join(', '),
        errors: validation.errors
      };
    }
    
    // 既存の依頼データを取得（行番号の確認）
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const rowIndex = findRowIndexByRequestId(sheet, requestData.requestId);
    
    if (rowIndex === -1) {
      return { success: false, message: '更新対象の依頼が見つかりません' };
    }

    // 既存の配車情報を保持
    const existingRow = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const vehicleNumber = existingRow[REQUEST_COLUMNS.VEHICLE_NUMBER];
    const vehiclePlate = existingRow[REQUEST_COLUMNS.VEHICLE_PLATE];
    const vehicleType = existingRow[REQUEST_COLUMNS.VEHICLE_TYPE];
    const driverName = existingRow[REQUEST_COLUMNS.DRIVER_NAME];

    // 更新する行データを構築
    const rowData = [
      requestData.requestId,               // 依頼ID
      requestData.receivedDate,            // 受付日
      shipperName,                         // ★ 荷主名
      requestData.loadDate,                // 積込日
      requestData.loadTime,                // 積込時間
      requestData.loadPlace1,              // 積込地1
      requestData.loadPlace2 || '',        // 積込地2
      requestData.productName,             // 品名
      requestData.unloadDate,              // 荷卸日
      requestData.unloadTime,              // 荷卸時間
      requestData.unloadPlace1,            // 荷卸地1
      requestData.unloadPlace2 || '',      // 荷卸地2
      requestData.requestType,             // 依頼車種
      vehicleNumber,                       // ナンバー（既存の値を保持）
      vehiclePlate,                        // 車番（既存の値を保持）
      vehicleType,                         // 車種（既存の値を保持）
      driverName                           // 運転手（既存の値を保持）
    ];
    
    // スプレッドシートを更新
    updateRow(SHEET_NAMES.REQUESTS, rowIndex, rowData);
    
    logMessage('INFO', `updateRequest: 依頼を更新しました (ID: ${requestData.requestId})`);
    
    return {
      success: true,
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS
    };
    
  } catch (error) {
    logMessage('ERROR', 'updateRequest: ' + error.toString());
    return {
      success: false,
      message: ERROR_MESSAGES.SAVE_ERROR + error.message
    };
  }
}

/**
 * ★★★ NEW: 依頼を削除
 * @param {string} requestId - 依頼ID
 * @returns {Object} { success: boolean, message: string }
 */
function deleteRequest(requestId) {
  try {
    logMessage('INFO', `deleteRequest: 依頼削除開始 (ID: ${requestId})`);
    
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const rowIndex = findRowIndexByRequestId(sheet, requestId);
    
    if (rowIndex === -1) {
      return { success: false, message: '削除対象の依頼が見つかりません' };
    }
    
    // 行を削除
    sheet.deleteRow(rowIndex);
    
    logMessage('INFO', `deleteRequest: 依頼を削除しました (ID: ${requestId})`);
    
    return {
      success: true,
      message: SUCCESS_MESSAGES.DELETE_SUCCESS
    };
    
  } catch (error) {
    logMessage('ERROR', 'deleteRequest: ' + error.toString());
    return {
      success: false,
      message: ERROR_MESSAGES.SAVE_ERROR + error.message
    };
  }
}


/**
 * 依頼に車両を割り当て
 * @param {string} requestId - 依頼ID
 * @param {string} vehicleNumber - 車両ナンバー
 * @returns {Object} { success: boolean, message: string }
 */
function assignVehicleToRequest(requestId, vehicleNumber) {
  try {
    logMessage('INFO', `assignVehicleToRequest: 依頼 ${requestId} に車両 ${vehicleNumber} を割り当て`);
    
    if (!isNotEmpty(requestId)) {
      throw new Error('依頼IDが指定されていません');
    }
    if (!isNotEmpty(vehicleNumber)) {
      throw new Error('車両ナンバーが指定されていません');
    }
    
    // 依頼データを取得
    const targetRequest = getRequestById(requestId);
    
    if (!targetRequest) {
      return {
        success: false,
        message: '指定された依頼が見つかりません'
      };
    }
    
    // 車両情報を取得
    const vehicle = getVehicleByNumber(vehicleNumber);
    if (!vehicle) {
      return {
        success: false,
        message: '指定された車両が見つかりません'
      };
    }
    
    // 車両が対応可能な車種かチェック
    const acceptableTypes = splitByComma(vehicle.acceptableTypes);
    if (!acceptableTypes.includes(targetRequest.requestType)) {
      return {
        success: false,
        message: 'この車両は指定された依頼車種に対応していません'
      };
    }
    
    // 車両の稼働状況をチェック（既に割り当てられているか）
    const allRequests = getAllRequests(); // 競合チェック用に全件取得
    const conflictingRequests = allRequests.filter(req => 
      req.vehicleNumber === vehicleNumber &&
      req.requestId !== requestId &&
      isDateRangeOverlapping(
        targetRequest.loadDate,
        targetRequest.unloadDate,
        req.loadDate,
        req.unloadDate
      )
    );
    
    if (conflictingRequests.length > 0) {
      return {
        success: false,
        message: 'この車両は既に他の依頼に割り当てられています'
      };
    }
    
    // 依頼データを更新
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const rowIndex = targetRequest.rowIndex;
    
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_NUMBER + 1).setValue(vehicle.number);
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_PLATE + 1).setValue(vehicle.radioNumber);
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_TYPE + 1).setValue(vehicle.vehicleType);
    sheet.getRange(rowIndex, REQUEST_COLUMNS.DRIVER_NAME + 1).setValue(vehicle.driverName);
    
    logMessage('INFO', `assignVehicleToRequest: 割り当て完了`);
    
    return {
      success: true,
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS
    };
    
  } catch (error) {
    logMessage('ERROR', 'assignVehicleToRequest: ' + error.toString());
    return {
      success: false,
      message: ERROR_MESSAGES.SAVE_ERROR + error.message
    };
  }
}

/**
 * ★★★ NEW: 依頼に傭車を割り当て（運転手名を指定）
 * @param {string} requestId - 依頼ID
 * @param {string} driverName - 運転手名
 * @returns {Object} { success: boolean, message: string }
 */
function assignCharterVehicleToRequest(requestId, driverName) {
  try {
    logMessage('INFO', `assignCharterVehicleToRequest: 依頼 ${requestId} に傭車を割り当て（運転手: ${driverName}）`);

    if (!isNotEmpty(requestId)) {
      throw new Error('依頼IDが指定されていません');
    }
    if (!isNotEmpty(driverName)) {
      throw new Error('運転手名が指定されていません');
    }

    // 依頼データを取得
    const targetRequest = getRequestById(requestId);

    if (!targetRequest) {
      return {
        success: false,
        message: '指定された依頼が見つかりません'
      };
    }

    // ★ 傭車の固定情報
    const charterVehicleNumber = '999999';
    const charterRadioNumber = '999';
    const charterVehicleType = '傭車';

    // 依頼データを更新
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const rowIndex = targetRequest.rowIndex;

    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_NUMBER + 1).setValue(charterVehicleNumber);
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_PLATE + 1).setValue(charterRadioNumber);
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_TYPE + 1).setValue(charterVehicleType);
    sheet.getRange(rowIndex, REQUEST_COLUMNS.DRIVER_NAME + 1).setValue(driverName);

    logMessage('INFO', `assignCharterVehicleToRequest: 傭車割り当て完了（運転手: ${driverName}）`);

    return {
      success: true,
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS
    };

  } catch (error) {
    logMessage('ERROR', 'assignCharterVehicleToRequest: ' + error.toString());
    return {
      success: false,
      message: ERROR_MESSAGES.SAVE_ERROR + error.message
    };
  }
}

/**
 * 依頼の車両割り当てを解除
 * @param {string} requestId - 依頼ID
 * @returns {Object} { success: boolean, message: string }
 */
function unassignVehicleFromRequest(requestId) {
  try {
    logMessage('INFO', `unassignVehicleFromRequest: 依頼 ${requestId} の車両割り当てを解除`);
    
    // 依頼データを取得
    const targetRequest = getRequestById(requestId);
    
    if (!targetRequest) {
      return {
        success: false,
        message: '指定された依頼が見つかりません'
      };
    }
    
    // 車両情報をクリア
    const sheet = getSheet(SHEET_NAMES.REQUESTS);
    const rowIndex = targetRequest.rowIndex;
    
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_NUMBER + 1).setValue('');
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_PLATE + 1).setValue('');
    sheet.getRange(rowIndex, REQUEST_COLUMNS.VEHICLE_TYPE + 1).setValue('');
    sheet.getRange(rowIndex, REQUEST_COLUMNS.DRIVER_NAME + 1).setValue('');
    
    logMessage('INFO', 'unassignVehicleFromRequest: 割り当て解除完了');
    
    return {
      success: true,
      message: '車両の割り当てを解除しました'
    };
    
  } catch (error) {
    logMessage('ERROR', 'unassignVehicleFromRequest: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

// =============================================================================
// 車両マスタ関連 (M_車両)
// =============================================================================

/**
 * すべての車両データを取得
 * @returns {Array<Object>} 車両データの配列
 */
function getAllVehicles() {
  try {
    logMessage('INFO', 'getAllVehicles: 車両データ取得開始');
    
    const data = getSheetData(SHEET_NAMES.VEHICLES);
    
    if (data.length <= 1) {
      return [];
    }
    
    const vehicles = data.slice(1).map(row => ({
      number: row[VEHICLE_COLUMNS.NUMBER],
      radioNumber: row[VEHICLE_COLUMNS.RADIO_NUMBER],
      capacity: row[VEHICLE_COLUMNS.CAPACITY],
      vehicleType: row[VEHICLE_COLUMNS.VEHICLE_TYPE],
      acceptableTypes: row[VEHICLE_COLUMNS.ACCEPTABLE_TYPES],
      driverName: row[VEHICLE_COLUMNS.DRIVER_NAME],
      phone: row[VEHICLE_COLUMNS.PHONE],
      email: row[VEHICLE_COLUMNS.EMAIL],
      remarks: row[VEHICLE_COLUMNS.REMARKS]
    }));
    
    logMessage('INFO', `getAllVehLicles: ${vehicles.length}台の車両を取得`);
    return vehicles;
    
  } catch (error) {
    logMessage('ERROR', 'getAllVehicles: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
  }
}

/**
 * 車両ナンバーで車両情報を取得
 * @param {string} vehicleNumber - 車両ナンバー
 * @returns {Object|null} 車両情報オブジェクト、見つからない場合null
 */
function getVehicleByNumber(vehicleNumber) {
  try {
    const vehicles = getAllVehicles();
    return vehicles.find(v => v.number === vehicleNumber) || null;
  } catch (error) {
    logMessage('ERROR', 'getVehicleByNumber: ' + error.toString());
    return null;
  }
}

/**
 * 指定された依頼に割り当て可能な車両を取得
 * @param {Object} request - 依頼データオブジェクト
 * @returns {Array<Object>} 割り当て可能な車両の配列
 */
function getAvailableVehiclesForRequest(request) {
  try {
    logMessage('INFO', 'getAvailableVehiclesForRequest: 利用可能車両の検索開始');
    
    // すべての車両を取得
    const allVehicles = getAllVehicles();
    
    // すべての依頼を取得（稼働状況チェック用）
    const allRequests = getAllRequests();
    
    // 利用可能な車両をフィルタリング
    const availableVehicles = allVehicles.filter(vehicle => {
      // 条件1: 車種適合チェック
      const acceptableTypes = splitByComma(vehicle.acceptableTypes);
      if (!acceptableTypes.includes(request.requestType)) {
        return false;
      }
      
      // 条件2: 稼働状況チェック（期間重複チェック）
      const hasConflict = allRequests.some(req => 
        req.vehicleNumber === vehicle.number &&
        req.requestId !== request.requestId &&
        isNotEmpty(req.vehicleNumber) &&
        isDateRangeOverlapping(
          request.loadDate,
          request.unloadDate,
          req.loadDate,
          req.unloadDate
        )
      );
      
      // 重複がない場合のみ利用可能
      return !hasConflict;
    });
    
    logMessage('INFO', `getAvailableVehiclesForRequest: ${availableVehicles.length}台が利用可能`);
    return availableVehicles;
    
  } catch (error) {
    logMessage('ERROR', 'getAvailableVehiclesForRequest: ' + error.toString());
    throw error;
  }
}

// =============================================================================
// 荷主マスタ関連 (M_荷主マスタ)
// =============================================================================

/**
 * すべての荷主データを取得
 * @returns {Array<Object>} 荷主データの配列
 */
function getAllShippers() {
  try {
    logMessage('INFO', 'getAllShippers: 荷主データ取得開始');
    
    const data = getSheetData(SHEET_NAMES.SHIPPERS);
    
    if (data.length <= 1) {
      return [];
    }
    
    const shippers = data.slice(1).map(row => ({
      shipperId: row[SHIPPER_COLUMNS.SHIPPER_ID],
      shipperName: row[SHIPPER_COLUMNS.SHIPPER_NAME]
    }));
    
    logMessage('INFO', `getAllShippers: ${shippers.length}件の荷主を取得`);
    return shippers;
    
  } catch (error) {
    logMessage('ERROR', 'getAllShippers: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
  }
}

/**
 * 荷主IDで荷主情報を取得
 * @param {string} shipperId - 荷主ID
 * @returns {Object|null} 荷主情報オブジェクト、見つからない場合null
 */
function getShipperById(shipperId) {
  try {
    const shippers = getAllShippers();
    return shippers.find(s => s.shipperId === shipperId) || null;
  } catch (error) {
    logMessage('ERROR', 'getShipperById: ' + error.toString());
    return null;
  }
}

// =============================================================================
// ユニークな値の取得（フィルタリング・入力支援用）
// =============================================================================

/**
 * ★★★ NEW: 荷主ごとのお気に入り（最頻値）を取得
 * @param {string} shipperId - 荷主ID
 * @returns {Object} { loadPlace1: string, unloadPlace1: string, productName: string, requestType: string }
 */
function getShipperFavorites(shipperId) {
  try {
    logMessage('INFO', `getShipperFavorites: 取得開始 (荷主ID: ${shipperId})`);
    
    // M_荷主マスタから荷主名を取得（T_荷主依頼データは荷主名で入っているため）
    const shipper = getShipperById(shipperId);
    if (!shipper) {
      logMessage('WARN', `getShipperFavorites: 荷主が見つかりません (ID: ${shipperId})`);
      return {};
    }
    const shipperName = shipper.shipperName;

    // 全依頼データを取得
    const allRequests = getAllRequests();
    
    // この荷主の依頼のみにフィルタリング
    const shipperRequests = allRequests.filter(req => req.shipper === shipperName);
    
    if (shipperRequests.length === 0) {
      logMessage('INFO', `getShipperFavorites: 過去の依頼データがありません (荷主: ${shipperName})`);
      return {};
    }

    // 各項目の最頻値を計算するヘルパー関数
    const findMostFrequent = (array) => {
      if (array.length === 0) return '';
      const counts = {};
      let maxCount = 0;
      let mostFrequent = '';
      
      array.forEach(item => {
        if (!item) return; // 空のデータは無視
        counts[item] = (counts[item] || 0) + 1;
        if (counts[item] > maxCount) {
          maxCount = counts[item];
          mostFrequent = item;
        }
      });
      return mostFrequent;
    };

    // 各項目のリストを作成
    const loadPlaces = shipperRequests.map(req => req.loadPlace1);
    const unloadPlaces = shipperRequests.map(req => req.unloadPlace1);
    const productNames = shipperRequests.map(req => req.productName);
    const requestTypes = shipperRequests.map(req => req.requestType);

    // 最頻値を計算
    const favorites = {
      loadPlace1: findMostFrequent(loadPlaces),
      unloadPlace1: findMostFrequent(unloadPlaces),
      productName: findMostFrequent(productNames),
      requestType: findMostFrequent(requestTypes)
    };
    
    logMessage('INFO', `getShipperFavorites: お気に入り情報を取得 (荷主: ${shipperName})`);
    logData('Favorites', favorites);

    return favorites;

  } catch (error) {
    logMessage('ERROR', 'getShipperFavorites: ' + error.toString());
    return {};
  }
}

/**
 * ★★★ NEW: T_荷主依頼データからユニークな住所リストを取得
 * @returns {Array<string>} ユニークな住所の配列
 */
function getUniqueAddresses() {
  try {
    logMessage('INFO', 'getUniqueAddresses: ユニークな住所リスト取得開始');
    
    const data = getSheetData(SHEET_NAMES.REQUESTS);
    if (data.length <= 1) {
      return [];
    }
    
    const addresses = new Set();
    
    // ヘッダー行を除いてループ
    data.slice(1).forEach(row => {
      // 積込地1, 積込地2, 荷卸地1, 荷卸地2
      if (isNotEmpty(row[REQUEST_COLUMNS.LOAD_PLACE1])) {
        addresses.add(row[REQUEST_COLUMNS.LOAD_PLACE1]);
      }
      if (isNotEmpty(row[REQUEST_COLUMNS.LOAD_PLACE2])) {
        addresses.add(row[REQUEST_COLUMNS.LOAD_PLACE2]);
      }
      if (isNotEmpty(row[REQUEST_COLUMNS.UNLOAD_PLACE1])) {
        addresses.add(row[REQUEST_COLUMNS.UNLOAD_PLACE1]);
      }
      if (isNotEmpty(row[REQUEST_COLUMNS.UNLOAD_PLACE2])) {
        addresses.add(row[REQUEST_COLUMNS.UNLOAD_PLACE2]);
      }
    });
    
    const uniqueAddresses = [...addresses].sort();
    
    logMessage('INFO', `getUniqueAddresses: ${uniqueAddresses.length}件のユニークな住所を取得`);
    return uniqueAddresses;
    
  } catch (error) {
    logMessage('ERROR', 'getUniqueAddresses: ' + error.toString());
    return [];
  }
}

/**
 * M_車両の対応可能依頼からユニークな車種リストを取得
 * @returns {Array<string>} ユニークな車種の配列
 */
function getUniqueRequestTypes() {
  try {
    const vehicles = getAllVehicles();
    const allTypes = [];
    
    vehicles.forEach(vehicle => {
      const types = splitByComma(vehicle.acceptableTypes);
      allTypes.push(...types);
    });
    
    // 重複を除いてソート
    const uniqueTypes = [...new Set(allTypes)].sort();
    
    logMessage('INFO', `getUniqueRequestTypes: ${uniqueTypes.length}種類の車種を取得`);
    return uniqueTypes;
    
  } catch (error) {
    logMessage('ERROR', 'getUniqueRequestTypes: ' + error.toString());
    return [];
  }
}