import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance } from 'axios';
import https = require('https');

class Params {
	waitForEventType: string = '';
	keptnApiEndpoint: string = '';
	keptnApiToken: string = '';
}

/**
 * Prepare input parameters
 */
function prepare():Params | undefined {
	
	try {
	    const waitForEventType: string | undefined = tl.getInput('waitForEventType');
		const project: string | undefined = tl.getInput('project');
		const service: string | undefined = tl.getInput('service');
		const stage: string | undefined = tl.getInput('stage');
		
		let keptnApiEndpointConn: string | undefined =  tl.getInput('keptnApiEndpoint');
		
		let p = new Params();
		let badInput:string[]=[];

		if (waitForEventType !== undefined) {
			p.waitForEventType = waitForEventType;
		}
		else{
            badInput.push('waitForEventType');
		}
		
		if (keptnApiEndpointConn !== undefined) {
			const keptnApiEndpoint: string | undefined = tl.getEndpointUrl(keptnApiEndpointConn, false);
			const keptnApiToken: string | undefined = tl.getEndpointAuthorizationParameter(keptnApiEndpointConn, 'apitoken', false);
			
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
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

/**
 * Main logic based on the different event types.
 * 
 * @param input Parameters
 */
async function run(input:Params){
	try{
		const axiosInstance = axios.create({
			httpsAgent: new https.Agent({  
				rejectUnauthorized: false
			})
		});
		if (input.waitForEventType == 'evaluationDone'){
			return waitForEvaluationDone(input, axiosInstance);
		}
		else{
			throw new Error('Unsupported eventType');
		}
	}catch(err){
		throw err;
	}
}

/**
 * Request the evaluation-done event based on the startEvaluationKeptnContext task variable.
 * Try a couple of times since it can take a few seconds for keptn to evaluate.
 * 
 * @param input Parameters
 * @param httpClient an instance of axios
 */
async function waitForEvaluationDone(input:Params, httpClient:AxiosInstance){
	let keptnContext = tl.getVariable('startEvaluationKeptnContext');
	console.log('keptnContext = ' + keptnContext);
	let evaluationScore = -1;
	let evaluationResult = "empty";
	let evaluationDetails:any;

	let options = {
		method: <Method>"GET",
		url: input.keptnApiEndpoint + '/v1/event?type=sh.keptn.events.evaluation-done&keptnContext=' + keptnContext,
		headers: {'x-token': input.keptnApiToken}
	};

	let c=0;
	do{
		try{
			await delay(10000); //wait 10 seconds
			var response = await httpClient(options);
			evaluationScore = response.data.data.evaluationdetails.score;
			evaluationResult = response.data.data.evaluationdetails.result;
			evaluationDetails = response.data.data.evaluationdetails;
		}catch(err){
			if (err != undefined 
				&& err.response != undefined 
				&& err.response.data != undefined
				&& err.response.data.code != undefined
				&& err.response.data.message != undefined
				&& err.response.data.code == '500'
				&& err.response.data.message.startsWith('No Keptn sh.keptn.events.evaluation-done event found for context')){
				if (++c > 10){ //2 minutes max
					console.log(c);
					evaluationResult = "not-found"
				}
			}
			else{
				throw err;
			}
		}
	}while (evaluationResult == "empty");

	if (evaluationResult == "pass"){
		tl.setResult(tl.TaskResult.Succeeded, "Keptn evaluation went well. Score = " + evaluationScore);
	}
	else{
		tl.setResult(tl.TaskResult.SucceededWithIssues, "Keptn evaluation " +  evaluationResult + ". Score = " + evaluationScore);
	}

	return evaluationResult;
}

/**
 * Helper function to wait an amount of millis.
 * @param ms 
 */
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main
 */
let input:Params | undefined = prepare();
if (input !== undefined){
	run(input).then(result => {
    	console.log(result);
	}).catch(err => {
		console.error(err);
	});
}
