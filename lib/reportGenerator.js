'use strict';

var util = require('util');
var AsciiTable = require('ascii-table');

var generateConsoleReport = function _generateConsoleReport(jobs, startDate, endDate) {
  var table = new AsciiTable(util.format('Jobs from %s to %s', startDate.toDateString(), endDate.toDateString()));
  table.setHeading('NAME', 'UUID', 'DATE', 'ORIGIN', 'EXECUTION', 'CREATOR_UUID');

  jobs.forEach(function _generateRowForJob(job) {
    table.addRow(job.name, job.uuid, job.date, job.origin, job.execution, job.creator);
  });

  return table.toString();
};

var generateEmailReport = function _generateEmailReport(jobs, startDate, endDate) {
  var html = [];
  html.push('<html>');
  html.push('<body>');
  html.push(util.format('<span><strong>Jobs from %s to %s</strong></span>', startDate.toDateString(), endDate.toDateString()));
  html.push('<table border="1">');
  html.push('<tr><th>NAME</th><th>UUID</th><th>DATE</th><th>ORIGIN</th><th>EXECUTION</th><th>CREATOR_UUID</th></tr>');
  jobs.forEach(function _generateRowForJob(job) {
    html.push('<tr>');
    html.push(util.format('<td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td>', job.name, job.uuid, job.date, job.origin, job.execution, job.creator));
    html.push('</tr>');
  });
  html.push('</table>');
  html.push('</body>');
  html.push('</html>');
  return html.join('');
};

module.exports = {
  generateConsoleReport: generateConsoleReport,
  generateEmailReport: generateEmailReport
};
