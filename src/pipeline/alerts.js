/**
 * Evaluate a threshold alert condition against query results.
 *
 * Supported condition formats:
 *   "column_name > 100"
 *   "column_name < 50"
 *   "column_name >= 1000"
 *   "column_name <= 0"
 *   "column_name == 0"
 *   "row_count > 0"       (special: checks total row count)
 *   "row_count == 0"      (special: alert when no data)
 *
 * Returns alert message string if triggered, null otherwise.
 */
export function evaluateAlert(condition, data) {
  const match = condition.trim().match(/^(\w+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
  if (!match) return null;

  const [, field, operator, rawThreshold] = match;
  const threshold = parseFloat(rawThreshold);

  if (isNaN(threshold)) return null;

  // Special case: row_count
  if (field === 'row_count') {
    if (compare(data.rowCount, operator, threshold)) {
      return `row_count ${operator} ${threshold} triggered (actual: ${data.rowCount})`;
    }
    return null;
  }

  // Check each row for the condition
  for (const row of data.rows) {
    const value = parseFloat(row[field]);
    if (isNaN(value)) continue;
    if (compare(value, operator, threshold)) {
      return `${field} ${operator} ${threshold} triggered (found: ${value})`;
    }
  }

  return null;
}

function compare(value, operator, threshold) {
  switch (operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
    default: return false;
  }
}
