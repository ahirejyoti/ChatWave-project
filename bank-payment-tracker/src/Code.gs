/**
 * Bank Payment Tracker — Corporate Finance
 * Entry point: builds the custom menu and orchestrates the full pipeline.
 *
 * As-Is: manual statement entry + manual team lookup + manual journal prep
 * + manual screenshots ≈ 1.5–2 hrs/day.
 * To-Be (this script): one menu click runs steps 1–4 end to end in ~15–20 min.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bank Payment Tracker')
    .addItem('▶ Run Full Pipeline (Process → Journalize → Screenshot)', 'runFullPipeline')
    .addSeparator()
    .addItem('1. Process Bank Statement → Tracker', 'processTransactions')
    .addItem('2. Generate Journal Entries', 'generateJournalEntries')
    .addItem('3. Capture Screenshots (audit support)', 'captureScreenshots')
    .addItem('4. Export Journal Entries as SAP CSV', 'exportJournalEntriesToSAPFormatUi_')
    .addSeparator()
    .addItem('Setup / Repair Sheets', 'setupDatabaseSheets')
    .addToUi();
}

/** Runs the whole To-Be pipeline end to end, mirroring the four process steps. */
function runFullPipeline() {
  var pipelineStart = new Date();
  toast_('Starting full pipeline…', 'Bank Payment Tracker', 5);

  var processed = processTransactions();
  var journalized = generateJournalEntries();
  var captured = captureScreenshots();

  logRun_(
    'Full Pipeline',
    processed.added + ' processed, ' + journalized.created + ' journalized, ' + captured.captured + ' screenshots',
    pipelineStart
  );

  var seconds = Math.round((new Date().getTime() - pipelineStart.getTime()) / 1000);
  SpreadsheetApp.getUi().alert(
    'Pipeline Complete',
    'New transactions: ' + processed.added + '\n' +
      'Matched to a team: ' + processed.matched + '\n' +
      'Needs manual review: ' + processed.unmatched + '\n' +
      'Journal entries created: ' + journalized.created + '\n' +
      'Screenshots captured: ' + captured.captured + '\n' +
      'Total time: ' + seconds + ' sec',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Menu wrapper so the CSV export shows the resulting Drive link to the user. */
function exportJournalEntriesToSAPFormatUi_() {
  var url = exportJournalEntriesToSAPFormat();
  if (url) {
    SpreadsheetApp.getUi().alert('SAP CSV export ready:\n' + url);
  }
}
