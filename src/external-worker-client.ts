import {Axios, AxiosBasicCredentials} from "axios";
import {
    AuthBearerTokenCredentials,
    BpmnErrorJobParams,
    CmmnTerminateJobParams,
    CompleteJobParams,
    FailJobParams,
    FlowableExternalWorkerRestClient
} from "./rest-client";
import {ExternalWorkerAcquireJobResponse} from "./external-worker-acquire-job-response";

export class ExternalWorkerClient {

    private _restClient: FlowableExternalWorkerRestClient;

    constructor(params: ExternalWorkerClientParams) {
        const restClientParams = {
            ...params,
            flowableHost: params.flowableHost || 'https://cloud.flowable.com/work/',
            workerId: params.workerId || 'js-worker-' + Math.random().toString(26).slice(2)
        }
        this._restClient = new FlowableExternalWorkerRestClient(restClientParams);
    }

    public subscribe(params: ExternalWorkerSubscriptionParams): ExternalWorkerSubscription {
        const timeoutInformation = new TimeoutInformation((params.waitPeriodSeconds || 30) * 1000);
        // don't use timeout for immediate consumption of first messages
        timeoutInformation.timeout = setTimeout(() => this.consume(params, timeoutInformation), 0);
        return new ExternalWorkerSubscription(timeoutInformation);
    }

    private async consume(params: ExternalWorkerSubscriptionParams, timeoutInformation: TimeoutInformation): Promise<void> {
        timeoutInformation.timeout = null;
        let jobs: ExternalWorkerAcquireJobResponse[] = [];
        do {
            jobs = await this._restClient.acquireJob({
                topic: params.topic,
                numberOfTasks: params.numberOfTasks,
                numberOfRetries: params.numberOfRetries,
                lockDuration: params.lockDuration || 'PT1M',
                scopeType: params.scopeType
            });
            for (const job of jobs) {
                const jobId = job.id;
                try {
                    const workResult = params.callbackHandler(job, new WorkerResultBuilder(job));
                    if (!workResult) {
                        await this._restClient.completeJob({jobId});
                    } else {
                        await workResult.execute(this._restClient);
                    }
                } catch (e) {
                    console.error('Failed to execute job with exception', e);
                    await this._restClient.failJob({jobId, errorDetails: JSON.stringify(e)});
                }
            }
            if (timeoutInformation.unsubscribed) {
                return;
            }
        } while (jobs.length > 0);
        timeoutInformation.timeout = setTimeout(() => this.consume(params, timeoutInformation), timeoutInformation.waitMs);
    }
}

class TimeoutInformation {
    public unsubscribed: boolean = false;
    public timeout: NodeJS.Timeout = null;

    constructor(public waitMs: number) {
    }
}

export class ExternalWorkerSubscription {

    constructor(private timeoutInformation: TimeoutInformation) {
    }

    public unsubscribe() {
        this.timeoutInformation.unsubscribed = true;
        if (this.timeoutInformation.timeout) {
            clearTimeout(this.timeoutInformation.timeout);
        }
    }
}

export class WorkerResultBuilder {

    constructor(private job: ExternalWorkerAcquireJobResponse) {
    }

    success(): WorkerResultSuccess {
        return new WorkerResultSuccess(this.job);
    }

    failure(): WorkerResultFailure {
        return new WorkerResultFailure(this.job);
    }

    bpmnError(): WorkerResultBpmnError {
        return new WorkerResultBpmnError(this.job);
    }

    cmmnTerminate(): WorkerResultCmmnTerminate {
        return new WorkerResultCmmnTerminate(this.job);
    }
}

export class WorkerResultSuccess implements WorkResult {
    private completeJobParams: CompleteJobParams;

    constructor(job: ExternalWorkerAcquireJobResponse) {
        this.completeJobParams = {jobId: job.id, variables: null};
    }

    public variable(name: string, value: string, type: string): WorkerResultSuccess {
        this.completeJobParams.variables = this.completeJobParams.variables || [];
        this.completeJobParams.variables.push({name, value, type, valueUrl: null});
        return this;
    }

    execute(restClient: FlowableExternalWorkerRestClient): Promise<void> {
        return restClient.completeJob({...this.completeJobParams});
    }

}

export class WorkerResultFailure implements WorkResult {
    private failJobParams: FailJobParams;

    constructor(job: ExternalWorkerAcquireJobResponse) {
        this.failJobParams = {jobId: job.id};
    }

    errorMessage(errorMessage?: string): WorkerResultFailure {
        this.failJobParams.errorMessage = errorMessage;
        return this;
    }

    errorDetails(errorDetails?: string): WorkerResultFailure {
        this.failJobParams.errorDetails = errorDetails;
        return this;
    }

    retries(retries?: number): WorkerResultFailure {
        this.failJobParams.retries = retries;
        return this;
    }

    retryTimeout(retryTimeout?: string): WorkerResultFailure {
        this.failJobParams.retryTimeout = retryTimeout;
        return this;
    }

    execute(restClient: FlowableExternalWorkerRestClient): Promise<void> {
        return restClient.failJob(this.failJobParams);
    }

}

export class WorkerResultBpmnError implements WorkResult {
    private bpmnErrorParams: BpmnErrorJobParams;

    constructor(job: ExternalWorkerAcquireJobResponse) {
        this.bpmnErrorParams = {jobId: job.id};
    }

    public variable(name: string, value: string, type: string): WorkerResultBpmnError {
        this.bpmnErrorParams.variables = this.bpmnErrorParams.variables || [];
        this.bpmnErrorParams.variables.push({name, value, type, valueUrl: null});
        return this;
    }

    public errorCode(errorCode: string): WorkerResultBpmnError {
        this.bpmnErrorParams.errorCode = errorCode;
        return this;
    }

    execute(restClient: FlowableExternalWorkerRestClient): Promise<void> {
        return restClient.jobWithBpmnError(this.bpmnErrorParams);
    }
}

export class WorkerResultCmmnTerminate implements WorkResult {
    private cmmnTerminateParams: CmmnTerminateJobParams;

    constructor(job: ExternalWorkerAcquireJobResponse) {
        this.cmmnTerminateParams = {jobId: job.id};
    }

    public variable(name: string, value: string, type: string): WorkerResultCmmnTerminate {
        this.cmmnTerminateParams.variables = this.cmmnTerminateParams.variables || [];
        this.cmmnTerminateParams.variables.push({name, value, type, valueUrl: null});
        return this;
    }

    execute(restClient: FlowableExternalWorkerRestClient): Promise<void> {
        return restClient.jobWithCmmnTerminate(this.cmmnTerminateParams);
    }
}

export interface WorkResult {
    execute(restClient: FlowableExternalWorkerRestClient): Promise<void>;
}

export type ExternalWorkerClientParams = {
    flowableHost?: string;
    workerId?: string;
    auth?: AxiosBasicCredentials | AuthBearerTokenCredentials;
    customizeAxios?: (axios: Axios) => void;
}

export type ExternalWorkerSubscriptionParams = {
    topic: string;
    callbackHandler: (acquiredJob: ExternalWorkerAcquireJobResponse, workResultBuilder?: WorkerResultBuilder) => WorkResult | void,
    lockDuration?: string;
    numberOfRetries?: number;
    numberOfTasks?: number;
    scopeType?: string;
    waitPeriodSeconds?: number;
}
