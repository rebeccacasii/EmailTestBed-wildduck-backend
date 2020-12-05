'use strict';

const Joi = require('joi');
const ObjectID = require('mongodb').ObjectID;
const tools = require('../../tools');
const roles = require('../../roles');
const { sessSchema, sessIPSchema, booleanSchema } = require('../../schemas');

module.exports = (db, server) => {
    server.put(
        '/a/person',
        tools.asyncifyJson(async (req, res, next) => {
            res.charSet('utf-8');
            const schema = Joi.object().keys({
                suspiciousFlag: Joi.boolean().required(),
                title: Joi.string().min(2).max(50).trim().required(),
                firstName: Joi.string().min(2).max(50).trim().required(),
                lastName: Joi.string().min(2).max(50).trim().required(),
                gender: Joi.string().min(1).max(20).trim().required(),
                email: Joi.string().email().min(3).max(50).trim().required(),
                salutation: Joi.string().max(100).trim(),
                signature: Joi.string().max(100).trim()
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

            const query = {email: result.value.email}
            const update = result.value
            const r = await db.users.collection('etb-person').updateOne(query, {$set: update}, { upsert: true });
            res.json({
                success: true
            });

            return next();
        })
    );

    server.get(
        '/a/person',
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

            let entry = await db.users.collection('etb-person').find();
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
