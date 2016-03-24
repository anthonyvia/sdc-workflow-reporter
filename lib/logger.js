'use strict';

var bunyan = require('bunyan');

var logger = bunyan.createLogger({
  name: 'sdc-workflow-reporter',
  streams: [
    {
      level: 'info',
      stream: process.stdout
    },
    {
      level: 'error',
      stream: process.stdout
    }
  ]
});

logger.log = logger.info;

module.exports = logger;
