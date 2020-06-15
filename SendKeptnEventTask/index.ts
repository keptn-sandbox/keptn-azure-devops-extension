import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance } from 'axios';
import moment from 'moment-timezone';
import https = require('https');

class EvalParams {
	start: string = '';
	end: string | undefined;
	testStrategy: string = '';
	waitForEvaluationDone: boolean | undefined;
}

class Params {
	eventType: string = '';
	project: string = '';
	service: string = '';
	stage: string = '';
	keptnApiEndpoint: string = '';
	keptnApiToken: string = '';
	evalParams: EvalParams | undefined;
}

/**
 * Prepare input parameters
 */
function prepare():Params | undefined {
	
	try {
		let p = new Params();
		let badInput:string[]=[];

		p.project = getKeptnSettingVariable('project', badInput);
		p.stage = getKeptnSettingVariable('stage', badInput);
		p.service = getKeptnSettingVariable('service', badInput);

		let eventType: string | undefined = tl.getInput('eventType');
		if (eventType !== undefined) {
			p.eventType = eventType;
		}
		else{
            badInput.push('eventType');
		}
		
		let keptnApiEndpointConn: string | undefined =  tl.getInput('keptnApiEndpoint');
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
		console.log('using eventType', p.eventType);
		console.log('using project', p.project);
		console.log('using service', p.service);
		console.log('using stage', p.stage);

		if (p.eventType == 'startEvaluation'){
			let pe = new EvalParams();
			const start: string | undefined = tl.getInput('start');
			if (start != undefined){
				pe.start = start;
			}
			else{
				badInput.push('start');
			}
			const end: string | undefined = tl.getInput('end');
			if (end != undefined){
				pe.end = end;
			}
			else{
				pe.end = moment().format('YYYY-MM-DDTHH:MM:ssZ');
			}
			const testStrategy: string | undefined = tl.getInput('teststrategy');
			if (testStrategy != undefined){
				pe.testStrategy = testStrategy;
			}
			else{
				badInput.push('teststrategy');
			}
			pe.waitForEvaluationDone = tl.getBoolInput('waitForEvaluationDone');
			if (badInput.length > 0) {
				tl.setResult(tl.TaskResult.Failed, 'missing required input (' + badInput.join(',') + ')');
				return;
			}
			p.evalParams = pe;
			console.log('using start', start);
			console.log('using end', end);
			console.log('using testStrategy', 'testStrategy');
		}
		return p;
	} catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

/**
 * 
 * @param variable 
 * @param badInput 
 */
function getKeptnSettingVariable(variable:string, badInput:string[]): string{
	let value: string | undefined  = tl.getInput(variable);
	if (value !== undefined) {
		return value;
	}
	else{
		let v: string | undefined  = tl.getVariable('PrepareKeptnEnv_' + variable);
		if (v !== undefined){
			return v;
		}
		badInput.push(variable);
	}
	return '';
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
		if (input.eventType == 'startEvaluation' && input.evalParams != undefined){
			let keptnContext = await startEvaluation(input, axiosInstance);
			if (input.evalParams.waitForEvaluationDone){
				return waitForEvaluationDone(input, axiosInstance);
			}
			else{
				return keptnContext;
			}
		}
		else if (input.eventType == 'configurationChange'){
			return 'not yet implemented!';
		}
		else if (input.eventType == 'deploymentFinished'){
			return 'not yet implemented!';
		}
		else if (input.eventType == 'waitForEvaluationDone'){
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
 * Send the start-evaluation event based on the input parameters
 * 
 * @param input Parameters
 * @param httpClient an instance of axios
 */
async function startEvaluation(input:Params, httpClient:AxiosInstance){
	let options = {
		method: <Method>"POST",
		url: input.keptnApiEndpoint + '/v1/event',
		headers: {'x-token': input.keptnApiToken},
		data: {
			type: 'sh.keptn.event.start-evaluation',
			source: 'AZDO',
			data: {
				project: input.project,
				service: input.service,
				stage: input.stage,
				teststrategy: input.evalParams!=undefined?input.evalParams.testStrategy:'null',
				start: input.evalParams!=undefined?input.evalParams.start:'null',
				end: input.evalParams!=undefined?input.evalParams.end:'null'
			}
		}
	};

	console.log('sending ...');
	let response = await httpClient(options);
	tl.setVariable('startEvaluationKeptnContext', response.data.keptnContext);
	return response.data.keptnContext;
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
	let options = {
		method: <Method>"GET",
		url: input.keptnApiEndpoint + '/v1/event?type=sh.keptn.events.evaluation-done&keptnContext=' + keptnContext,
		headers: {'x-token': input.keptnApiToken}
	};

	let c=0;
	do{
		try{
			await delay(1000);
			var response = await httpClient(options);
			evaluationScore = response.data.data.evaluationdetails.score;
    		evaluationResult = response.data.data.evaluationdetails.result;
		}catch(err){
			if (err != undefined 
				&& err.response != undefined 
				&& err.response.data != undefined
				&& err.response.data.code != undefined
				&& err.response.data.message != undefined
				&& err.response.data.code == '500'
				&& err.response.data.message.startsWith('No Keptn sh.keptn.events.evaluation-done event found for context')){
				if (++c > 5){
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
