import {describe, expect, it, beforeEach} from '@jest/globals';
import nock, {Scope} from "nock";
import {ExternalWorkerClient, WorkerResultBuilder} from "./external-worker-client";
import acquireJobResponse from "./fixtures/acquire-job-response.json";
import completeJobRequest from "./fixtures/complete-job-request.json";
import bpmnErrorJobRequest from "./fixtures/bpmn-error-job-request.json";
import cmmnTerminateJobRequest from "./fixtures/cmmn-terminate-job-request.json";
import {ExternalWorkerAcquireJobResponse} from "./external-worker-acquire-job-response";

describe('ExternalWorkerClient', () => {

    const flowableHost = 'http://localhost:8090';
    const workerId = "test-worker";
    const externalWorkerClient = new ExternalWorkerClient({
        flowableHost,
        workerId: workerId,
        auth: {
            username: "admin",
            password: "test"
        }
    });

    let nockInstance = null;

    beforeEach(() => {
        nockInstance = nock(flowableHost, {
            reqheaders: {
                authorization: 'Basic YWRtaW46dGVzdA=='
            }
        });
    });

    describe('subscribe to one topic, consume a message ', () => {

        it('and complete job', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/complete`, {
                    variables: null,
                    workerId: "test-worker"
                })
                .reply(204);

            let job: ExternalWorkerAcquireJobResponse = undefined;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder?: WorkerResultBuilder) {
                    job = acquiredJob;
                    return workResultBuilder.success();
                },
                waitPeriodSeconds: 0.2
            });
            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });


        it('and complete job with promise', async () => {
            const scope = nockInstance
              .post(`/external-job-api/acquire/jobs`, {
                  topic: "myTopic",
                  lockDuration: "PT1M",
                  numberOfTasks: 1,
                  numberOfRetries: 5,
                  workerId: "test-worker",
                  scopeType: null
              })
              .reply(200, acquireJobResponse)
              .post(`/external-job-api/acquire/jobs`, {
                  topic: "myTopic",
                  lockDuration: "PT1M",
                  numberOfTasks: 1,
                  numberOfRetries: 5,
                  workerId: "test-worker",
                  scopeType: null
              })
              .reply(200, [])
              .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/complete`, {
                  variables: null,
                  workerId: "test-worker"
              })
              .reply(204);

            let job: ExternalWorkerAcquireJobResponse = undefined;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
                    job = acquiredJob;
                    return Promise.resolve(workResultBuilder.success());
                },
                waitPeriodSeconds: 0.2
            });
            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });

        it('and complete job with variables', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/complete`, completeJobRequest)
                .reply(204);

            let job: ExternalWorkerAcquireJobResponse = undefined;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
                    job = acquiredJob;
                    return workResultBuilder.success()
                        .variable('testVar', 'test content', 'string')
                        .variable('testVar2', 12, 'integer');
                },
                waitPeriodSeconds: 0.2
            });

            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });

        it('and fail job', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/fail`, {
                    workerId: "test-worker",
                    errorMessage: "Some error message"
                })
                .reply(204);

            let job: ExternalWorkerAcquireJobResponse = undefined;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
                    job = acquiredJob;
                    return workResultBuilder.failure().errorMessage("Some error message");
                },
                waitPeriodSeconds: 0.2
            });

            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });

        it('and fail job with promise', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/fail`, {
                    workerId: "test-worker",
                    errorMessage: "Some error message"
                })
                .reply(204);

            let job: ExternalWorkerAcquireJobResponse = undefined;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
                    job = acquiredJob;
                    return Promise.reject("Some error message");
                },
                waitPeriodSeconds: 0.2
            });

            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });

        it('and bpmn error job', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/bpmnError`, bpmnErrorJobRequest)
                .reply(200, acquireJobResponse);

            let job: ExternalWorkerAcquireJobResponse = undefined;

            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
                    job = acquiredJob;
                    return workResultBuilder.bpmnError()
                        .errorCode('errorCode1')
                        .variable('testVar', 'test failure', 'string');
                },
                waitPeriodSeconds: 0.2
            });

            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });

        it('and cmmn terminate job', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/cmmnTerminate`, cmmnTerminateJobRequest)
                .reply(204);

            let job: ExternalWorkerAcquireJobResponse = null;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
                    job = acquiredJob;
                    return workResultBuilder.cmmnTerminate()
                        .variable('testVar', 'test terminate', 'string');
                },
                waitPeriodSeconds: 0.2
            });

            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });

    });

    describe('with multiple requests', () => {
        it('completing both jobs', async () => {
            const scope = nockInstance
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .times(10)
                .reply(200, acquireJobResponse)
                .post(`/external-job-api/acquire/jobs`, {
                    topic: "myTopic",
                    lockDuration: "PT1M",
                    numberOfTasks: 1,
                    numberOfRetries: 5,
                    workerId: "test-worker",
                    scopeType: null
                })
                .reply(200, [])
                .post(`/external-job-api/acquire/jobs/${acquireJobResponse[0].id}/complete`, {
                    variables: null,
                    workerId: "test-worker"
                })
                .times(10)
                .reply(204);

            let job: ExternalWorkerAcquireJobResponse = null;
            let counter = 0;
            const subscription = externalWorkerClient.subscribe({
                topic: 'myTopic',
                callbackHandler(acquiredJob: ExternalWorkerAcquireJobResponse) {
                    counter++;
                    if (counter == 10) {
                        job = acquiredJob;
                    }
                },
                waitPeriodSeconds: 0.2
            });

            const done = await waitForRequestsToComplete(scope);
            expect(done).toBeTruthy();

            subscription.unsubscribe();
            scope.done();
            expect(job).toBeDefined();
        });
    });

});


const waitForRequestsToComplete = (scope: Scope, timeout: number = 5000, waitPeriod: number = 50) =>
    new Promise<boolean>((resolve) => {
        let counter = 0;
        const checkIsDone = () => {
            if (scope.isDone()) {
                resolve(true);
            } else if (counter > timeout / waitPeriod) {
                resolve(false);
            } else {
                counter++;
                setTimeout(checkIsDone, 100);
            }
        }
        checkIsDone();
    });
