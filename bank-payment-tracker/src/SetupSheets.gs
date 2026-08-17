/**
 * One-time (and re-runnable) setup: creates every tab with headers,
 * formatting, data validation and starter sample data so a fresh copy
 * of the spreadsheet is usable immediately.
 */

function setupDatabaseSheets() {
  setupSettingsSheet_();
  setupBankStatementSheet_();
  setupTeamDbSheet_();
  setupTrackerSheet_();
  setupJournalSheet_();
  setupScreenshotLogSheet_();
  getOrCreateSheet_(SHEETS.RUN_LOG);
  SpreadsheetApp.getActiveSpreadsheet().moveActiveSheet(1);
  toast_('All sheets are set up. Fill in the Team Mapping DB, paste a statement into "Bank Statement", then use the Bank Payment Tracker menu.', 'Setup Complete', 8);
}

function setHeader_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1c4e80').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function setupSettingsSheet_() {
  var sheet = getOrCreateSheet_(SHEETS.SETTINGS);
  if (sheet.getLastRow() > 0) return;
  setHeader_(sheet, ['Key', 'Value']);
  var defaults = getDefaultSettings_();
  var rows = Object.keys(defaults).map(function (k) { return [k, defaults[k]]; });
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.setColumnWidth(1, 260);
}

function setupBankStatementSheet_() {
  var sheet = getOrCreateSheet_(SHEETS.BANK_STATEMENT);
  if (sheet.getLastRow() > 0) return;
  setHeader_(sheet, ['Date', 'Value Date', 'Description (as in bank statement)', 'Reference / Cheque No', 'Debit', 'Credit', 'Balance']);
  var sample = [
    [new Date(), new Date(), 'NEFT CR FROM ACME CORP INV 4021', 'NEFT0001234', '', 250000, 1250000],
    [new Date(), new Date(), 'RTGS DR TO XYZ VENDOR PAYMENT', 'RTGS0004567', 85000, '', 1165000],
    [new Date(), new Date(), 'SALARY PAYOUT BATCH AUG', 'SALBATCH0822', 420000, '', 745000],
    [new Date(), new Date(), 'BANK CHARGES - RTGS', 'CHG0009981', 250, '', 744750]
  ];
  sheet.getRange(2, 1, sample.length, sample[0].length).setValues(sample);
  sheet.getRange(2, 1, sample.length, 2).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(2, 5, sample.length, 3).setNumberFormat('#,##0.00');
}

function setupTeamDbSheet_() {
  var sheet = getOrCreateSheet_(SHEETS.TEAM_DB);
  if (sheet.getLastRow() > 0) return;
  setHeader_(sheet, ['Priority (1=highest)', 'Keywords (comma-separated) or Regex', 'Match Type', 'Team', 'GL Account', 'Cost Center', 'Narration Template']);
  var sample = [
    [1, 'SALARY, PAYROLL, SALBATCH', 'CONTAINS', 'HR & Payroll', '600100', 'CC-HR', 'Salary payout - {{reference}}'],
    [2, 'NEFT CR, RTGS CR, IMPS CR', 'CONTAINS', 'Accounts Receivable', '400100', 'CC-AR', 'Customer receipt - {{description}}'],
    [3, 'VENDOR PAYMENT, RTGS DR, NEFT DR', 'CONTAINS', 'Accounts Payable', '500100', 'CC-AP', 'Vendor payment - {{description}}'],
    [4, 'BANK CHARGES, CHG, AMC FEE', 'CONTAINS', 'Treasury', '700200', 'CC-TREASURY', 'Bank charges - {{reference}}'],
    [5, 'GST|TDS|TAX', 'REGEX', 'Taxation', '210100', 'CC-TAX', 'Statutory payment - {{description}}']
  ];
  sheet.getRange(2, 1, sample.length, sample[0].length).setValues(sample);

  var matchTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['CONTAINS', 'STARTSWITH', 'REGEX'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, TEAM_DB_COLS.MATCH_TYPE, 200, 1).setDataValidation(matchTypeRule);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(7, 260);
}

function setupTrackerSheet_() {
  var sheet = getOrCreateSheet_(SHEETS.TRACKER);
  if (sheet.getLastRow() > 0) return;
  setHeader_(sheet, [
    'Sr No', 'Date', 'Value Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance',
    'Team', 'GL Account', 'Cost Center', 'Matched Rule', 'Status', 'Journal Ref',
    'Screenshot Link', 'Unique Key', 'Processed On', 'Processed By'
  ]);
  sheet.hideColumns(TRACKER_COLS.UNIQUE_KEY);
  sheet.setColumnWidth(TRACKER_COLS.DESCRIPTION, 260);

  var rules = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains(STATUS.UNMATCHED)
    .setBackground('#fce8e6')
    .setRanges([sheet.getRange('M2:M2000')])
    .build();
  var rules2 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains(STATUS.MATCHED)
    .setBackground('#e6f4ea')
    .setRanges([sheet.getRange('M2:M2000')])
    .build();
  sheet.setConditionalFormatRules([rules, rules2]);
}

function setupJournalSheet_() {
  var sheet = getOrCreateSheet_(SHEETS.JOURNAL);
  if (sheet.getLastRow() > 0) return;
  setHeader_(sheet, [
    'Journal Ref', 'Posting Date', 'Document Date', 'Doc Type', 'Company Code', 'GL Account',
    'Cost Center', 'Debit Amount', 'Credit Amount', 'Currency', 'Text / Narration',
    'Reference', 'Team', 'Source Tracker Row', 'Created On'
  ]);
  sheet.setColumnWidth(JOURNAL_COLS.TEXT, 280);
}

function setupScreenshotLogSheet_() {
  var sheet = getOrCreateSheet_(SHEETS.SCREENSHOTS);
  if (sheet.getLastRow() > 0) return;
  setHeader_(sheet, ['Reference', 'Tracker Row', 'Drive Link', 'Generated On', 'Generated By']);
  sheet.setColumnWidth(SCREENSHOT_COLS.DRIVE_LINK, 320);
}
