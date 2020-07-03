import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fs = require('fs');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('waitForEventType', 'evaluationDone');
tmr.setInput('project', 'test-project');
tmr.setInput('service', 'test-service');
tmr.setInput('stage', 'hardening');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.setInput('keptnContextVar', 'keptnContext');
tmr.setInput('timeout', '1');
let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});
tmr.registerMockExport("getEndpointDataParameter", function(){return "https://TheBridgeURL"});
tmr.registerMockExport("getTaskVariable", function(){return "TestKeptnContext"});

tmr.run();

