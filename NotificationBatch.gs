/**
 * =============================================================================
 * NotificationBatch.gs - 日次通知バッチ処理
 * =============================================================================
 * 
 * このファイルは、翌日の配車計画を各運転手に自動でメール通知する機能を提供します。
 * GASのトリガー機能により、毎日夕方18:00に自動実行されます。
 * 
 * 【実行方法】
 * 1. GASエディタの「トリガー」メニューから新しいトリガーを作成
 * 2. 実行する関数: sendDailyDispatchNotifications
 * 3. イベントのソース: 時間主導型
 * 4. 時刻ベースのトリガー: 日タイマー / 午後6時〜7時
 * 
 * 【処理フロー】
 * 1. 翌日日付の配車確定済み依頼を抽出
 * 2. 運転手ごとに集計・分類
 * 3. 各運転手にメール送信（PDFファイル添付）
 */

// =============================================================================
// メイン処理
// =============================================================================

/**
 * 日次配車通知のメイン処理
 * 翌日の配車計画を各運転手にメール送信
 */
function sendDailyDispatchNotifications() {
  try {
    logMessage('INFO', '=== 日次配車通知バッチ処理開始 ===');
    
    // 翌日の日付を取得
    const tomorrow = getTomorrowDate();
    const tomorrowStr = formatDate(tomorrow, 'yyyy-MM-dd');
    
    logMessage('INFO', `通知対象日: ${tomorrowStr}`);
    
    // 翌日の配車確定済み依頼を取得
    const tomorrowRequests = getConfirmedRequestsForDate(tomorrow);
    
    if (tomorrowRequests.length === 0) {
      logMessage('INFO', '翌日の配車確定済み依頼がありません。処理を終了します。');
      return {
        success: true,
        message: '翌日の配車確定済み依頼がありません',
        sentCount: 0
      };
    }
    
    logMessage('INFO', `翌日の配車確定済み依頼: ${tomorrowRequests.length}件`);
    
    // 運転手ごとにグループ化
    const groupedByDriver = groupRequestsByDriver(tomorrowRequests);
    
    logMessage('INFO', `通知対象運転手数: ${Object.keys(groupedByDriver).length}名`);
    
    // 各運転手にメール送信
    let successCount = 0;
    let errorCount = 0;
    
    for (const [vehicleNumber, requests] of Object.entries(groupedByDriver)) {
      try {
        const result = sendNotificationToDriver(vehicleNumber, requests, tomorrow);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        logMessage('ERROR', `運転手への通知失敗 (車両: ${vehicleNumber}): ${error.toString()}`);
        errorCount++;
      }
    }
    
    logMessage('INFO', `=== 日次配車通知バッチ処理完了 ===`);
    logMessage('INFO', `成功: ${successCount}件, エラー: ${errorCount}件`);
    
    return {
      success: true,
      message: '日次通知処理が完了しました',
      sentCount: successCount,
      errorCount: errorCount
    };
    
  } catch (error) {
    logMessage('ERROR', '日次配車通知バッチ処理でエラーが発生: ' + error.toString());
    return {
      success: false,
      message: error.message,
      sentCount: 0
    };
  }
}

// =============================================================================
// データ取得・処理関数
// =============================================================================

/**
 * 翌日の日付を取得
 * @returns {Date} 翌日の日付
 */
