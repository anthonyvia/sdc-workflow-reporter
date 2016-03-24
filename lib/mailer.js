'use strict';

var nodemailer = require('nodemailer');

function Mailer(options) {
  this._host    = options.host;
  this._from    = options.from;
  this._to      = options.to;
  this._subject = options.subject;

  var smtpOptions = {
    host: this._host,
    port: 25
  };
  this._transporter = nodemailer.createTransport(smtpOptions);
}

Mailer.prototype.sendMail = function sendMail(report) {
  var self = this;
  var mailOptions = {
    from: this._from,
    to: this._to,
    subject: this._subject,
    html: report
  };

  this._transporter.sendMail(mailOptions, function _handleSendMailAttempt(err, info) { });
};

module.exports = Mailer;
