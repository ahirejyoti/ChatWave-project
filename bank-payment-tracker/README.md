# Bank Payment Tracker

**Business Unit:** Corporate Finance
**Submitted by:** Yaman Luthra · **Sponsor:** Jeetendra

A Google Apps Script tool bound to a Google Sheet that replaces the manual
bank-statement-to-journal-entry workflow with a one-click pipeline.

## Problem it solves

| | As-Is (manual) | To-Be (this tool) |
|---|---|---|
| Punch bank statement into tracker | Manual retyping | Paste/import once, script formats it |
| Identify responsible team | Manually read + judge | Auto-matched against a maintained database |
| Prepare journal entries | Manually typed | Auto-generated, SAP-upload-ready |
| Support documentation | Manual screenshots | Auto-captured PDF snapshot per entry |
| **Time / day** | **1.5 – 2 hrs** | **~15 – 20 min** (target 80–90% reduction) |

## How it works

The spreadsheet has these tabs, all created automatically by the setup step:

- **Bank Statement** — paste or import the raw statement here (Date, Description, Reference, Debit, Credit, Balance).
- **Team Mapping DB** — the "database" Finance maintains: keyword/regex rules mapped to a responsible Team, GL Account and Cost Center. This is the only sheet that needs regular upkeep.
- **Transaction Tracker** — the defined output format. Each statement row becomes one tracker row with team, GL account, and status (`Matched`, `Unmatched - Manual Review`, `Journalized`, `Complete`).
- **Journal Entries** — one debit/credit line pair per matched transaction (Bank GL vs. the team's GL account), in a layout close to a standard SAP journal upload (Company Code, GL Account, Cost Center, Doc Type, Debit/Credit, Text, Reference).
- **Screenshot Log** — a record of every audit-support PDF snapshot generated, with its Drive link.
- **Settings** — Company Code, currency, bank GL account, SAP document types, and the Drive folder used for exports.
- **Run Log** — timestamps every pipeline run so the time-saving metric is measurable, not anecdotal.

A custom **Bank Payment Tracker** menu appears in the spreadsheet with:

1. **Run Full Pipeline** — runs steps 1–4 below in one click.
2. **Process Bank Statement → Tracker** — formats new statement rows and classifies each against the Team Mapping DB. Already-processed rows (matched by date + description + reference + amount) are skipped, so it's safe to re-run after pasting more statement lines.
3. **Generate Journal Entries** — creates SAP-ready debit/credit line pairs for every `Matched` row that hasn't been journalized yet.
4. **Capture Screenshots** — exports each journalized row as a one-page PDF snapshot (Sheets has no direct range-to-image API, so this uses the spreadsheet's own PDF export endpoint) and saves it into a dated Drive folder as the audit trail, replacing manual screenshotting.
5. **Export Journal Entries as SAP CSV** — writes the Journal Entries sheet to a CSV file in Drive for upload into SAP.
6. **Setup / Repair Sheets** — (re)creates any missing tab with headers, sample data, and formatting. Safe to run any time; it never overwrites a tab that already has data.

## Setup

1. Create a new Google Sheet (or open the one Finance will use going forward).
2. Extensions → Apps Script.
3. Delete the default `Code.gs` stub, then create matching files and paste in the contents of each file under `src/` in this folder (`Config.gs`, `Utils.gs`, `SetupSheets.gs`, `TeamClassifier.gs`, `TransactionProcessor.gs`, `JournalEntryGenerator.gs`, `ScreenshotCapture.gs`, `Code.gs`).
4. Open the manifest (Project Settings → "Show appsscript.json") and replace it with `appsscript.json` from this folder.
5. Save, then reload the spreadsheet.
6. From the **Bank Payment Tracker** menu, run **Setup / Repair Sheets** and approve the OAuth prompts (Sheets, Drive).
7. Open **Team Mapping DB** and replace the sample rows with your real keyword → team → GL account → cost center mapping. `Priority` controls which rule wins when a description matches more than one row (lowest number wins).
8. Open **Settings** and fill in the real Company Code, currency, bank GL account, and SAP document types. Optionally set a specific Drive folder ID for exports; otherwise a "Bank Payment Tracker Exports" folder is created automatically.
9. Paste a day's bank statement into **Bank Statement**, then run **Run Full Pipeline** from the menu.

### Optional: deploy with `clasp`

If your team develops the script outside the browser editor:

```bash
npm install -g @google/clasp
clasp login
clasp create --type sheets --title "Bank Payment Tracker" --rootDir ./bank-payment-tracker
clasp push
```

## Notes for Corporate Finance / IT

- The SAP CSV export is a generic, human-readable journal layout (Company
  Code, GL Account, Cost Center, Debit/Credit, Doc Type, Text, Reference).
  Confirm the exact column order and doc types required by your SAP upload
  program (e.g. a custom `ZFI` batch program or standard `FB01`/session
  upload) and adjust `JOURNAL_COLS` / `buildJournalLine_` in
  `JournalEntryGenerator.gs` to match before using it for a live upload.
- Screenshot/PDF snapshots are saved with the destination folder's default
  (private) sharing — they are financial audit documents and are
  intentionally **not** made link-shareable by the script.
- Rows in `Bank Statement` are matched to `Transaction Tracker` by a
  composite key (date + description + reference + amounts), so pasting the
  same statement twice will not create duplicate tracker rows or journal
  entries.
- Any transaction not matched by a rule is flagged
  `Unmatched - Manual Review` in the tracker and is skipped by journal
  generation until someone fills in Team/GL Account/Cost Center by hand (or
  the Team Mapping DB is extended to cover it).
