/**
 * Bank Payment Tracker — Corporate Finance
 * Central configuration: sheet names, column layouts, and tunables.
 * Edit values here (not the logic files) when adapting to a new bank
 * statement format or chart of accounts.
 */

var SHEETS = {
  SETTINGS: 'Settings',
  BANK_STATEMENT: 'Bank Statement',
  TEAM_DB: 'Team Mapping DB',
  TRACKER: 'Transaction Tracker',
  JOURNAL: 'Journal Entries',
  SCREENSHOTS: 'Screenshot Log',
  RUN_LOG: 'Run Log'
};

// 1-based column indexes for 'Bank Statement' (raw paste/import from the bank).
var BANK_COLS = {
  DATE: 1,
  VALUE_DATE: 2,
  DESCRIPTION: 3,
  REFERENCE: 4,
  DEBIT: 5,
  CREDIT: 6,
  BALANCE: 7
};

// 1-based column indexes for 'Team Mapping DB' (the lookup database).
var TEAM_DB_COLS = {
  PRIORITY: 1,
  KEYWORDS: 2, // comma-separated keywords/phrases or a single regex
  MATCH_TYPE: 3, // CONTAINS | STARTSWITH | REGEX
  TEAM: 4,
  GL_ACCOUNT: 5,
  COST_CENTER: 6,
  NARRATION_TEMPLATE: 7 // may use {{description}}, {{reference}}, {{team}}
};

// 1-based column indexes for 'Transaction Tracker' (the to-be output format).
var TRACKER_COLS = {
  SR_NO: 1,
  DATE: 2,
  VALUE_DATE: 3,
  DESCRIPTION: 4,
  REFERENCE: 5,
  DEBIT: 6,
  CREDIT: 7,
  BALANCE: 8,
  TEAM: 9,
  GL_ACCOUNT: 10,
  COST_CENTER: 11,
  MATCHED_RULE: 12,
  STATUS: 13,
  JOURNAL_REF: 14,
  SCREENSHOT_LINK: 15,
  UNIQUE_KEY: 16,
  PROCESSED_ON: 17,
  PROCESSED_BY: 18
};

var STATUS = {
  MATCHED: 'Matched',
  UNMATCHED: 'Unmatched - Manual Review',
  JOURNALIZED: 'Journalized',
  COMPLETE: 'Complete'
};

// 1-based column indexes for 'Journal Entries' (SAP-ready export format).
var JOURNAL_COLS = {
  JOURNAL_REF: 1,
  POSTING_DATE: 2,
  DOCUMENT_DATE: 3,
  DOC_TYPE: 4,
  COMPANY_CODE: 5,
  GL_ACCOUNT: 6,
  COST_CENTER: 7,
  DEBIT_AMOUNT: 8,
  CREDIT_AMOUNT: 9,
  CURRENCY: 10,
  TEXT: 11,
  REFERENCE: 12,
  TEAM: 13,
  SOURCE_ROW: 14,
  CREATED_ON: 15
};

var SCREENSHOT_COLS = {
  REFERENCE: 1,
  TRACKER_ROW: 2,
  DRIVE_LINK: 3,
  GENERATED_ON: 4,
  GENERATED_BY: 5
};

// Keys read from the 'Settings' sheet (Key | Value two-column layout).
var SETTINGS_KEYS = {
  COMPANY_CODE: 'Company Code',
  CURRENCY: 'Default Currency',
  BANK_GL_ACCOUNT: 'Bank GL Account',
  DOC_TYPE_RECEIPT: 'Document Type - Money In',
  DOC_TYPE_PAYMENT: 'Document Type - Money Out',
  DRIVE_FOLDER_ID: 'Screenshot Drive Folder ID'
};

function getDefaultSettings_() {
  var o = {};
  o[SETTINGS_KEYS.COMPANY_CODE] = '1000';
  o[SETTINGS_KEYS.CURRENCY] = 'INR';
  o[SETTINGS_KEYS.BANK_GL_ACCOUNT] = '200000';
  o[SETTINGS_KEYS.DOC_TYPE_RECEIPT] = 'SA';
  o[SETTINGS_KEYS.DOC_TYPE_PAYMENT] = 'SA';
  o[SETTINGS_KEYS.DRIVE_FOLDER_ID] = '';
  return o;
}
