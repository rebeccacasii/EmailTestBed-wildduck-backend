'use strict';

const Joi = require('joi');
const ObjectID = require('mongodb').ObjectID;
const tools = require('../../tools');
const roles = require('../../roles');
const { sessSchema, sessIPSchema, booleanSchema } = require('../../schemas');

module.exports = (db, server) => {
    server.put(
        '/a/company',
        tools.asyncifyJson(async (req, res, next) => {
            res.charSet('utf-8');

            const schema = Joi.object().keys({
                companyName: Joi.string().min(3).max(50).trim().required(),
                companyDomain: Joi.string().min(3).max(50).trim().required(),
                jobTitle: Joi.string().min(3).max(50).trim().required(),
                form1Type: Joi.string().min(3).max(50).trim().required(),
                form2Type: Joi.string().min(3).max(50).trim().required(),
                form3Type: Joi.string().min(3).max(50).trim().required(),
                fileExtNormal: Joi.string().length(3).trim().required(),
                fileExtAttack: Joi.string().length(3).trim().required(),
                fileName: Joi.string().min(3).max(50).trim().required(),
                reportBtLabel: Joi.string().min(1).max(50).trim().required(),
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

            const query = {companyName: result.value.companyName}
            const update = result.value
            const r = await db.users.collection('etb-company').updateOne(query, {$set: update}, { upsert: true });
            res.json({
                success: true
            });

            return next();
        })
    );

    server.get(
        '/a/company',
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

            let entry = await db.users.collection('etb-company').find();
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

    // server.del(
    //     '/users/:user/autoreply',
    //     tools.asyncifyJson(async (req, res, next) => {
    //         res.charSet('utf-8');

    //         const schema = Joi.object().keys({
    //             user: Joi.string().hex().lowercase().length(24).required(),
    //             sess: sessSchema,
    //             ip: sessIPSchema
    //         });

    //         const result = schema.validate(req.params, {
    //             abortEarly: false,
    //             convert: true
    //         });

    //         if (result.error) {
    //             res.status(400);
    //             res.json({
    //                 error: result.error.message,
    //                 code: 'InputValidationError',
    //                 details: tools.validationErrors(result)
    //             });
    //             return next();
    //         }

    //         // permissions check
    //         if (req.user && req.user === result.value.user) {
    //             req.validate(roles.can(req.role).deleteOwn('autoreplies'));
    //         } else {
    //             req.validate(roles.can(req.role).deleteAny('autoreplies'));
    //         }

    //         let user = new ObjectID(result.value.user);

    //         await db.users.collection('users').updateOne({ _id: user }, { $set: { autoreply: false } });
    //         await db.database.collection('autoreplies').deleteOne({ user });

    //         res.json({
    //             success: true
    //         });

    //         return next();
    //     })
    // );
};
