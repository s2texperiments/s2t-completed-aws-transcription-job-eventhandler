const AWS = require('aws-sdk');
const transcribeService = new AWS.TranscribeService();

module.exports = {
    getTranscriptionJob: async (params) =>
        new Promise((resolve, rejected) =>
            transcribeService.getTranscriptionJob(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};