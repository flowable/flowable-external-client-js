import {describe, expect, it} from '@jest/globals';
import {FlowableExternalWorkerRestClient} from './rest-client';
import nock from "nock";
import jobOneItem from "./fixtures/jobs-one-item.json";
import acquireJobRequest from "./fixtures/acquire-job-request.json";
import acquireJobResponse from "./fixtures/acquire-job-response.json";
import completeJobRequest from "./fixtures/complete-job-request.json";
import {AxiosError} from "axios";
import {EngineRestVariable} from "./engine-rest-variable";

describe('FlowableExternalWorkerRestClient', () => {

    const flowableHost = 'http://localhost:8090';
    const workerId = "test-worker";
    const restClient = new FlowableExternalWorkerRestClient({
        flowableHost,
        workerId: workerId,
        auth: {
            username: "admin",
            password: "test"
        }
    });

    const nockInstance = nock(flowableHost, {
        reqheaders: {
            authorization: 'Basic YWRtaW46dGVzdA=='
        }
    });


    it('with customizing axios', async () => {
        expect.assertions(3);

        new FlowableExternalWorkerRestClient({
            flowableHost,
            workerId: workerId,
            customizeAxios: axios => {
                expect(axios).toBeDefined();
                expect(axios.get).toBeDefined();
                expect(axios.post).toBeDefined();
            }
        });
    });

    describe('listJobs', () => {

        it('with invalid authentication', async () => {
            expect.assertions(1);

            const scope = nockInstance
                .get('/external-job-api/jobs')
                .reply(401);

            await restClient.listJobs()
                .catch((error: AxiosError) => {
                    expect(error.code).toEqual('ERR_BAD_REQUEST');

                })

            scope.done();
        });


        it('returns the right amount of total jobs', async () => {
            const scope = nockInstance
                .get('/external-job-api/jobs')
                .reply(200, jobOneItem);

            const jobResponse = await restClient.listJobs();

            scope.done();
            expect(jobResponse.total).toEqual(1);
        });


    });


    it('getJob', async () => {
        const jobId = 'JOB-3728f5a5-360d-11ee-8300-0242c0a8d006';
        const scope = nockInstance
            .get(`/external-job-api/jobs/${jobId}`)
            .reply(200, jobOneItem.data[0]);

        let jobResponse = await restClient.getJob(jobId);

        scope.done();
        expect(jobResponse).toBeDefined();
        expect(jobResponse.id).toEqual(jobId);
        expect(jobResponse.correlationId).toEqual('3728f5a4-360d-11ee-8300-0242c0a8d006');
    });

    describe('acquireJob', () => {
        it('with default params', async () => {
            const jobId = 'JOB-36ebec96-360d-11ee-8300-0242c0a8d006';
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, acquireJobRequest)
                .reply(200, acquireJobResponse)

            const jobResponse = await restClient.acquireJob({topic: 'myTopic', lockDuration: 'PT10S'});

            scope.done();
            expect(jobResponse).toHaveLength(1);
            const firstJob = jobResponse[0];
            expect(firstJob.id).toEqual(jobId);
            expect(firstJob.variables).toEqual([
                {
                    "name": "initiator",
                    "type": "string",
                    "value": "admin"
                }
            ]);
        });

        it('with custom params', async () => {
            const jobId = 'JOB-36ebec96-360d-11ee-8300-0242c0a8d006';
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                        topic: "myTopic",
                        lockDuration: "PT10S",
                        numberOfTasks: 2,
                        numberOfRetries: 3,
                        workerId: "another-worker",
                        scopeType: "bpmn"
                    }
                )
                .reply(200, acquireJobResponse)

            const jobResponse = await restClient.acquireJob({
                topic: 'myTopic',
                lockDuration: 'PT10S',
                numberOfTasks: 2,
                numberOfRetries: 3,
                scopeType: 'bpmn',
                workerId: 'another-worker'
            });

            scope.done();
            expect(jobResponse).toHaveLength(1);
            const firstJob = jobResponse[0];
            expect(firstJob.id).toEqual(jobId);
            expect(firstJob.variables).toEqual([
                {
                    "name": "initiator",
                    "type": "string",
                    "value": "admin"
                }
            ]);
        });

        describe('complete job', () => {

            it('with job id', async () => {
                const jobId = 'JOB-0d5e6cce-368b-11ee-a638-0242c0a8f005';
                const scope = nockInstance
                    .post(
                        `/external-job-api/acquire/jobs/${jobId}/complete`,
                        completeJobRequest
                    )
                    .reply(204);

                const variables: EngineRestVariable[] = [
                    {
                        name: 'testVar',
                        type: 'string',
                        value: 'test content',
                        valueUrl: null
                    }
                ];

                await restClient.completeJob({jobId, variables});

                scope.done();
            });

            it('with error 500', async () => {
                expect.assertions(2);

                const jobId = 'JOB-0d5e6cce-368b-11ee-a638-0242c0a8f005';
                const scope = nockInstance
                    .post(
                        `/external-job-api/acquire/jobs/${jobId}/complete`,
                        {
                            workerId: 'test-worker',
                            variables: null
                        }
                    )
                    .reply(500);

                await restClient.completeJob({jobId})
                    .catch((error: AxiosError) => {
                        expect(error.code).toEqual('ERR_BAD_RESPONSE');
                        expect(error.message).toEqual('Request failed with status code 500');
                    });

                scope.done();
            });

        });

    });
});
