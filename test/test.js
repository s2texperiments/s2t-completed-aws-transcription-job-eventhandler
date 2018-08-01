const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const fake = require('sinon').fake;
const fs = require('fs');
const dotEnv = require('dotenv');

describe('eventhandler', () => {

    let givenCloudWatchEvent;

    let getTranscriptionJobFake,
        nodeFetchFake,
        s3PutObjectFake;

    let underTest;

    beforeEach(() => {

        dotEnv.config({path: "test/.env"});

        getTranscriptionJobFake = fake.resolves(getGivenResponse("givenTranscriptionJobStatusResponse.json"));
        nodeFetchFake = fake.resolves({text: () => getGivenFetchTextResponse('givenTranscriptFile.json')});
        s3PutObjectFake = fake.resolves("success");

        underTest = proxyquire('../index.js', {
            "./transcribeServiceApi": {
                getTranscriptionJob: getTranscriptionJobFake
            },
            'node-fetch': nodeFetchFake,
            './s3Api': {
                putObject: s3PutObjectFake
            }
        });

        givenCloudWatchEvent = getEventData('givenCloudWatchEvent.json');

    });
    describe('happy cases', async () => {
        it('cloudwatch event: valid -> getTranscriptionJob: valid -> fetch: valid -> redirect with sns', async () => {

            await underTest.handler(givenCloudWatchEvent);

            let [getTranscriptionJobParam] = getTranscriptionJobFake.firstCall.args;
            expect(getTranscriptionJobParam).to.deep.equal({
                "TranscriptionJobName": "given_api_key_id_-_given_pid"
            });

            let [fetchUrl] = nodeFetchFake.firstCall.args;
            expect(fetchUrl).is.equal('https://s3-eu-west-1.amazonaws.com/aws_internal_bucket/transcription.json');

            let [s3PutObjectParam] = s3PutObjectFake.firstCall.args;
            expect(s3PutObjectParam).to.have.all.keys('Bucket', 'Key', 'Body', 'Metadata');

            expect(s3PutObjectParam.Bucket).to.equal('given_bucket');
            expect(s3PutObjectParam.Key).to.equal('raw-transcription/given_api_key_id/given_pid.json');
            expect(s3PutObjectParam.Body).to.equal(getGivenFetchTextResponse('givenTranscriptFile.json'));

            let metadata = s3PutObjectParam.Metadata;
            expect(metadata).to.have.all.keys('api-key-id', 'pid', 'transcribe-provider');
            expect(metadata['api-key-id']).to.equal('given_api_key_id');
            expect(metadata.pid).to.equal('given_pid');
            expect(metadata['transcribe-provider']).to.equal('aws');
        });

    });

    describe('failing cases', async () => {
        it('cloudwatch event: valid -> getTranscriptionJob: missing api_key_id or pid in jobname -> rejected', async () => {
            return expect(underTest.handler(getEventData('givenCloudWatchEventWithInvalidTranscriptionJobName.json'))).be.rejected;
        });
    });

});

function getEventData(file) {
    return JSON.parse(fs.readFileSync(`test/${file}`, 'utf8'));
}

function getGivenResponse(file) {
    return JSON.parse(fs.readFileSync(`test/${file}`, 'utf8'));
}

function getGivenFetchTextResponse(file) {
    return fs.readFileSync(`test/${file}`, 'utf8');
}
