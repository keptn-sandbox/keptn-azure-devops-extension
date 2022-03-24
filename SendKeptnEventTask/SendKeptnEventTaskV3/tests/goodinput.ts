import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fs from 'fs';

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');

tmr.setInput('eventType', 'generic');
tmr.setInput('project', 'p');
tmr.setInput('service', 's');
tmr.setInput('stage', 'test');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.setInput('keptnContextVar', 'keptnContext');
tmr.setInput('body', '{}')
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});

tmr.run();
