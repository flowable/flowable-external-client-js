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

    constructor({flowableHost, workerId, auth, bearerToken, customizeAxios}: FlowableExternalWorkerRestClientProps) {
        this.flowableHost = flowableHost;
        this.workerId = workerId;
        this.axios = axios.create();
        if (auth) {
            this.axios.defaults.auth = auth;
        }
        if (bearerToken) {
            this.axios.defaults.headers.common.Authorization = `Bearer ${bearerToken}`;
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

    public async acquireJob(jobParams: AcquireJobParams): Promise<ExternalWorkerAcquireJobResponse> {
        return this.axios.post<ExternalWorkerAcquireJobResponse>(
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

    public async completeJob(completeParams: CompleteJobParams) {
        return this.axios.post(
            `${this.flowableHost}${FlowableExternalWorkerRestClient.JOB_API}/acquire/jobs/${completeParams.jobId}/complete`,
            {
                variables: completeParams.variables || null,
                workerId: completeParams.workerId || this.workerId,
            }
        );
    }
}

export type FlowableExternalWorkerRestClientProps = {
    flowableHost: string;
    workerId: string;
    auth?: AxiosBasicCredentials;
    bearerToken?: string;
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
