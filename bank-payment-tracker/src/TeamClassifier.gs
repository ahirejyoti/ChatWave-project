/**
 * Step 2 of the To-Be process: "Identify the responsible team based on
 * database." Rules come from the 'Team Mapping DB' sheet so Finance can
 * maintain the lookup without touching code.
 */

/** Loads and normalizes the Team Mapping DB rows, sorted by priority ascending. */
function loadTeamRules_() {
  var sheet = getOrCreateSheet_(SHEETS.TEAM_DB);
  var rows = readTable_(sheet, 2);
  var rules = rows
    .filter(function (row) { return String(row[TEAM_DB_COLS.TEAM - 1] || '').trim() !== ''; })
    .map(function (row) {
      return {
        priority: Number(row[TEAM_DB_COLS.PRIORITY - 1]) || 999,
        keywords: String(row[TEAM_DB_COLS.KEYWORDS - 1] || ''),
        matchType: String(row[TEAM_DB_COLS.MATCH_TYPE - 1] || 'CONTAINS').toUpperCase().trim(),
        team: String(row[TEAM_DB_COLS.TEAM - 1] || '').trim(),
        glAccount: String(row[TEAM_DB_COLS.GL_ACCOUNT - 1] || '').trim(),
        costCenter: String(row[TEAM_DB_COLS.COST_CENTER - 1] || '').trim(),
        narrationTemplate: String(row[TEAM_DB_COLS.NARRATION_TEMPLATE - 1] || '')
      };
    });
  rules.sort(function (a, b) { return a.priority - b.priority; });
  return rules;
}

/**
 * Matches a transaction description against the mapping rules.
 * Returns the first (highest-priority) match, or null if unmatched.
 */
function classifyTransaction_(description, rules) {
  var text = String(description || '');
  var upperText = text.toUpperCase();

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (matchesRule_(upperText, rule)) {
      return rule;
    }
  }
  return null;
}

function matchesRule_(upperText, rule) {
  if (rule.matchType === 'REGEX') {
    try {
      var re = new RegExp(rule.keywords, 'i');
      return re.test(upperText);
    } catch (e) {
      return false; // invalid regex in the DB row — skip rather than throw
    }
  }

  var terms = rule.keywords.split(',').map(function (t) { return t.trim().toUpperCase(); }).filter(String);
  return terms.some(function (term) {
    if (rule.matchType === 'STARTSWITH') return upperText.indexOf(term) === 0;
    return upperText.indexOf(term) !== -1; // CONTAINS (default)
  });
}
