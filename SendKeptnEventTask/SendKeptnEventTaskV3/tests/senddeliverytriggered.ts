import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fs from 'fs';

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('eventType', 'delivery');
tmr.setInput('project', 'test-project');
tmr.setInput('service', 'test-service');
tmr.setInput('stage', 'hardening');
tmr.setInput('sequence', 'delivery');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.setInput('keptnContextVar', 'keptnContext');
let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});
tmr.setInput('image', 'docker.io/keptnexamples/carts');
tmr.setVariableName("Build.DefinitionName", "TestDefinition");

tmr.run();

