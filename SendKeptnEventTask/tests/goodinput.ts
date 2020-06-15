import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('eventType', 'configurationChange');
tmr.setInput('project', 'p');
tmr.setInput('service', 's');
tmr.setInput('stage', 'test');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.registerMockExport("getEndpointUrl", function(){return "https://api.keptn.mock"});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return "apitoken"});

tmr.run();
