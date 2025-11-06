/**
 * =============================================================================
 * DataHandler.gs - データアクセス層
 * =============================================================================
 * 
 * このファイルは、スプレッドシートへのデータアクセスを抽象化し、
 * ビジネスロジックとデータ層を分離します。
 * 
 * 【設計方針】
 * - 単一データソースの原則: すべてのデータアクセスはこの層を経由
 * - エラーハンドリング: すべての関数でtry-catchを実装
 * - データ整合性: 書き込み前にバリデーションを実施
 */

// =============================================================================
// 依頼データ関連 (T_荷主依頼データ)
// =============================================================================

/**
 * すべての依頼データを取得
 * @returns {Array<Object>} 依頼データの配列
 */
function getAllRequests() {
  try {
    logMessage('INFO', 'getAllRequests: 依頼データ取得開始');
    
    const data = getSheetData(SHEET_NAMES.REQUESTS);
    
    if (data.length <= 1) {
      // ヘッダー行のみ、またはデータなし
      return [];
    }
    
    // データ行を処理（ヘッダー行をスキップ）
    const requests = data.slice(1).map((row, index) => ({
      rowIndex: index + 2, // スプレッドシートの実際の行番号（1始まり + ヘッダー行）
      requestId: row[REQUEST_COLUMNS.REQUEST_ID],
      receivedDate: row[REQUEST_COLUMNS.RECEIVED_DATE],
      shipper: row[REQUEST_COLUMNS.SHIPPER],
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
    }));
    
    logMessage('INFO', `getAllRequests: ${requests.length}件の依頼を取得`);
    return requests;
    
  } catch (error) {
    logMessage('ERROR', 'getAllRequests: ' + error.toString());
    throw new Error(ERROR_MESSAGES.LOAD_ERROR + error.message);
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
    logData('RequestData', requestData);
    
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
      requestData.shipper,                 // 荷主
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
 * 依頼に車両を割り当て
 * @param {string} requestId - 依頼ID
 * @param {string} vehicleNumber - 車両ナンバー
 * @returns {Object} { success: boolean, message: string }
 */
function assignVehicleToRequest(requestId, vehicleNumber) {
  try {
    logMessage('INFO', `assignVehicleToRequest: 依頼 ${requestId} に車両 ${vehicleNumber} を割り当て`);
    
    // 入力検証
    if (!isNotEmpty(requestId)) {
      throw new Error('依頼IDが指定されていません');
    }
    if (!isNotEmpty(vehicleNumber)) {
      throw new Error('車両ナンバーが指定されていません');
    }
    
    // 依頼データを取得
    const allRequests = getAllRequests();
    const targetRequest = allRequests.find(req => req.requestId === requestId);
    
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
    
    // ナンバー、車番、車種、運転手を更新
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
 * 依頼の車両割り当てを解除
 * @param {string} requestId - 依頼ID
 * @returns {Object} { success: boolean, message: string }
 */
function unassignVehicleFromRequest(requestId) {
  try {
    logMessage('INFO', `unassignVehicleFromRequest: 依頼 ${requestId} の車両割り当てを解除`);
    
    // 依頼データを取得
    const allRequests = getAllRequests();
    const targetRequest = allRequests.find(req => req.requestId === requestId);
    
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
    
    logMessage('INFO', `getAllVehicles: ${vehicles.length}台の車両を取得`);
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
// ユニークな値の取得（フィルタリング用）
// =============================================================================

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