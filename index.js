let transcribeServiceApi = require('./transcribeServiceApi.js');
let s3Api = require('./s3Api.js');
const fetch = require("node-fetch");

const Bucket = process.env['BUCKET'];

exports.handler = async (event) => {
    console.log(`REQUEST: ${JSON.stringify(event)}`);
    if (!Bucket) {
        throw 'Missing BUCKET env var';
    }

    let {detail: {TranscriptionJobName}} = event;
    console.log(`Transcription job name: ${TranscriptionJobName}`);

    let [apiKeyId, pid] = TranscriptionJobName.split('_-_');
    if (!apiKeyId || !pid) {
        throw `Invalid TranscriptionJobName: ${TranscriptionJobName}`;
    }
    console.log(`api key id: ${apiKeyId}`);
    console.log(`pid: ${pid}`);

    let {TranscriptionJob: {Transcript: {TranscriptFileUri}}} = await transcribeServiceApi.getTranscriptionJob({TranscriptionJobName});
    console.log(`Fetch transcription file: ${TranscriptFileUri}`);
    let Body = await fetch(TranscriptFileUri).then(response => response.text());
    let Key = `raw-transcription/${apiKeyId}/${pid}.json`;
    console.log(`Upload transcriptions file to s3 bucket: ${Bucket}/${Key}`);

    return s3Api.putObject({
        Bucket,
        Key,
        Body,
        Metadata: {
            "api-key-id": apiKeyId,
            pid,
            "transcribe-provider": 'aws'
        }
    });
};