'use strict';

var util = require('util');
var async = require('async');
var commandLineArgs = require('command-line-args');
var logger = require('./lib/logger');
var Mailer = require('./lib/mailer');
var reportGenerator = require('./lib/reportGenerator');
var triton = require('./lib/triton');

var CLI_REPORT_TYPES = {
  console: 'console',
  email: 'email'
};

function getCommandLineArgs() {
  var cli = commandLineArgs([
    { name: 'days', alias: 'd', type: Number },
    { name: 'reportType', alias: 'r', type: String, defaultValue: CLI_REPORT_TYPES.console },
    { name: 'mailHost', alias: 'm', type: String },
    { name: 'mailFrom', alias: 'f', type: String },
    { name: 'mailTo', alias: 't', type: String }
  ]);

  return cli.parse();
}

function log(message) {
  logger.log(message);
}

function validateCommandLineArgs(args) {
  if (!args.days && args.days !== 0) {
    log('--days required');
    process.exit(1);
  }
  if (args.days < 1) {
    log('days must be greater than 0');
    process.exit(1);
  }

  var reportType = args.reportType.toLowerCase();
  if (reportType !== CLI_REPORT_TYPES.console && reportType !== CLI_REPORT_TYPES.email) {
    log('report type must be \'console\' or \'email\'');
    process.exit(1);
  }
  args.reportType = reportType;

  if (reportType === CLI_REPORT_TYPES.email) {
    if (!args.mailHost || !args.mailFrom || !args.mailTo) {
      log('must supply mail host, from, and to for email report type');
      process.exit(1);
    }
  }
}

function getConsoleReport(jobs, startDate, endDate, cb) {
  var report = reportGenerator.generateConsoleReport(jobs, startDate, endDate);
  return cb(null, report);
}

function getEmailReport(jobs, startDate, endDate, cb) {
  var report = reportGenerator.generateEmailReport(jobs, startDate, endDate);
  return cb(null, report);
}

function sendReportEmail(report, options) {
  triton.getDataCenterName(function (err, dcName) {
    function _getMailOptions() {
      return {
        host: options.mailHost,
        from: options.mailFrom,
        to: options.mailTo,
        subject: util.format('%s -- SDC Job Report', dcName)
      };
    }

    var mailer = new Mailer(_getMailOptions());
    mailer.sendMail(report);
  });
}

function outputReportToConsole(report) {
  console.log(report);
}

function scrubJobs(jobs, cb) {
  var jobScrubFns = jobs.map(function _createJobFn(job) {
    return function _scrubJob(callback) {
      var j = {};
      j.name = job.name;
      if (job.params.subtask) {
        j.name += '/' + job.params.subtask;
      }
      j.uuid = job.uuid || '';
      j.date = '';
      if (job.created_at) {
        j.date = new Date(job.created_at).toDateString();
      }
      j.origin = job.params.origin || '';
      j.execution = job.execution || '';

      j.creator = job.creator_uuid || '';
      if (!j.creator) {
        return callback(null, j);
      }

      triton.getUser(j.creator, function _handleUser(err, user) {
        j.creator = user.login
        return callback(null, j);
      });
    };
  });

  async.parallel(jobScrubFns, function _handleResult(err, results) {
    return cb(err, results);
  });
}

function runReporter() {
  var args = getCommandLineArgs();
  validateCommandLineArgs(args);

  var endDate = new Date();
  var startDate = new Date();
  var startDateEpoch = startDate.setDate(endDate.getDate() - args.days);

  triton.getJobs(startDateEpoch, function _getReport(err, jobs) {
    function _scrubJobs(callback) {
      scrubJobs(jobs, function _handleScrubbedJobs(err, scrubbedJobs) {
        return callback(err, scrubbedJobs);
      });
    }

    function _doReport(scrubbedJobs, callback) {
      switch(args.reportType) {
        case CLI_REPORT_TYPES.console:
          getConsoleReport(scrubbedJobs, startDate, endDate, function _handleReport(err, report) {
            outputReportToConsole(report);
            callback();
          });
          break;
        case CLI_REPORT_TYPES.email:
          getEmailReport(scrubbedJobs, startDate, endDate, function _handleReport(err, report) {
            sendReportEmail(report, args);
            callback();
          });
          break;
      }
    }

    async.waterfall([
      _scrubJobs,
      _doReport
    ]);
  });
}

runReporter();
