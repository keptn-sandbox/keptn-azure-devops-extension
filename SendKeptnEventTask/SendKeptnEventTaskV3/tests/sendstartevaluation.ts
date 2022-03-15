import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import moment = require('moment-timezone');
import fs from 'fs';

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('eventType', 'startEvaluation');
tmr.setInput('project', 'test-project');
tmr.setInput('service', 'test-service');
tmr.setInput('stage', 'hardening');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.setInput('keptnContextVar', 'keptnContext');
let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});
tmr.setInput('start', moment().subtract(1, 'days').format('YYYY-MM-DDTHH:MM:ss'));
tmr.setInput('timeframe', '15m');
tmr.setInput('teststrategy', 'performance');
tmr.registerMockExport("getVariable", function(v:string){
    if (v == "Build.DefinitionName") return "TestDefinition";
    throw new Error(`Unknown variable <${v}>`)
});

tmr.run();

