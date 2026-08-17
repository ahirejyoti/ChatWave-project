/**
 * Step 3 of the To-Be process: "Prepare the journal entries."
 *
 * For every 'Matched' tracker row without a Journal Ref yet, creates a
 * double-entry line pair (Bank GL vs. the team's GL account) in the
 * 'Journal Entries' sheet, in a layout close to a standard SAP FB01 /
 * journal upload template. Writes the generated ref back onto the tracker
 * row so re-runs never duplicate postings.
 */

function generateJournalEntries() {
  var startTime = new Date();
  var trackerSheet = getOrCreateSheet_(SHEETS.TRACKER);
  var journalSheet = getOrCreateSheet_(SHEETS.JOURNAL);
  var settings = loadSettings_();

  var lastRow = trackerSheet.getLastRow();
  if (lastRow < 2) {
    toast_('No transactions to journalize yet. Run "Process Transactions" first.', 'Nothing to Do');
    return { created: 0 };
  }

  var range = trackerSheet.getRange(2, 1, lastRow - 1, trackerSheet.getLastColumn());
  var values = range.getValues();
  var stamp = nowStamp_();
  var journalRows = [];
  var created = 0;

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var status = row[TRACKER_COLS.STATUS - 1];
    var journalRef = row[TRACKER_COLS.JOURNAL_REF - 1];
    if (status !== STATUS.MATCHED || journalRef) continue; // only matched + not-yet-journalized

    var date = row[TRACKER_COLS.DATE - 1];
    var description = row[TRACKER_COLS.DESCRIPTION - 1];
    var reference = row[TRACKER_COLS.REFERENCE - 1];
    var debit = Number(row[TRACKER_COLS.DEBIT - 1]) || 0;
    var credit = Number(row[TRACKER_COLS.CREDIT - 1]) || 0;
    var team = row[TRACKER_COLS.TEAM - 1];
    var glAccount = row[TRACKER_COLS.GL_ACCOUNT - 1];
    var costCenter = row[TRACKER_COLS.COST_CENTER - 1];
    var sourceRowNum = i + 2;

    var ref = buildJournalRef_(date, sourceRowNum);
    var amount = credit > 0 ? credit : debit;
    var isReceipt = credit > 0; // money in vs. money out drives which side the bank GL sits on
    var docType = isReceipt ? settings[SETTINGS_KEYS.DOC_TYPE_RECEIPT] : settings[SETTINGS_KEYS.DOC_TYPE_PAYMENT];
    var narration = buildNarration_(description, reference, team);

    // Line 1: Bank GL
    journalRows.push(buildJournalLine_({
      ref: ref, date: date, docType: docType, settings: settings,
      glAccount: settings[SETTINGS_KEYS.BANK_GL_ACCOUNT], costCenter: 'CC-TREASURY',
      debit: isReceipt ? amount : 0, credit: isReceipt ? 0 : amount,
      narration: narration, reference: reference, team: 'Treasury (Bank)',
      sourceRow: sourceRowNum, stamp: stamp
    }));

    // Line 2: Team / activity GL
    journalRows.push(buildJournalLine_({
      ref: ref, date: date, docType: docType, settings: settings,
      glAccount: glAccount, costCenter: costCenter,
      debit: isReceipt ? 0 : amount, credit: isReceipt ? amount : 0,
      narration: narration, reference: reference, team: team,
      sourceRow: sourceRowNum, stamp: stamp
    }));

    trackerSheet.getRange(sourceRowNum, TRACKER_COLS.JOURNAL_REF).setValue(ref);
    trackerSheet.getRange(sourceRowNum, TRACKER_COLS.STATUS).setValue(STATUS.JOURNALIZED);
    created++;
  }

  if (journalRows.length > 0) {
    var startRow = journalSheet.getLastRow() + 1;
    journalSheet.getRange(startRow, 1, journalRows.length, journalRows[0].length).setValues(journalRows);
    journalSheet.getRange(startRow, JOURNAL_COLS.DEBIT_AMOUNT, journalRows.length, 2).setNumberFormat('#,##0.00');
    journalSheet.getRange(startRow, JOURNAL_COLS.POSTING_DATE, journalRows.length, 2).setNumberFormat('yyyy-mm-dd');
  }

  logRun_('Generate Journal Entries', created + ' transaction(s) journalized (' + journalRows.length + ' lines)', startTime);
  toast_(created + ' transaction(s) journalized into ' + journalRows.length + ' SAP-ready lines.', 'Journal Entries Created', 8);
  return { created: created };
}

function buildJournalRef_(date, sourceRowNum) {
  var d = date instanceof Date ? Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd') : 'NA';
  return 'JE-' + d + '-' + sourceRowNum;
}

function buildNarration_(description, reference, team) {
  return (team ? team + ': ' : '') + String(description || '').trim() + (reference ? ' (' + reference + ')' : '');
}

function buildJournalLine_(p) {
  var line = [];
  line[JOURNAL_COLS.JOURNAL_REF - 1] = p.ref;
  line[JOURNAL_COLS.POSTING_DATE - 1] = p.date;
  line[JOURNAL_COLS.DOCUMENT_DATE - 1] = p.date;
  line[JOURNAL_COLS.DOC_TYPE - 1] = p.docType;
  line[JOURNAL_COLS.COMPANY_CODE - 1] = p.settings[SETTINGS_KEYS.COMPANY_CODE];
  line[JOURNAL_COLS.GL_ACCOUNT - 1] = p.glAccount;
  line[JOURNAL_COLS.COST_CENTER - 1] = p.costCenter;
  line[JOURNAL_COLS.DEBIT_AMOUNT - 1] = p.debit || '';
  line[JOURNAL_COLS.CREDIT_AMOUNT - 1] = p.credit || '';
  line[JOURNAL_COLS.CURRENCY - 1] = p.settings[SETTINGS_KEYS.CURRENCY];
  line[JOURNAL_COLS.TEXT - 1] = p.narration;
  line[JOURNAL_COLS.REFERENCE - 1] = p.reference;
  line[JOURNAL_COLS.TEAM - 1] = p.team;
  line[JOURNAL_COLS.SOURCE_ROW - 1] = p.sourceRow;
  line[JOURNAL_COLS.CREATED_ON - 1] = p.stamp;
  return line;
}

/** Exports the Journal Entries sheet as a CSV file in Drive, ready for SAP upload. */
function exportJournalEntriesToSAPFormat() {
  var startTime = new Date();
  var sheet = getOrCreateSheet_(SHEETS.JOURNAL);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    toast_('No journal entries to export yet.', 'Nothing to Export');
    return null;
  }
  var values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  var csv = values.map(function (row) {
    return row.map(function (cell) {
      if (cell instanceof Date) cell = formatDate_(cell);
      var s = String(cell === null || cell === undefined ? '' : cell);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',');
  }).join('\n');

  var settings = loadSettings_();
  var folder = getOutputFolder_(settings);
  var fileName = 'SAP_Journal_Export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd_HHmmss') + '.csv';
  var file = folder.createFile(fileName, csv, MimeType.CSV);

  logRun_('Export SAP CSV', fileName, startTime);
  toast_('Exported: ' + fileName, 'SAP Export Ready', 6);
  return file.getUrl();
}
