# Features

This document describes a list of use-cases and features that this extension provides.

## Use Cases

The following are the core use cases that this integration supports. If you have another use case, please let us know by creating an Issue.

* UC 1: As a user, I want to trigger a Keptn quality gate evaluation from within Jenkins
* UC 2: As a user, I want to trigger a delivery with Keptn from within Jenkins
* UC 3: As a user, I want to create a project, a service, and push files to the Keptn configuration repo


## Stories

Each use case consists of multiple stories, however, a story can be part of many use cases.

### User Story 1: Install keptn-azure-devops-extension in Azure DevOps

**Goal**: A user should be able to install the extension and use it within their Azure DevOps Pipeline.

**DoD**:
* README contains installation instructions with screenshots
* README contains compatibility matrix


### User Story 2: Connect to the Keptn API

**Goal**: A user should be able to connect to their existing Keptn installation.

**DoD**:
* README contains instructions on how to connect to the Keptn installation via a service
* Code contains helper functions to read secrets / environment variables


### User Story 3: Create a project with shipyard

**Goal**: A user should be able to create a project defined by a shipyard file

**DoD**:
* Code contains task `PrepareKeptnEnv` (or similar) that can be used within a Azure DevOps Pipeline to create a project, service, and upload shipyard file
* README contains an example of how to use this task


### User Story 4: Add files / resources

**Goal**: A user should be able to add files to the Keptn configuration repo (project resource, stage resource, service resource)

**Notes**: In Keptn, some files are added as "global" resources for the project, while some others are added per stage or per service.

**DoD**:
* Code contains task `AddKeptnResource` (or similar) that can be used to upload a file to Keptn (e.g., SLI, SLO files)
* README contains an example of how to use this task

### User Story 5: Trigger a sequence

**Goal**: A user should be able to trigger a sequence (e.g., evaluation, delivery) from their Azure DevOps Pipeline

**DoD**:
* Code contains task to trigger an evaluation and delivery in Keptn
* README contains an example of how to use this task
* Sequence is triggered within Keptn (verifiable in Keptn Bridge)


### User Story 6: Wait for Keptn event

**Goal**: A user should be able to wait for a Keptn event (e.g., evaluation.finished)

**DoD**:
* Code contains a task to wait for a specific Keptn event (e.g., evaluation.finished)
* Task can be configured with a waitTime
* Task can be configured to set a build result for the pipeline
* README contains an example of how to use this task

