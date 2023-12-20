# Flowable External Worker Library for Javascript

[License:
![license](https://img.shields.io/hexpm/l/plug.svg)](https://github.com/flowable/flowable-external-client-js/blob/main/LICENSE)

![Flowable Actions CI](https://github.com/flowable/flowable-external-client-js/actions/workflows/main.yml/badge.svg?branch=main)

An _External Worker Task_ in BPMN or CMMN is a task where the custom logic of that task is executed externally to Flowable, i.e. on another server.
When the process or case engine arrives at such a task, it will create an **external job**, which is exposed over the REST API.
Through this REST API, the job can be acquired and locked.
Once locked, the custom logic is responsible for signalling over REST that the work is done and the process or case can continue.

This project makes implementing such custom logic in Javascript or Typescript easy by not having the worry about the low-level details of the REST API and focus on the actual custom business logic.
Integrations for other languages are available, too.

## Authentication

The library allows to either authenticate with basic authentication with the parameter `auth` requiring `username` and `password`.

To use a personal access token you can specify the parameter `auth` and add `token` as a parameter.

Alternatively, `customizeAxios` can be used to directly customize the REST client.

## Installation

To install the external worker library, execute the following command:

```
npm install @flowable-oss/external-worker-client
```

## Sample

### Cloud

The usage with Flowable Cloud is simpler, since everything is pre-configured.
However, it's required to either use the user credentials or to pre-configure a personal access token.

```javascript
import {ExternalWorkerAcquireJobResponse, ExternalWorkerClient, WorkerResultBuilder} from "@flowable-oss/external-worker-client";

const externalWorkerClient = new ExternalWorkerClient({
    auth: {
        token: '<personal-access-token>'
    }
});

const subscription = externalWorkerClient.subscribe({
    topic: "myTopic",
    numberOfTasks: 1,
    callbackHandler(job: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
        console.log(`Execute job: ${job.id}`);
        return workResultBuilder.success();
    }
});
```

### Local

The following is an example how you can connect to a Flowable instance running at `http://host.docker.internal:8090` and process all messages retrieved on the topic `myTopic`:

```typescript
import {ExternalWorkerAcquireJobResponse, ExternalWorkerClient, WorkerResultBuilder} from "@flowable-oss/external-worker-client";

const externalWorkerClient = new ExternalWorkerClient({
    flowableHost: 'http://host.docker.internal:8090',
    auth: {
        username: 'admin',
        password: 'test'
    }
});

const subscription = externalWorkerClient.subscribe({
    topic: "myTopic",
    numberOfTasks: 1,
    callbackHandler(job: ExternalWorkerAcquireJobResponse, workResultBuilder: WorkerResultBuilder) {
        console.log(`Execute job: ${job.id}`);
        return workResultBuilder.success();
    }
});
```
