/**
 * Shared helpers used across the Bank Payment Tracker modules.
 */

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function toast_(message, title, seconds) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title || 'Bank Payment Tracker', seconds || 5);
}

function readTable_(sheet, firstDataRow) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  firstDataRow = firstDataRow || 2;
  if (lastRow < firstDataRow) return [];
  return sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, lastCol).getValues();
}

/** Reads the Settings sheet (Key | Value) into a plain object, falling back to defaults. */
function loadSettings_() {
  var sheet = getOrCreateSheet_(SHEETS.SETTINGS);
  var defaults = getDefaultSettings_();
  var rows = readTable_(sheet, 2);
  var settings = {};
  for (var key in defaults) settings[key] = defaults[key];
  rows.forEach(function (row) {
    var k = String(row[0] || '').trim();
    var v = row[1];
    if (k) settings[k] = v;
  });
  return settings;
}

/** Builds a stable de-duplication key for a bank statement row. */
function buildUniqueKey_(dateVal, description, reference, debit, credit) {
  var d = dateVal instanceof Date ? dateVal.getTime() : String(dateVal);
  return [d, String(description || '').trim(), String(reference || '').trim(), debit || 0, credit || 0].join('|');
}

function formatDate_(dateVal) {
  if (!(dateVal instanceof Date)) return String(dateVal || '');
  return Utilities.formatDate(dateVal, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd');
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
}

function currentUser_() {
  try {
    return Session.getActiveUser().getEmail() || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

function fillTemplate_(template, values) {
  if (!template) return '';
  return String(template).replace(/{{\s*(\w+)\s*}}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
  });
}

function logRun_(step, detail, startTime) {
  var sheet = getOrCreateSheet_(SHEETS.RUN_LOG);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Step', 'Detail', 'Started', 'Finished', 'Duration (sec)', 'Run By']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  var finished = new Date();
  var durationSec = startTime ? Math.round((finished.getTime() - startTime.getTime()) / 1000) : '';
  var startedStamp = startTime
    ? Utilities.formatDate(startTime, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss')
    : '';
  sheet.appendRow([step, detail, startedStamp, nowStamp_(), durationSec, currentUser_()]);
}
