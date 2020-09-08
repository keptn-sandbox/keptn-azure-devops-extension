import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance } from 'axios';
import moment from 'moment-timezone';
import https = require('https');

class EvalParams {
	start: string = '';
	end: string | undefined;
}

class DeploymentFinishedParams {
	deploymentURI: string = '';
	testStrategy: string = '';
	tag: string = '';
	image: string = '';
}

class Params {
	eventType: string = '';
	project: string = '';
	service: string = '';
	stage: string = '';
	keptnApiEndpoint: string = '';
	keptnApiToken: string = '';
	evalParams: EvalParams | undefined;
	deployFinishedParams: DeploymentFinishedParams | undefined;
	keptnContextVar: string = '';
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
		const keptnContextVar: string | undefined = tl.getInput('keptnContextVar');
		if (keptnContextVar != undefined){
			p.keptnContextVar = keptnContextVar;
		}
		else{
			badInput.push('keptnContextVar');
		}
        
		console.log('using keptnApiEndpoint', p.keptnApiEndpoint);
		console.log('using eventType', p.eventType);
		console.log('using project', p.project);
		console.log('using service', p.service);
		console.log('using stage', p.stage);
		console.log('using keptnContextVar', p.keptnContextVar);

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
			p.evalParams = pe;
			console.log('using start', start);
			console.log('using end', end);
		}
		else if (p.eventType == 'deploymentFinished'){
			let pd = new DeploymentFinishedParams();
			const deploymentURI: string | undefined = tl.getInput('deploymentURI');
			if (deploymentURI != undefined){
				pd.deploymentURI = deploymentURI;
			}
			else{
				badInput.push('deploymentURI');
			}
			const testStrategy: string | undefined = tl.getInput('testStrategy');
			if (testStrategy != undefined){
				pd.testStrategy = testStrategy;
			}
			else{
				badInput.push('testStrategy');
			}
			const tag: string | undefined = tl.getInput('tag');
			if (tag != undefined){
				pd.tag = tag;
			}
			else{
				badInput.push('tag');
			}
			const image: string | undefined = tl.getInput('image');
			if (image != undefined){
				pd.image = image;
			}
			else{
				badInput.push('image');
			}
			
			p.deployFinishedParams = pd;
			console.log('using deploymentURI', deploymentURI);
			console.log('using testStrategy', testStrategy);
			console.log('using tag', tag);
			console.log('using image', image);
		}
		if (badInput.length > 0) {
			tl.setResult(tl.TaskResult.Failed, 'missing required input (' + badInput.join(',') + ')');
			return;
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
			return keptnContext;
		}
		else if (input.eventType == 'configurationChange'){
			return 'not yet implemented!';
		}
		else if (input.eventType == 'deploymentFinished' && input.deployFinishedParams != undefined){
			let keptnContext = await deploymentFinished(input, axiosInstance);
			return keptnContext;
		}
		else{
			throw new Error('Unsupported eventType');
		}
	}catch(err){
		throw err;
	}
	return "task finished";
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
			source: 'azure-devops-plugin',
			specversion: '0.2',
			data: {
				project: input.project,
				service: input.service,
				stage: input.stage,
				teststrategy: 'performance',
				start: input.evalParams!=undefined?input.evalParams.start:'null',
				end: input.evalParams!=undefined?input.evalParams.end:'null',
				labels: {
					definition: tl.getVariable("Release.DefinitionName"),
					buildnr: tl.getVariable("Build.BuildNumber"),
					runby: tl.getVariable("Build.QueuedBy"),
					environment : tl.getVariable("Environment.Name"),
					ciBackLink : tl.getVariable("Release.ReleaseWebURL")
				}
			}
		}
	};

	console.log('sending startEvaluation event ...');
	let response = await httpClient(options);
	return storeKeptnContext(input, response);
}

/**
 * Send the deployment-finished event based on the input parameters
 * 
 * Example: sendDeploymentFinishedEvent deploymentURI:"http://mysampleapp.mydomain.local" testStrategy:"performance"
 * Will trigger a Continuous Performance Evaluation workflow in Keptn where Keptn will 
 *   -> first: trigger a test execution against that URI with the specified testStrategy
 *   -> second: trigger an SLI/SLO evaluation!
 * 
 * @param input Parameters
 * @param httpClient an instance of axios
 */
async function deploymentFinished(input:Params, httpClient:AxiosInstance){
	let options = {
		method: <Method>"POST",
		url: input.keptnApiEndpoint + '/v1/event',
		headers: {'x-token': input.keptnApiToken},
		data: {
			type: 'sh.keptn.events.deployment-finished',
			source: 'azure-devops-plugin',
			specversion: '0.2',
			data: {
				project: input.project,
				service: input.service,
				stage: input.stage,
				teststrategy: input.deployFinishedParams!=undefined?input.deployFinishedParams.testStrategy:'performance',
				deploymentURIPublic: input.deployFinishedParams!=undefined?input.deployFinishedParams.deploymentURI:'null',
				tag: input.deployFinishedParams!=undefined?input.deployFinishedParams.tag:'null',
				image: input.deployFinishedParams!=undefined?input.deployFinishedParams.image:'null',
				labels: {
					buildId: tl.getVariable("Build.BuildNumber"),
					definition: tl.getVariable("Release.DefinitionName"),
					runby: tl.getVariable("Build.QueuedBy"),
					environment : tl.getVariable("Environment.Name"),
					ciBackLink : tl.getVariable("Release.ReleaseWebURL")
				}
			}
		}
	};

	console.log('sending deploymentFinished event ...');
	let response = await httpClient(options);
	return storeKeptnContext(input, response);
}

function storeKeptnContext (input:Params, response:any){
	if (input.keptnContextVar != undefined){
		tl.setVariable(input.keptnContextVar, response.data.keptnContext);
		return "stored " + response.data.keptnContext + " in variable " + input.keptnContextVar;
	}
	else{
		tl.setVariable("keptnContext", response.data.keptnContext);
		return "stored " + response.data.keptnContext + " in variable keptnContext";
	}
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
