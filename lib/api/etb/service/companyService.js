'use strict';

const ObjectID = require('mongodb').ObjectID;
const tools = require('../../../tools');
const { sessSchema, sessIPSchema, booleanSchema } = require('../../../schemas');

module.exports.loadCompany = (db) => {
    console.info('loadCompany', db)
}