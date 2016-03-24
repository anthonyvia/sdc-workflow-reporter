'use strict';

var spawn = require('child_process').spawn;
var util = require('util');

var WORKFLOW_BATCH_LIMIT = 10;

/**
 * Recursive function that will continue to call sdc-workflow to collect
 * batches of jobs from sdc-workflow until there are no more jobs matching
 * the criteria.
 * startDate: criteria for sdc-workflow, oldest date from which to collect jobs
 *            in epoch format
 * limit: batch size to collect from sdc-workflow
 * offset: offset from which to start collection jobs from sdc-workflow
 * cb: function (err, jobs)
 */
var getJobsFromWorkflow = function _getJobsFromWorkflow(startDate, limit, cb) {
  var workflowCmd = '/opt/smartdc/bin/sdc-workflow';
  var jsonCmd = 'json';
  var jsonArgs = ['-gH'];

  function _getWorkflowArgs(offset) {
    return [util.format('/jobs?limit=%d&offset=%d', limit, offset)];
  }

  function _runWorkflow(offset, callback) {
    var jobs = [];
    var jsonStdout = [];
    var json = spawn(jsonCmd, jsonArgs);

    json.stdout.on('data', function _handleJsonStdout(chunk) {
      jsonStdout.push(chunk);
    });

    json.on('close', function _handleJsonClose(code) {
      jsonStdout = jsonStdout.join('');

      if (jsonStdout === '') {
        return callback(null, jobs);
      }

      jobs = JSON.parse(jsonStdout).filter(function _filterJobs(job) {
        return job.started > startDate;
      });

      // if we have less then `limit`, we know the next batch request to
      // sdc-workflow would give us no new jobs
      if (jobs.length < limit) {
        return callback(null, jobs);
      }

      // since we received the largest amount of jobs possible, we need to call
      // sdc-workflow again because there might be more jobs
      _runWorkflow(offset + limit, function _handleNewJobs(err, newJobs) {
        return callback(null, jobs.concat(newJobs));
      });
    });

    var workflow = spawn(workflowCmd, _getWorkflowArgs(offset));
    workflow.stdout.on('data', function _handleWorkflowStdout(chunk) {
      json.stdin.write(chunk);
    });

    workflow.on('close', function _handleWorkflowClose(code) {
      json.stdin.end();
    });
  }

  _runWorkflow(0, function _handleJobsFromWorkflow(err, jobs) {
    return cb(null, jobs);
  });
};

/**
 *  Public API
 */

var getDataCenterName = function _getDataCenterName(cb) {
  var getDCNameCmd = 'sysinfo'
  var sysinfo = spawn(getDCNameCmd);

  var stdout = '';
  sysinfo.stdout.on('data', function _handleSysinfoStdout(data) {
    stdout += data.toString();
  });

  sysinfo.on('close', function _handleSysinfoClose() {
    var json = JSON.parse(stdout.trim());
    return cb(null, json['Datacenter Name']);
  });
};

/**
 * Wrapper for `getJobsFromWorkflow`
 * startDate: Oldest date from which to collect jobs in epoch format
 * cb: function (err, jobs)
 */
var getJobs = function _getJobs(startDate, cb) {
  getJobsFromWorkflow(startDate, WORKFLOW_BATCH_LIMIT, function _handleJobs(err, jobs) {
    return cb(err, jobs);
  });
};

/**
 * Calls sdc-useradm to get user info
 * uuid: user uuid
 */
var getUser = function _getUser(uuid, cb) {
  var userCmd = 'sdc-useradm';
  var userArgs = ['get', uuid];

  var user = spawn(userCmd, userArgs);
  var stdout = [];
  user.stdout.on('data', function _handleStdout(chunk) {
    stdout.push(chunk);
  });

  user.on('close', function _handleClose() {
    return cb(null, JSON.parse(stdout.join('')));
  });
}

module.exports = {
  getJobs: getJobs,
  getDataCenterName: getDataCenterName,
  getUser: getUser
};
