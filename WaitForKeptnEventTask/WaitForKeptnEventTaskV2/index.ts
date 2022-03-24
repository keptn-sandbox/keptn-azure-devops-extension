import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance, AxiosError, AxiosPromise } from 'axios';
import https = require('https');

class Params {
	waitForEventType: string = '';
	sequence: string = 'evaluation';
	timeout: number = 3;
	keptnContextVar: string = '';
	keptnApiEndpoint: string = '';
	keptnApiToken: string = '';
	keptnBridgeEndpoint: string | undefined;
	markBuildOn: {[index:string]:string} = {
		"fail": 'WARNING',
		"warning": 'WARNING',
		"info": 'NOTHING'
	}
}

const logIssueMap:{[index:string]:tl.IssueType} = {
	"WARNING":tl.IssueType.Warning,
	"FAILED":tl.IssueType.Error
}

const completeTaskMap:{[index:string]:tl.TaskResult} = {
	"WARNING":tl.TaskResult.SucceededWithIssues,
	"FAILED":tl.TaskResult.Failed
}

/**
 * Prepare input parameters
 */
function prepare():Params | undefined {
	
	try {
		const project: string | undefined = tl.getInput('project');
		const service: string | undefined = tl.getInput('service');
		const stage: string | undefined = tl.getInput('stage');
		
		let keptnApiEndpointConn: string | undefined =  tl.getInput('keptnApiEndpoint');
		
		let p = new Params();
		let badInput:string[]=[];

		const waitForEventType: string | undefined = tl.getInput('waitForEventType');
		if (waitForEventType !== undefined) {
			p.waitForEventType = waitForEventType;
		}
		else{
            badInput.push('waitForEventType');
		}

		const sequence: string | undefined = tl.getInput('sequence');
		if (sequence == undefined && (p.waitForEventType == 'evaluation' || p.waitForEventType == 'delivery')){
			p.sequence = p.waitForEventType;
		}
		else if (sequence == undefined && p.waitForEventType == 'generic' ){
			badInput.push('sequence');
		}
		else if (sequence !== undefined){
			p.sequence = sequence;
		}
		
		let timeoutStr: string | undefined = tl.getInput('timeout');
		if (timeoutStr != undefined){
			p.timeout = +timeoutStr;
		}
		else{
			badInput.push('timeout');
		}

		let keptnContextVar: string | undefined = tl.getInput('keptnContextVar');
		if (keptnContextVar != undefined){
			p.keptnContextVar = keptnContextVar;
		}
		else{
			badInput.push('keptnContextVar');
		}

		let markBuildOnFail: string | undefined = tl.getInput('markBuildOnError');
		if (markBuildOnFail != undefined){
			p.markBuildOn.fail = markBuildOnFail;
		}
		let markBuildOnWarning: string | undefined = tl.getInput('markBuildOnWarning');
		if (markBuildOnWarning != undefined){
			p.markBuildOn.warning = markBuildOnWarning;
		}
		

		if (keptnApiEndpointConn !== undefined) {
			const keptnApiEndpoint: string | undefined = tl.getEndpointUrl(keptnApiEndpointConn, false);
			const keptnApiToken: string | undefined = tl.getEndpointAuthorizationParameter(keptnApiEndpointConn, 'apitoken', false);
			const keptnBridgeEndpoint: string | undefined = tl.getInput('bridgeURL');
			
			if (keptnApiEndpoint != undefined){
				p.keptnApiEndpoint = keptnApiEndpoint;
			}
			else{
				badInput.push('keptnApiEndpoint');
			}
			if (keptnApiToken !== undefined) {
				p.keptnApiToken = keptnApiToken;
			}
			else{
				badInput.push('keptnApiToken');
			}
			if (keptnBridgeEndpoint !== undefined) {
				p.keptnBridgeEndpoint = keptnBridgeEndpoint;
			}
		}
		else{
			badInput.push('keptnApiEndpoint');
		}
		if (badInput.length > 0) {
            tl.setResult(tl.TaskResult.Failed, 'missing required input (' + badInput.join(',') + ')');
            return;
        }
        
		console.log('using keptnApiEndpoint', p.keptnApiEndpoint);
		console.log('using waitForEventType', p.waitForEventType);

		return p;
	} catch (err) {
    failTaskWithError(err);
    return undefined
  }
}

/**
 * Main logic based on the different event types.
 * 
 * @param input Parameters
 */
