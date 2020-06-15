import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import moment = require('moment-timezone');
import fs from 'fs';

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('eventType', 'waitForEvaluationDone');
tmr.setInput('project', 'kbi');
tmr.setInput('service', 'inburgering');
tmr.setInput('stage', 'ac2');
tmr.setInput('keptnApiEndpoint', '1234567');
let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});
tmr.registerMockExport("getVariable", function(){return "TestKeptnContext"});

tmr.run();

