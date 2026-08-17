/**
 * Steps 1 & 2 of the To-Be process:
 *   1. Prepare the transaction tracker in the defined format.
 *   2. Identify the responsible team based on the database.
 *
 * Reads 'Bank Statement', skips rows already processed (by unique key),
 * classifies each new row against the Team Mapping DB, and appends the
 * result to 'Transaction Tracker'.
 */

function processTransactions() {
  var startTime = new Date();
  var bankSheet = getOrCreateSheet_(SHEETS.BANK_STATEMENT);
  var trackerSheet = getOrCreateSheet_(SHEETS.TRACKER);

  var statementRows = readTable_(bankSheet, 2);
  if (statementRows.length === 0) {
    toast_('No rows found in "Bank Statement". Paste/import the statement first.', 'Nothing to Process');
    return { added: 0, matched: 0, unmatched: 0 };
  }

  var rules = loadTeamRules_();
  var existingKeys = getExistingTrackerKeys_(trackerSheet);
  var nextSrNo = Math.max(trackerSheet.getLastRow() - 1, 0); // header is row 1; this is the count of existing data rows

  var newRows = [];
  var matchedCount = 0;
  var unmatchedCount = 0;
  var user = currentUser_();
  var stamp = nowStamp_();

  statementRows.forEach(function (row) {
    var date = row[BANK_COLS.DATE - 1];
    var valueDate = row[BANK_COLS.VALUE_DATE - 1];
    var description = row[BANK_COLS.DESCRIPTION - 1];
    var reference = row[BANK_COLS.REFERENCE - 1];
    var debit = Number(row[BANK_COLS.DEBIT - 1]) || 0;
    var credit = Number(row[BANK_COLS.CREDIT - 1]) || 0;
    var balance = row[BANK_COLS.BALANCE - 1];

    if (!description && !reference && !debit && !credit) return; // blank row

    var uniqueKey = buildUniqueKey_(date, description, reference, debit, credit);
    if (existingKeys[uniqueKey]) return; // already tracked in a previous run

    var match = classifyTransaction_(description, rules);
    nextSrNo++;

    if (match) {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    var trackerRow = [];
    trackerRow[TRACKER_COLS.SR_NO - 1] = nextSrNo;
    trackerRow[TRACKER_COLS.DATE - 1] = date;
    trackerRow[TRACKER_COLS.VALUE_DATE - 1] = valueDate;
    trackerRow[TRACKER_COLS.DESCRIPTION - 1] = description;
    trackerRow[TRACKER_COLS.REFERENCE - 1] = reference;
    trackerRow[TRACKER_COLS.DEBIT - 1] = debit || '';
    trackerRow[TRACKER_COLS.CREDIT - 1] = credit || '';
    trackerRow[TRACKER_COLS.BALANCE - 1] = balance;
    trackerRow[TRACKER_COLS.TEAM - 1] = match ? match.team : '';
    trackerRow[TRACKER_COLS.GL_ACCOUNT - 1] = match ? match.glAccount : '';
    trackerRow[TRACKER_COLS.COST_CENTER - 1] = match ? match.costCenter : '';
    trackerRow[TRACKER_COLS.MATCHED_RULE - 1] = match ? match.keywords : '';
    trackerRow[TRACKER_COLS.STATUS - 1] = match ? STATUS.MATCHED : STATUS.UNMATCHED;
    trackerRow[TRACKER_COLS.JOURNAL_REF - 1] = '';
    trackerRow[TRACKER_COLS.SCREENSHOT_LINK - 1] = '';
    trackerRow[TRACKER_COLS.UNIQUE_KEY - 1] = uniqueKey;
    trackerRow[TRACKER_COLS.PROCESSED_ON - 1] = stamp;
    trackerRow[TRACKER_COLS.PROCESSED_BY - 1] = user;

    newRows.push(trackerRow);
    existingKeys[uniqueKey] = true;
  });

  if (newRows.length > 0) {
    var startRow = trackerSheet.getLastRow() + 1;
    trackerSheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
    trackerSheet.getRange(startRow, TRACKER_COLS.DATE, newRows.length, 2).setNumberFormat('yyyy-mm-dd');
    trackerSheet.getRange(startRow, TRACKER_COLS.DEBIT, newRows.length, 3).setNumberFormat('#,##0.00');
  }

  logRun_('Process Transactions', newRows.length + ' new (' + matchedCount + ' matched, ' + unmatchedCount + ' unmatched)', startTime);
  toast_(newRows.length + ' new transaction(s) added — ' + matchedCount + ' matched, ' + unmatchedCount + ' need manual review.', 'Transactions Processed', 8);

  return { added: newRows.length, matched: matchedCount, unmatched: unmatchedCount };
}

/** Map of unique-key -> true for every row already present in the tracker. */
function getExistingTrackerKeys_(trackerSheet) {
  var rows = readTable_(trackerSheet, 2);
  var keys = {};
  rows.forEach(function (row) {
    var key = row[TRACKER_COLS.UNIQUE_KEY - 1];
    if (key) keys[key] = true;
  });
  return keys;
}