async function run(input: Params) {
  try {
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    let keptnContext = tl.getVariable(input.keptnContextVar);
    console.log("using keptnContext = " + keptnContext);
    let eventType = `sh.keptn.event.${input.sequence}.finished`;

    // in case of generic or delivery
    let cb = function (event: any) {
      return event.type;
    };
    // in case of evaluation
    if (input.waitForEventType == "evaluation") {
      cb = function (event: any) {
        let evaluationScore = event.data.evaluation.score;
        let evaluationResult = event.data.evaluation.result;
        handleEvaluationResult(
          evaluationResult,
          evaluationScore,
          keptnContext,
          input
        );
        return evaluationResult;
      };
    }
    if (keptnContext) {
      return waitFor(eventType, keptnContext, input, axiosInstance, cb);
    } else {
      throw new ReferenceError("keptnContext not found");
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Request the 'sequence'.finished event based on the KeptnContext task variable.
 * Try a couple of times since it can take a few seconds for keptn to do it's thing.
 * The timeout is also a variable
 * Handling of the response is done via the callback function since it depends on the type.
 *
 * @param eventType which is the full type String passed to the API
 * @param keptnContext identifier
 * @param input Parameters
 * @param httpClient an instance of axios
 * @param callback function to do something with the returned event data
 */
async function waitFor(
  eventType: string,
  keptnContext: string,
  input: Params,
  httpClient: AxiosInstance,
  callback: Function
) {
  let result = "empty";

  let options: any = {
    method: <Method>"GET",
    headers: { "x-token": input.keptnApiToken },
    url:
      input.keptnApiEndpoint +
      `/mongodb-datastore/event?type=${eventType}&keptnContext=${keptnContext}`,
  };

  let c = 0;
  let max = (input.timeout * 60) / 10;
  console.log("waiting in steps of 10 seconds, max " + max + " loops.");
  do {
    await delay(10000); //wait 10 seconds
    var response = await httpClient(options).catch(handleApiError);
    if (response.data.events != undefined && response.data.totalCount == 1) {
      result = callback(response.data.events[0], keptnContext, input);
      let keptnEventData = JSON.stringify(response.data.events[0], null, 2);
      console.log("************* Result from Keptn ****************");
      console.log(keptnEventData);
      tl.setVariable("keptnEventData", keptnEventData);
    } else {
      if (++c > max) {
        result = `No Keptn ${eventType} event found for context`;
        tl.setResult(tl.TaskResult.Failed, result);
        return result;
      } else {
        console.log("wait another 10 seconds");
      }
    }
  } while (result == "empty");
  return result;
}

function handleEvaluationResult(evaluationResult:string, evaluationScore:number, keptnContext:string|undefined, input:Params){
	console.log("evaluationResult = " + evaluationResult);
	if (evaluationResult == "not-found"){
		tl.setResult(tl.TaskResult.Failed, "No Keptn sh.keptn.events.evaluation-done event found for context");
		return "No Keptn sh.keptn.events.evaluation-done event found for context";
	}
	else if (evaluationResult == "pass"){
		tl.setResult(tl.TaskResult.Succeeded, "Keptn evaluation went well. Score = " + evaluationScore);
	}
	else{
		let message =  "Keptn evaluation " +  evaluationResult + ". Score = " + evaluationScore;
		let markBuild = input.markBuildOn[evaluationResult];
		console.log("markBuild = " + markBuild);
		if (markBuild == 'NOTHING'){
			console.log(message);
		}
		else{
			tl.logIssue(logIssueMap[markBuild], message);
			tl.setResult(completeTaskMap[markBuild], message);
		}
	}
	if (input.keptnBridgeEndpoint != undefined){
		console.log("Link to Bridge: " + input.keptnBridgeEndpoint + "/trace/" + keptnContext);
	}
}

/**
 * Helper function to wait an amount of millis.
 * @param ms 
 */
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function handleApiError(err: Error | AxiosError): AxiosPromise {
  // If the error is an AxiosError, we can try to extract the error message from the 
  // response and display it in the pipeline or just use the Axios error message
  if (axios.isAxiosError(err)) {

    if (err.response) {
      // Response is most likely a JSON encoded object
      if (err.response.data instanceof Object) {
        throw Error(err.response.data.message);
      }

      // If it's a string it could also be some payload that axios didn't understand
      if (err.response.data instanceof String || typeof err.response.data === "string") {
        throw Error(`Received error from Keptn:\n${err.response.data}`);
      } else if (err.request) {
        throw Error(`Did not receive a response from Keptn: ${err.message}`)
      }
    }

    throw Error(err.message);
  } else {
    throw err;
  }
}

// Fails the current task with an error message and creates
// a stack trace in the output log if printStack is set to true
function failTaskWithError(error: Error | string | unknown, printStack: boolean = true) {
  let errorMessage: string;

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;

    // Print a stack trace to the output log
    if (printStack) {
      console.error(error.stack);
    }
  } else {
    errorMessage = `${error}`;
  }

  tl.setResult(tl.TaskResult.Failed, errorMessage);
}

/**
 * Main
 */
let input:Params | undefined = prepare();
if (input !== undefined) {
  run(input).then(result => {
    console.log(result);
  }).catch(err => {
    console.error(`Catching uncaught error and aborting task!`);
    failTaskWithError(err);
  });
}
