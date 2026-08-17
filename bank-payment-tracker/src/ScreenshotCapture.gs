/**
 * Step 4 of the To-Be process: "Take the screenshot for above entries."
 *
 * For every journalized tracker row without a screenshot yet, exports the
 * matching row range from 'Transaction Tracker' as a PDF "snapshot" (the
 * standard Apps Script technique for capturing a sheet range as an image
 * document, since Sheets has no direct range-to-image API) and saves it to
 * a dated Drive folder as the audit support for that entry.
 */

function captureScreenshots() {
  var startTime = new Date();
  var trackerSheet = getOrCreateSheet_(SHEETS.TRACKER);
  var screenshotSheet = getOrCreateSheet_(SHEETS.SCREENSHOTS);
  var settings = loadSettings_();

  var lastRow = trackerSheet.getLastRow();
  if (lastRow < 2) {
    toast_('No transactions to capture yet.', 'Nothing to Do');
    return { captured: 0 };
  }

  var values = trackerSheet.getRange(2, 1, lastRow - 1, trackerSheet.getLastColumn()).getValues();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folder = getOutputFolder_(settings, formatDate_(new Date()));
  var captured = 0;
  var stamp = nowStamp_();
  var user = currentUser_();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var status = row[TRACKER_COLS.STATUS - 1];
    var existingLink = row[TRACKER_COLS.SCREENSHOT_LINK - 1];
    if (status !== STATUS.JOURNALIZED || existingLink) continue;

    var sourceRowNum = i + 2;
    var reference = row[TRACKER_COLS.REFERENCE - 1] || ('row-' + sourceRowNum);
    var link = exportRangeAsPdf_(ss, trackerSheet, sourceRowNum, folder, reference);

    trackerSheet.getRange(sourceRowNum, TRACKER_COLS.SCREENSHOT_LINK).setValue(link);
    trackerSheet.getRange(sourceRowNum, TRACKER_COLS.STATUS).setValue(STATUS.COMPLETE);
    screenshotSheet.appendRow([reference, sourceRowNum, link, stamp, user]);
    captured++;
  }

  logRun_('Capture Screenshots', captured + ' snapshot(s) saved to Drive', startTime);
  toast_(captured + ' snapshot(s) saved as audit support in Drive.', 'Screenshots Captured', 8);
  return { captured: captured };
}

/** Resolves (and lazily creates) the Drive folder used for exported support docs. */
function getOutputFolder_(settings, subfolderName) {
  var root;
  var folderId = settings[SETTINGS_KEYS.DRIVE_FOLDER_ID];
  if (folderId) {
    try {
      root = DriveApp.getFolderById(folderId);
    } catch (e) {
      root = null;
    }
  }
  if (!root) {
    var candidates = DriveApp.getFoldersByName('Bank Payment Tracker Exports');
    root = candidates.hasNext() ? candidates.next() : DriveApp.createFolder('Bank Payment Tracker Exports');
  }
  if (!subfolderName) return root;

  var subfolders = root.getFoldersByName(subfolderName);
  return subfolders.hasNext() ? subfolders.next() : root.createFolder(subfolderName);
}

/**
 * Exports a single tracker row as a one-page PDF snapshot using the
 * spreadsheet export endpoint (range restricted to that row), then saves
 * it to Drive and returns a shareable link.
 */
function exportRangeAsPdf_(ss, sheet, rowNum, folder, reference) {
  var gid = sheet.getSheetId();
  var lastCol = sheet.getLastColumn();
  var url = ss.getUrl().replace(/\/edit.*$/, '') +
    '/export?format=pdf' +
    '&gid=' + gid +
    '&range=A1:' + columnToLetter_(lastCol) + rowNum +
    '&size=A4&portrait=true&fitw=true&gridlines=true&printtitle=false';

  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Snapshot export failed (HTTP ' + response.getResponseCode() + ') for row ' + rowNum);
  }

  var safeRef = String(reference).replace(/[\\/:*?"<>|]/g, '-');
  var fileName = 'TXN_' + safeRef + '_row' + rowNum + '.pdf';
  // Sharing intentionally left at the folder's default (private) permissions —
  // these are financial audit documents and should not become link-shareable.
  var file = folder.createFile(response.getBlob().setName(fileName));
  return file.getUrl();
}

function columnToLetter_(column) {
  var letter = '';
  while (column > 0) {
    var remainder = (column - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    column = Math.floor((column - remainder) / 26);
  }
  return letter;
}
