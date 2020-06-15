import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

//no input
tmr.registerMockExport("getEndpointUrl", function(){return undefined});
tmr.registerMockExport("getEndpointAuthorizationParameter", function(){return undefined});

tmr.run();