let transcribeServiceApi = require('./transcribeServiceApi.js');
let snsApi = require('./snsApi.js');

const TOPIC_ARN = process.env['TOPIC_ARN'];

exports.handler = async (event) => {
    if (!TOPIC_ARN) {
        throw 'Missing TOPIC_ARN env var';
    }
    console.log(`Topic arn: ${TOPIC_ARN}`);
    let {detail: {TranscriptionJobName}} = event;
    console.log(`Transcription job name: ${TranscriptionJobName}`);

    [apiKeyId, pid] = TranscriptionJobName.split('_-_');
    if (!apiKeyId || !pid) {
        throw `Invalid TranscriptionJobName: ${TranscriptionJobName}`;
    }
    console.log(`api key id: ${apiKeyId}`);
    console.log(`pid: ${pid}`);

    let {
        TranscriptionJob: {
            Transcript: {
                TranscriptFileUri
            }
        }
    } = await transcribeServiceApi.getTranscriptionJob({TranscriptionJobName});

    console.log(`Transcription file uri: ${TranscriptFileUri}`);

    snsApi.publish({
        Message: {TranscriptFileUri},
        MessageAttributes: {
            "api-key-id": {
                DataType: 'String',
                StringValue: apiKeyId
            },
            pid: {
                DataType: 'String',
                StringValue: pid
            },
            "transcribe-provider": {
                DataType: 'String',
                StringValue: "aws"
            }
        },
        TopicArn: TOPIC_ARN
    });
};