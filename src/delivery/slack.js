export async function deliverSlack(deliveryConfig, report) {
  const { webhook_url, channel } = deliveryConfig;
  if (!webhook_url) throw new Error('Slack webhook_url is required in delivery_config');

  const maxRows = 20;
  const displayRows = report.rows.slice(0, maxRows);

  // Build a text table for Slack
  const header = report.columns.join(' | ');
  const separator = report.columns.map(c => '-'.repeat(Math.max(c.length, 6))).join('-+-');
  const dataRows = displayRows.map(row =>
    report.columns.map(c => String(row[c] ?? '')).join(' | ')
  );

  let text = `*${report.pipelineName}* — ${report.rowCount} rows\n`;
  if (report.alert) {
    text += `🚨 *Alert:* ${report.alert}\n`;
  }
  text += '```\n' + [header, separator, ...dataRows].join('\n') + '\n```';
  if (report.rows.length > maxRows) {
    text += `\n_Showing ${maxRows} of ${report.rows.length} rows_`;
  }

  const payload = { text };
  if (channel) payload.channel = channel;

  const res = await fetch(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
}
