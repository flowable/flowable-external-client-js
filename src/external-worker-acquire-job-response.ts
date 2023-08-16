import {ExternalWorkerJobResponse} from "./external-worker-job-response";
import {EngineRestVariable} from "./engine-rest-variable";

export type ExternalWorkerAcquireJobResponse = ExternalWorkerJobResponse & {
    variables: EngineRestVariable[];
}
