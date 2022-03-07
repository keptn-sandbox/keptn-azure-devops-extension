import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fs = require('fs');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('waitForEventType', 'evaluation');
tmr.setInput('project', 'test-project');
tmr.setInput('service', 'test-service');
tmr.setInput('stage', 'hardening');
tmr.setInput('keptnApiEndpoint', '1234567');
tmr.setInput('keptnContextVar', 'keptnContext');
tmr.setInput('timeout', '1');
tmr.setInput("bridgeURL", "https://TheBridgeURL");
tmr.setInput("markBuildOnError", "FAILED");
tmr.setInput("markBuildOnWarning", "FAILED");
let keptnFile = fs.readFileSync(require('os').homedir() + '/.keptn/.keptn','utf8');
tmr.registerMockExport("getEndpointUrl", function(){return keptnFile.split('\n')[0]});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return keptnFile.split('\n')[1]});
tmr.registerMockExport("getVariable", function(v:string){
    if (v=="keptnContext") return "398a73d8-490f-46ca-8825-4f7684475f2b";
    if (v=="keptnVersion") return "0.8.4";
    return "i don't know";
});

tmr.run();

