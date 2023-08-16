import {ExternalWorkerJobResponse} from "./external-worker-job-response";
import {ListResult} from "./list-result";
import axios, {Axios, AxiosBasicCredentials} from "axios";
import {ExternalWorkerAcquireJobResponse} from "./external-worker-acquire-job-response";
import {EngineRestVariable} from "./engine-rest-variable";

export class FlowableExternalWorkerRestClient {

    private static JOB_API = '/external-job-api';

    private axios: Axios;
    private flowableHost: string;
    private workerId: string;

    constructor({flowableHost, workerId, auth, customizeAxios}: FlowableExternalWorkerRestClientProps) {
        this.flowableHost = flowableHost;
        this.workerId = workerId;
        this.axios = axios.create();
        if (auth) {
            if ((auth as AxiosBasicCredentials).username) {
                this.axios.defaults.auth = (auth as AxiosBasicCredentials);
            }
            if ((auth as AuthBearerTokenCredentials).token) {
                this.axios.defaults.headers.common.Authorization = `Bearer ${(auth as AuthBearerTokenCredentials).token}`;
            }
        }
        if (customizeAxios) {
            customizeAxios(this.axios);
        }
    }

    public async listJobs(): Promise<ListResult<ExternalWorkerJobResponse>> {
        return this.axios.get<ListResult<ExternalWorkerJobResponse>>(`${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/jobs`)
            .then(response => response.data);
    }

    public async getJob(jobId: string): Promise<ExternalWorkerJobResponse> {
        return this.axios.get<ExternalWorkerJobResponse>(`${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/jobs/${jobId}`)
            .then(response => response.data);
    }

    public async acquireJob(jobParams: AcquireJobParams): Promise<ExternalWorkerAcquireJobResponse[]> {
        return this.axios.post<ExternalWorkerAcquireJobResponse[]>(
            `${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/acquire/jobs`,
            {
                topic: jobParams.topic,
                lockDuration: jobParams.lockDuration,
                numberOfTasks: jobParams.numberOfTasks || 1,
                numberOfRetries: jobParams.numberOfRetries || 5,
                workerId: jobParams.workerId || this.workerId,
                scopeType: jobParams.scopeType || null
            }
        )
            .then(response => response.data);
    }

    public async completeJob(completeParams: CompleteJobParams): Promise<void> {
        return this.axios.post(
            `${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/acquire/jobs/${completeParams.jobId}/complete`,
            {
                variables: completeParams.variables || null,
                workerId: completeParams.workerId || this.workerId,
            }
        )
            .then(() => {});
    }

    public async jobWithBpmnError(bpmnErrorParams: BpmnErrorJobParams): Promise<void> {
        return this.axios.post(
            `${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/acquire/jobs/${bpmnErrorParams.jobId}/bpmnError`,
            {
                workerId: bpmnErrorParams.workerId || this.workerId,
                variables: bpmnErrorParams.variables || null,
                errorCode: bpmnErrorParams.errorCode || null,
            }
        )
            .then(() => {});
    }

    public async jobWithCmmnTerminate(cmmnTerminateParams: CmmnTerminateJobParams): Promise<void> {
        return this.axios.post(
            `${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/acquire/jobs/${cmmnTerminateParams.jobId}/cmmnTerminate`,
            {
                workerId: cmmnTerminateParams.workerId || this.workerId,
                variables: cmmnTerminateParams.variables || null,
            }
        )
            .then(() => {});
    }

    public async failJob(failJobParams: FailJobParams): Promise<void> {
        return this.axios.post(
            `${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/acquire/jobs/${failJobParams.jobId}/fail`,
            {
                workerId: failJobParams.workerId || this.workerId,
                errorMessage: failJobParams.errorMessage,
                errorDetails: failJobParams.errorDetails,
                retries: failJobParams.retries,
                retryTimeout: failJobParams.retryTimeout
            }
        )
            .then(() => {});
    }
}

export type FlowableExternalWorkerRestClientProps = {
    flowableHost: string;
    workerId: string;
    auth?: AxiosBasicCredentials | AuthBearerTokenCredentials;
    customizeAxios?: (axios: Axios) => void;
}

export type AcquireJobParams = {
    topic: string;
    lockDuration: string;
    numberOfTasks?: number;
    numberOfRetries?: number;
    workerId?: string;
    scopeType?: string;
}

export type CompleteJobParams = {
    jobId: string;
    variables?: EngineRestVariable[];
    workerId?: string;
}

export type BpmnErrorJobParams = {
    jobId: string;
    variables?: EngineRestVariable[];
    errorCode?: string;
    workerId?: string;
}

export type CmmnTerminateJobParams = {
    jobId: string;
    variables?: EngineRestVariable[];
    workerId?: string;
}

export type FailJobParams = {
    jobId: string;
    workerId?: string;
    errorMessage?: string;
    errorDetails?: string;
    retries?: number;
    retryTimeout?: string;
}

export type AuthBearerTokenCredentials = {
    token: string;
}
