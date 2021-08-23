import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fs from 'fs';

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('eventType', 'generic');
tmr.setInput('project', 'test-project');
tmr.setInput('service', 'test-service');
tmr.setInput('stage', 'hardening');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.setInput('keptnContextVar', 'keptnContext');
let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});
tmr.setInput('body', '\
{\
    "data": {\
      "evaluation": {\
        "end": "2021-07-28T14:02:49.230Z",\
        "start": "2021-07-28T13:52:49.192Z"\
      },\
      "image": "Cloud Automation Quality Gates",\
      "labels": {\
        "buildId": "10",\
        "buildNumber": "10",\
        "jobname": "Cloud Automation Quality Gates",\
        "joburl": "https://myjenkins/job/Cloud%20Automation%20Quality%20Gates/10/"\
      },\
      "monitoring": null,\
      "project": "test-project",\
      "result": "pass",\
      "service": "test-service",\
      "stage": "hardening",\
      "status": "succeeded",\
      "tag": "10",\
      "teststrategy": "manual"\
    },\
    "source": "AZDO Test",\
    "specversion": "1.0",\
    "time": "2021-07-28T14:03:49.819Z",\
    "type": "sh.keptn.event.qualitygate.evaluation.triggered"\
}\
');

tmr.run();

