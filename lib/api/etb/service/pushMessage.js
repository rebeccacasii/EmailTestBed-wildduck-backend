'use strict';

const config = require('wild-config');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    lmtp: true,
    host: 'localhost',
    port: 2424,
    logger: false,
    debug: false,
    tls: {
        rejectUnauthorized: false
    }
});

let sent = 0;
let startTime = Date.now();

module.exports.send = (recipients, fromEmail, fromFullName, subject, body, msgId, callback) => {
    transporter.sendMail(
        {
            messageId: msgId,
            envelope: {
                from: fromEmail,
                to: recipients
            },

            from: `${fromFullName} <${fromEmail}>`,
            to: recipients,
            subject: subject,
            text: body
        },
        callback
    );
}
// send();
/*
for (let i = 0; i < total; i++) {
    send();
}
*/