function getTomorrowDate() {
  const today = getCurrentDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * 指定日付の配車確定済み依頼を取得
 * @param {Date} targetDate - 対象日付
 * @returns {Array<Object>} 配車確定済み依頼の配列
 */
function getConfirmedRequestsForDate(targetDate) {
  try {
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
    
    return filtered;
    
  } catch (error) {
    logMessage('ERROR', 'getConfirmedRequestsForDate: ' + error.toString());
    throw error;
  }
}

/**
 * 依頼データを運転手（車両ナンバー）ごとにグループ化
 * @param {Array<Object>} requests - 依頼データの配列
 * @returns {Object} 車両ナンバーをキーとするオブジェクト
 */
function groupRequestsByDriver(requests) {
  const grouped = {};
  
  requests.forEach(request => {
    const vehicleNumber = request.vehicleNumber;
    
    if (!grouped[vehicleNumber]) {
      grouped[vehicleNumber] = [];
    }
    
    grouped[vehicleNumber].push(request);
  });
  
  // 各グループ内で積込時間順にソート
  for (const vehicleNumber in grouped) {
    grouped[vehicleNumber].sort((a, b) => {
      const timeA = new Date(a.loadTime);
      const timeB = new Date(b.loadTime);
      return timeA - timeB;
    });
  }
  
  return grouped;
}

// =============================================================================
// メール送信関数
// =============================================================================

/**
 * 運転手に通知メールを送信
 * @param {string} vehicleNumber - 車両ナンバー
 * @param {Array<Object>} requests - その運転手の依頼データ配列
 * @param {Date} targetDate - 対象日付
 * @returns {Object} { success: boolean, message: string }
 */
function sendNotificationToDriver(vehicleNumber, requests, targetDate) {
  try {
    // 車両情報を取得
    const vehicle = getVehicleByNumber(vehicleNumber);
    
    if (!vehicle) {
      logMessage('ERROR', `車両情報が見つかりません: ${vehicleNumber}`);
      return {
        success: false,
        message: '車両情報が見つかりません'
      };
    }
    
    // メールアドレスのバリデーション
    if (!isValidEmail(vehicle.email)) {
      logMessage('ERROR', `無効なメールアドレス: ${vehicle.email} (車両: ${vehicleNumber})`);
      return {
        success: false,
        message: '無効なメールアドレス'
      };
    }
    
    const driverName = vehicle.driverName || '運転手';
    const targetDateStr = formatDate(targetDate, 'yyyy年MM月dd日');
    
    logMessage('INFO', `メール送信: ${driverName}様 (${vehicle.email})`);
    
    // メール件名
    const subject = `${EMAIL_CONFIG.SUBJECT_PREFIX} ${targetDateStr}の配車計画`;
    
    // メール本文を作成
    const body = createEmailBody(driverName, targetDateStr, requests, vehicle);
    
    // HTML形式のメール本文を作成
    const htmlBody = createHtmlEmailBody(driverName, targetDateStr, requests, vehicle);
    
    // PDFファイルを作成
    const pdfBlob = createDispatchPlanPdf(driverName, targetDateStr, requests, vehicle);
    
    // メール送信オプション
    const options = {
      htmlBody: htmlBody,
      attachments: [pdfBlob],
      name: EMAIL_CONFIG.FROM_NAME
    };
    
    // CCアドレスが設定されている場合
    if (EMAIL_CONFIG.CC_ADDRESS && isValidEmail(EMAIL_CONFIG.CC_ADDRESS)) {
      options.cc = EMAIL_CONFIG.CC_ADDRESS;
    }
    
    // メール送信
    GmailApp.sendEmail(vehicle.email, subject, body, options);
    
    logMessage('INFO', `メール送信完了: ${driverName}様`);
    
    return {
      success: true,
      message: 'メール送信完了'
    };
    
  } catch (error) {
    logMessage('ERROR', 'sendNotificationToDriver: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * メール本文（テキスト形式）を作成
 * @param {string} driverName - 運転手名
 * @param {string} targetDateStr - 対象日付（表示用）
 * @param {Array<Object>} requests - 依頼データ配列
 * @param {Object} vehicle - 車両情報
 * @returns {string} メール本文
 */
function createEmailBody(driverName, targetDateStr, requests, vehicle) {
  let body = `${driverName} 様\n\n`;
  body += `お疲れ様です。\n`;
  body += `${targetDateStr}の配車計画をお知らせいたします。\n\n`;
  body += `【車両情報】\n`;
  body += `車両ナンバー: ${vehicle.number}\n`;
  body += `車番: ${vehicle.radioNumber}\n`;
  body += `車種: ${vehicle.vehicleType}\n\n`;
  body += `【業務内容】\n`;
  body += `本日の業務は${requests.length}件です。\n\n`;
  
  requests.forEach((request, index) => {
    body += `■ 依頼${index + 1}件目 (依頼ID: ${request.requestId})\n`;
    body += `  荷主: ${request.shipper}\n`;
    body += `  品名: ${request.productName}\n`;
    body += `  積込時間: ${formatTime(request.loadTime)}\n`;
    body += `  積込地: ${request.loadPlace1}`;
    if (request.loadPlace2) {
      body += ` → ${request.loadPlace2}`;
    }
    body += `\n`;
    body += `  荷卸時間: ${formatTime(request.unloadTime)}\n`;
    body += `  荷卸地: ${request.unloadPlace1}`;
    if (request.unloadPlace2) {
      body += ` → ${request.unloadPlace2}`;
    }
    body += `\n\n`;
  });
  
  body += `詳細は添付のPDFファイルをご確認ください。\n\n`;
  body += `安全運転でよろしくお願いいたします。\n\n`;
  body += `---\n`;
  body += `${EMAIL_CONFIG.FROM_NAME}\n`;
  
  return body;
}

/**
 * メール本文（HTML形式）を作成
 * @param {string} driverName - 運転手名
 * @param {string} targetDateStr - 対象日付（表示用）
 * @param {Array<Object>} requests - 依頼データ配列
 * @param {Object} vehicle - 車両情報
 * @returns {string} HTML形式のメール本文
 */
function createHtmlEmailBody(driverName, targetDateStr, requests, vehicle) {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: 'Meiryo', sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .info-box { background-color: #E3F2FD; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .request-item { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .request-header { font-weight: bold; color: #1976D2; margin-bottom: 10px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; }
          th { background-color: #E3F2FD; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${targetDateStr}の配車計画</h2>
        </div>
        <div class="content">
          <p>${driverName} 様</p>
          <p>お疲れ様です。<br>${targetDateStr}の配車計画をお知らせいたします。</p>
          
          <div class="info-box">
            <h3>【車両情報】</h3>
            <table>
              <tr><th>車両ナンバー</th><td>${vehicle.number}</td></tr>
              <tr><th>車番</th><td>${vehicle.radioNumber}</td></tr>
              <tr><th>車種</th><td>${vehicle.vehicleType}</td></tr>
            </table>
          </div>
          
          <h3>【業務内容】本日の業務は${requests.length}件です</h3>
  `;
  
  requests.forEach((request, index) => {
    html += `
      <div class="request-item">
        <div class="request-header">■ 依頼${index + 1}件目 (依頼ID: ${request.requestId})</div>
        <table>
          <tr><th>荷主</th><td>${request.shipper}</td></tr>
          <tr><th>品名</th><td>${request.productName}</td></tr>
          <tr><th>積込時間</th><td>${formatTime(request.loadTime)}</td></tr>
          <tr><th>積込地</th><td>${request.loadPlace1}${request.loadPlace2 ? ' → ' + request.loadPlace2 : ''}</td></tr>
          <tr><th>荷卸時間</th><td>${formatTime(request.unloadTime)}</td></tr>
          <tr><th>荷卸地</th><td>${request.unloadPlace1}${request.unloadPlace2 ? ' → ' + request.unloadPlace2 : ''}</td></tr>
        </table>
      </div>
    `;
  });
  
  html += `
          <p>詳細は添付のPDFファイルをご確認ください。</p>
          <p><strong>安全運転でよろしくお願いいたします。</strong></p>
        </div>
        <div class="footer">
          <p>${EMAIL_CONFIG.FROM_NAME}</p>
        </div>
      </body>
    </html>
  `;
  
  return html;
}

/**
 * 配車計画PDFファイルを作成
 * @param {string} driverName - 運転手名
 * @param {string} targetDateStr - 対象日付（表示用）
 * @param {Array<Object>} requests - 依頼データ配列
 * @param {Object} vehicle - 車両情報
 * @returns {Blob} PDFファイルのBlob
 */
function createDispatchPlanPdf(driverName, targetDateStr, requests, vehicle) {
  // HTMLコンテンツを作成
  let htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Meiryo', sans-serif; margin: 20px; }
          h1 { text-align: center; color: #1976D2; border-bottom: 3px solid #2196F3; padding-bottom: 10px; }
          h2 { color: #1976D2; margin-top: 20px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table th, .info-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .info-table th { background-color: #E3F2FD; width: 30%; }
          .request-block { page-break-inside: avoid; margin: 20px 0; padding: 15px; border: 2px solid #2196F3; border-radius: 5px; }
          .request-title { font-size: 18px; font-weight: bold; color: #1976D2; margin-bottom: 10px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>配車計画書</h1>
        <p style="text-align: right;">発行日: ${formatDate(new Date(), 'yyyy年MM月dd日')}</p>
        
        <h2>運転手情報</h2>
        <table class="info-table">
          <tr><th>運転手名</th><td>${driverName}</td></tr>
          <tr><th>業務実施日</th><td>${targetDateStr}</td></tr>
          <tr><th>車両ナンバー</th><td>${vehicle.number}</td></tr>
          <tr><th>車番</th><td>${vehicle.radioNumber}</td></tr>
          <tr><th>車種</th><td>${vehicle.vehicleType}</td></tr>
          <tr><th>業務件数</th><td>${requests.length}件</td></tr>
        </table>
        
        <h2>業務内容</h2>
  `;
  
  requests.forEach((request, index) => {
    htmlContent += `
      <div class="request-block">
        <div class="request-title">依頼 ${index + 1}件目 (依頼ID: ${request.requestId})</div>
        <table class="info-table">
          <tr><th>荷主</th><td>${request.shipper}</td></tr>
          <tr><th>品名</th><td>${request.productName}</td></tr>
          <tr><th>積込時間</th><td>${formatTime(request.loadTime)}</td></tr>
          <tr><th>積込地</th><td>${request.loadPlace1}${request.loadPlace2 ? '<br>→ ' + request.loadPlace2 : ''}</td></tr>
          <tr><th>荷卸時間</th><td>${formatTime(request.unloadTime)}</td></tr>
          <tr><th>荷卸地</th><td>${request.unloadPlace1}${request.unloadPlace2 ? '<br>→ ' + request.unloadPlace2 : ''}</td></tr>
        </table>
      </div>
    `;
  });
  
  htmlContent += `
        <div class="footer">
          <p>この配車計画書は自動生成されました。</p>
          <p>${EMAIL_CONFIG.FROM_NAME}</p>
        </div>
      </body>
    </html>
  `;
  
  // HTMLからPDFを生成
  const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html')
    .getAs('application/pdf')
    .setName(`配車計画_${targetDateStr}_${driverName}.pdf`);
  
  return pdfBlob;
}

// =============================================================================
// トリガー設定関数（手動実行用）
// =============================================================================

/**
 * 日次通知トリガーを設定
 * この関数を手動で実行してトリガーを作成
 */
function setupDailyNotificationTrigger() {
  try {
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendDailyDispatchNotifications') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 新しいトリガーを作成（毎日18時に実行）
    ScriptApp.newTrigger('sendDailyDispatchNotifications')
      .timeBased()
      .atHour(NOTIFICATION_BATCH_HOUR)
      .everyDays(1)
      .create();
    
    logMessage('INFO', '日次通知トリガーを設定しました');
    return '日次通知トリガーの設定が完了しました';
    
  } catch (error) {
    logMessage('ERROR', 'setupDailyNotificationTrigger: ' + error.toString());
    throw error;
  }
}

/**
 * 日次通知トリガーを削除
 */
function removeDailyNotificationTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendDailyDispatchNotifications') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    logMessage('INFO', '日次通知トリガーを削除しました');
    return '日次通知トリガーの削除が完了しました';
    
  } catch (error) {
    logMessage('ERROR', 'removeDailyNotificationTrigger: ' + error.toString());
    throw error;
  }
}

/**
 * テスト実行用関数（即座に通知を送信）
 */
function testSendNotification() {
  return sendDailyDispatchNotifications();
}