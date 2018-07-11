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
        snsPublishFake;

    let underTest;

    beforeEach(() => {
        dotEnv.config({path: "test/.env"});

        getTranscriptionJobFake = fake.resolves(getGivenResponse("givenTranscriptionJobStatusResponse.json"));
        snsPublishFake = fake.resolves("success");

        underTest = proxyquire('../index.js', {
            "./transcribeServiceApi": {
                getTranscriptionJob: getTranscriptionJobFake
            },
            './snsApi': {
                publish: snsPublishFake
            }
        });

        givenCloudWatchEvent = getEventData('givenCloudWatchEvent.json');

    });
    describe('happy cases', async () => {
        it('cloudwatch event: valid -> getTranscriptionJob: valid -> redirect with sns', async () => {
            await underTest.handler(givenCloudWatchEvent);

            let [getTranscriptionJobParam] = getTranscriptionJobFake.firstCall.args;
            expect(getTranscriptionJobParam).to.deep.equal({
                "TranscriptionJobName": "given_api_key_id_-_given_pid"
            });

            let [snsPublishParam] = snsPublishFake.firstCall.args;
            expect(snsPublishParam).to.have.all.keys('TopicArn', 'Message', 'MessageAttributes');
            expectSNSTopicArn(snsPublishParam);
            expectSNSMessage(snsPublishParam);

            let messageAttributes = snsPublishParam.MessageAttributes;
            expect(messageAttributes).to.have.all.keys('api-key-id', 'pid', 'transcribe-provider');
            expectStringMessageAttribute(messageAttributes['api-key-id'], 'given_api_key_id');
            expectStringMessageAttribute(messageAttributes.pid, 'given_pid');
            expectStringMessageAttribute(messageAttributes['transcribe-provider'], 'aws');
        });


        function expectSNSTopicArn(param, {expectedArn = 'given:arn:from:env'} = {}) {
            expect(param.TopicArn).to.equal(expectedArn);
        }

        function expectSNSMessage(param, {expectedMessage = {TranscriptFileUri: "https://s3-eu-west-1.amazonaws.com/aws_internal_bucket/transcription.json"}} = {}) {
            expect(param.Message).to.deep.equal(expectedMessage);
        }

        function expectStringMessageAttribute(messageAttribute, value) {
            expect(messageAttribute).to.include({
                DataType: 'String',
                StringValue: value
            });
        }
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
