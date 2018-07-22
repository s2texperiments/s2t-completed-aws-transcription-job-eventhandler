const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports = {
    putObject: async (params) =>
        new Promise((resolve, rejected) =>
            s3.putObject(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};