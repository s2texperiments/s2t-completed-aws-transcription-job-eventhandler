const AWS = require('aws-sdk');
const sns = new AWS.SNS();

module.exports = {
    publish: async (params) =>
        new Promise((resolve, rejected) =>
            sns.publish(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};