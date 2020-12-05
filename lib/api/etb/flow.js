'use strict';

const Joi = require('joi');
const ObjectID = require('mongodb').ObjectID;
const tools = require('../../tools');
const roles = require('../../roles');
const { sessSchema, sessIPSchema, booleanSchema } = require('../../schemas');
const handlebars = require('handlebars');
const emailer = require('./service/pushMessage');

module.exports = (db, server) => {
    server.put(
        '/a/flow/start',
        tools.asyncifyJson(async (req, res, next) => {
            res.charSet('utf-8');
            const schema = Joi.object().keys({
                userId: Joi.string().trim().required(),
                sess: sessSchema,
                ip: sessIPSchema
            });

            const result = schema.validate(req.params, {
                abortEarly: false,
                convert: true,
                allowUnknown: true
            });

            if (result.error) {
                res.status(400);
                res.json({
                    error: result.error.message,
                    code: 'InputValidationError',
                    details: tools.validationErrors(result)
                });
                return next();
            }

            let userId = new ObjectID(result.value.userId);

            const user = await db.users.collection('users').findOne({ _id: userId })
            // console.info('user', user)
            const script = await db.users.collection('etb-script').findOne({ email: user.address });
            // console.info('script', script)
            const company = await db.users.collection('etb-company').findOne();
            // console.info('company', company)
            let scriptResponse = {
                'userId': userId,
                'email': user.address,
                'steps': []
            }

            var steps = []
            if (script && script.steps) {
                steps = await script.steps.map(async (step) => {
                    // console.info('step', step)
                    let person = await db.users.collection('etb-person').findOne({ _id: new ObjectID(step.personId) });
                    // console.info('person', person)

                    let message = await db.users.collection('etb-message').findOne({ _id: new ObjectID(step.messageId) });
                    let vars = replaceVars(person, message, company, step.formType)
                    // console.info('vars', vars)
                    let fromFullName = `${person.firstName} ${person.lastName}`
                    let stepsResp = {
                        'messageId': step.messageId,
                        'to': {
                            'username': user.username,
                            'email': user.address
                        },
                        'from': {
                            'fullName': fromFullName,
                            'email': vars.mailFrom,
                            'personIdRef': step.personId
                        },
                        'message': {
                            'subject': vars.subject,
                            'body': vars.body,
                            'messageIdRef': step.messageId
                        }
                    }
                    return stepsResp
                })
            }
            Promise.all(steps).then(async (completed) => {
                scriptResponse.steps = completed
                await db.users.collection('etb-script-resp').insertOne(scriptResponse)

                if (scriptResponse.steps.length > 0) {
                    let step = scriptResponse.steps[0]
                    emailer.send(step.to.email, step.from.email, step.from.fullName, step.message.subject, step.message.body, step.messageId, (err, info) => {
                        if (err && err.response) {
                            console.log('Message failed: %s', err.response);
                        } else if (err) {
                            console.log(err);
                        } else {
                            console.log(info);
                            res.json({
                                sess: sessSchema,
                                ip: sessIPSchema,
                                success: true
                            });
                        }
                    })
                }
            });

            return next();
        })
    );
    server.put(
        '/a/flow/response',
        tools.asyncifyJson(async (req, res, next) => {
            try {
                res.charSet('utf-8');

                const schema = Joi.object().keys({
                    response: Joi.string().required().allow('reply', 'report'),
                    uid: Joi.number().required(),
                    userId: Joi.string().required()
                });

                const result = schema.validate(req.params, {
                    abortEarly: false,
                    convert: true
                });

                if (result.error) {
                    res.status(400);
                    res.json({
                        error: result.error.message,
                        code: 'InputValidationError',
                        details: tools.validationErrors(result)
                    });
                    return next();
                }

                const userId = new ObjectID(result.value.userId);
                let uid = result.value.uid
                const response = result.value.response

                db.users.collection('users').findOne({ _id: userId }, (errUsers, user) => {
                    if (errUsers) {
                        throw errUsers
                    }
                    // console.log("###################################### user", user)
                    db.users.collection('messages').findOne({ 'uid': uid }, (errMsgs, msg) => {
                        if (errMsgs) {
                            throw errMsgs
                        }
                        // console.log("###################################### msg", msg)
                        if (msg) {
                            let msgId = msg.msgid
                            if (msgId) {
                                msgId = msgId.replace(/\W/g, '')
                            }
                            db.users
                                .collection('etb-script-resp')
                                .find({ 'email': user.address })
                                .sort({ _id: -1 })
                                .limit(1)
                                .toArray((err, result) => {
                                    if (err) {
                                        throw err
                                    }
                                    let msgResp = result[0]
                                    let currStep = msgResp.steps
                                        .filter(m => m.messageId === msgId)
                                        .find(m => !m.response)

                                    console.log("###################################### currStep", currStep)

                                    if (currStep) {
                                        currStep.response = response
                                        db.users.collection('etb-script-resp').updateOne({ _id: msgResp._id }, { $set: msgResp }, (err, result) => {
                                            if (err) {
                                                throw err;
                                            }
                                        })
                                    }

                                    console.log("###################################### msgResp", msgResp)
                                    if (msgResp && msgResp.steps) {
                                        let nextStep = msgResp.steps.find(m => !m.response)
                                        console.log("###################################### nextStep", nextStep)
                                        if (nextStep) {
                                            emailer.send(nextStep.to.email, nextStep.from.email, nextStep.from.fullName, nextStep.message.subject, nextStep.message.body, nextStep.messageId, (err, info) => {
                                                if (err && err.response) {
                                                    console.log('Message failed: %s', err.response);
                                                    res.json({
                                                        success: false
                                                    });
                                                } else if (err) {
                                                    console.log(err);
                                                    res.json({
                                                        success: false
                                                    });
                                                } else {
                                                    // console.log(info);
                                                    res.json({
                                                        sess: sessSchema,
                                                        ip: sessIPSchema,
                                                        success: true
                                                    });
                                                }
                                            })
                                        } else {
                                            res.json({
                                                sess: sessSchema,
                                                ip: sessIPSchema,
                                                success: true,
                                                msg: 'All steps executed'
                                            });
                                        }
                                    }                                    
                                })

                        }
                    })
                })
            } catch (ex) {
                console.error(ex)
                throw ex
            }

            return next();
        })
    );

    server.get(
        '/a/flow',
        tools.asyncifyJson(async (req, res, next) => {
            res.charSet('utf-8');

            const schema = Joi.object().keys({
                sess: sessSchema,
                ip: sessIPSchema
            });

            const result = schema.validate(req.params, {
                abortEarly: false,
                convert: true
            });

            if (result.error) {
                res.status(400);
                res.json({
                    error: result.error.message,
                    code: 'InputValidationError',
                    details: tools.validationErrors(result)
                });
                return next();
            }

            let entry = await db.users.collection('etb-script').find();
            entry = entry || {};
            entry.toArray((err, results) => {
                res.json({
                    success: true,
                    content: results
                });
            })

            return next();
        })
    );

};

const replaceVars = (person, message, company, formTypeInt) => {
    let vars = {}
    vars.firstName = person.firstName
    vars.lastName = person.lastName
    vars.hisher = (person.gender) == 'MALE' ? 'his' : 'her'
    vars.companyName = company.companyName
    vars.companyDomain = company.companyDomain
    vars.jobTitle = company.jobTitle
    switch (formTypeInt) {
        case 1:
            vars.formType = company.form1Type
            break
        case 2:
            vars.formType = company.form2Type
            break
        case 3:
            vars.formType = company.form3Type
            break
    }
    vars.fileExt = (message.suspiciousFlag) ? 'exe' : 'pdf'

    let body = handlebars.compile(message.body)
    let subject = handlebars.compile(message.subject)
    let mailFrom = (person.email && person.email.length > 0) ? person.email : `${person.firstName}.${person.lastName}@${company.companyDomain}`
    mailFrom = mailFrom.replace(/ /g, '').toLowerCase()
    return {
        subject: subject(vars),
        body: body(vars),
        mailFrom: mailFrom
    }
}
