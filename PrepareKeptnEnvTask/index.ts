import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance } from 'axios';
import https = require('https');
import path = require('path');
import fs = require('fs');

class Params {
	project: string = '';
	service: string = '';
	stage: string = '';
	keptnApiEndpoint: string = '';
	keptnApiToken: string = '';
	autoCreate: boolean | undefined;
	monitoring: string | undefined;
	sliPath: string | undefined;
	sloPath: string | undefined;
	dynatraceConfPath: string | undefined;
}

/**
 * Prepare input parameters
 */
function prepare():Params | undefined {
	
	try {
		let keptnApiEndpointConn: string | undefined =  tl.getInput('keptnApiEndpoint');
		
		let p = new Params();
		let badInput=[];
		p.autoCreate = tl.getBoolInput('autoCreate');
		const project: string | undefined = tl.getInput('project');
		if (project !== undefined) {
			p.project = project;
			tl.setVariable('PrepareKeptnEnv_project', p.project);
		}
		else{
            badInput.push('project');
		}
		const service: string | undefined = tl.getInput('service');
		if (service !== undefined) {
			p.service = service;
			tl.setVariable('PrepareKeptnEnv_service', p.service);
		}
		else{
            badInput.push('service');
		}
		const stage: string | undefined = tl.getInput('stage');
		if (stage !== undefined) {
			p.stage = stage;
			tl.setVariable('PrepareKeptnEnv_stage', p.stage);
		}
		else{
            badInput.push('stage');
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
		p.monitoring = tl.getInput('monitoring');
		if (p.monitoring != undefined){
			p.sliPath = filePathInput('sli');
			p.sloPath = filePathInput('slo');
			p.dynatraceConfPath = filePathInput('dynatraceConf');
		}
		if (badInput.length > 0) {
            tl.setResult(tl.TaskResult.Failed, 'missing required input (' + badInput.join(',') + ')');
            return;
        }
        
		console.log('using keptnApiEndpoint', p.keptnApiEndpoint);
		console.log('using project', p.project);
		console.log('using service', p.service);
		console.log('using stage', p.stage);

		return p;
	} catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

/**
 * Check the provided path input. Must be a file and existing.
 * @param input 
 */
function filePathInput(input:string): string|undefined{
	let p = tl.getPathInput(input, false, false);
	if (p != undefined){
		p = path.normalize(p).trim();
		if (fs.existsSync(p) && fs.lstatSync(p).isFile()){
			return p;
		}
	}
	return undefined;
}

/**
 * Main logic based on the different event types.
 * 
 * @param input Parameters
 */
async function run(input:Params){
	try{
		const httpClient = axios.create({
			httpsAgent: new https.Agent({  
				rejectUnauthorized: false
			})
		});

		let keptnVersion = await fetchKeptnVersion(input, httpClient);
		tl.setVariable('keptnVersion', keptnVersion);

		{ //scope verify and create project if needed
			if (!await entityExists('project', input, httpClient, keptnVersion)){
				if (input.autoCreate){
					let options = {
						method: <Method>"POST",
						url: input.keptnApiEndpoint + getAPIFor('project-post', keptnVersion) + '/project',
						headers: {'x-token': input.keptnApiToken},
						data: {
							name: input.project,
							shipyard: getShipyardFor(keptnVersion, input.stage)
						}
					};
					console.log('create project ' + input.project);
					let response = await httpClient(options);
				}
			}
			else {
				console.log('project ' + input.project + ' already exists.');
			}
		}

		{ //scope verify and create service if needed
			let loopcount = 0;
			while (!await entityExists('stage', input, httpClient, keptnVersion) && loopcount < 10){
				await delay(2000);
				loopcount++;
			}
			let options = {
				method: <Method>"GET",
				url: input.keptnApiEndpoint + getAPIFor('project-get', keptnVersion) + '/project/' + input.project + '/stage/'+ input.stage + '/service/' + input.service,
				headers: {'x-token': input.keptnApiToken},
				validateStatus: (status:any) => status === 200 || status === 404
			};
		
			let response = await httpClient(options);
			if (response.status === 200){
				console.log('service ' + input.service + ' already exists.');
			}
			if (!await entityExists('service', input, httpClient, keptnVersion)){
				if (input.autoCreate){
					let options = {
						method: <Method>"POST",
						url: input.keptnApiEndpoint + getAPIFor('project-post', keptnVersion) + '/project/' + input.project + '/service',
						headers: {'x-token': input.keptnApiToken},
						data: {
							serviceName: input.service
						}
					};
					console.log('create service ' + input.service);
					let response = await httpClient(options);
				}
				//Only send the configure-monitoring event once.
				if (input.monitoring != undefined){
					let options = {
						method: <Method>"POST",
						url: input.keptnApiEndpoint + getAPIFor('event-post', keptnVersion) + '/event',
						headers: {'x-token': input.keptnApiToken},
						data: {
							type: 'sh.keptn.event.monitoring.configure',
							source: 'azure-devops-plugin',
							data: {
								project: input.project,
								service: input.service,
								type: input.monitoring
							}
						}
					};
					console.log('configure monitoring ' + input.monitoring);
					let response = await httpClient(options);
				}
			}
			else {
				console.log('service ' + input.service + ' already exists.');
			}
		}

		if (input.monitoring != undefined){
			let loopcount = 0;
			while (!await entityExists('service', input, httpClient, keptnVersion) && loopcount < 10){
				await delay(2000);
				loopcount++;
			}

			if (input.sliPath != undefined){
				await addResource(input, input.sliPath, input.monitoring + '/sli.yaml', httpClient, keptnVersion);
			}
			if (input.sloPath != undefined){
				await addResource(input, input.sloPath, 'slo.yaml', httpClient, keptnVersion);
			}
			if (input.dynatraceConfPath != undefined){
				await addResource(input, input.dynatraceConfPath, input.monitoring + '/dynatrace.conf.yaml', httpClient, keptnVersion);
			}
		}
	}catch(err){
		throw err;
	}
	return "task finished";
}

/**
 * Get the Keptn Version via the API. Used for backwards compatibility reasons
 * 
 * @param input 
 * @param httpClient 
 */
async function fetchKeptnVersion(input:Params, httpClient:AxiosInstance){
	let keptnVersion;
	//Check which version of Keptn we have here
	
	let options = {
		method: <Method>"GET",
		url: input.keptnApiEndpoint + '/v1/metadata',
		headers: {'x-token': input.keptnApiToken},
		validateStatus: (status:any) => status === 200 || status === 404
	};

	let response = await httpClient(options);
	if (response.status === 200){
		console.log('metadata endpoint exists...');
		keptnVersion = response.data.keptnversion;
	}
	else if (response.status === 404){
		keptnVersion = '0.6'
	}
	console.log('keptnVersion = ' + keptnVersion);
	return keptnVersion;
}

/**
 * 
 * @param entityType 
 * @param input 
 * @param httpClient 
 */
async function entityExists(entityType:string, input:Params, httpClient:AxiosInstance, keptnVersion:string){
	let uri = getAPIFor('project-get', keptnVersion);
	if (entityType == 'project' || entityType == 'stage' || entityType == 'service'){
		uri += '/project/' + input.project
	}
	if (entityType == 'stage' || entityType == 'service'){
		uri += '/stage/' + input.stage
	}
	if (entityType == 'service'){
		uri += '/service/' + input.service
	}
	let options = {
		method: <Method>"GET",
		url: input.keptnApiEndpoint + uri,
		headers: {'x-token': input.keptnApiToken},
		validateStatus: (status:any) => status === 200 || status === 404
	};

	let response = await httpClient(options);
	if (response.status === 200){
		if (response.data == null){
			return false;
		}
		return true;
	}
	else if (response.status === 404){
		return false;
	}
	throw 'ResponseStatus is not as expected';
}

function getAPIFor(apiType:string, keptnVersion:string){
	if (apiType.startsWith('project-resource')){
		if (keptnVersion == '0.6'){
			return '/v1';
		}
		else{
			return '/configuration-service/v1';
		}
	}
	else if (apiType.startsWith('project')){
		if (keptnVersion.startsWith('0.8')){
			return "/controlPlane/v1"
		}
		else if (apiType == 'project-get'){
			return '/configuration-service/v1';
		}
		else if (apiType == 'project-post'){
			return '/v1';
		}
	}
	else if (apiType.startsWith('event')){
		return '/v1';
	}
	return "/unknown-api"
}

/**
 * Generate / fetch the shipyard yaml base64 based on the input
 * 
 * @param keptnVersion 
 * @param stage 
 */
function getShipyardFor(keptnVersion:string, stage:string){
	let shipyardKind: string | undefined =  tl.getInput('shipyardKind');
	if (shipyardKind == undefined) shipyardKind = 'generated';
	if (shipyardKind == 'generated'){
		return getGeneratedShipyardFor(keptnVersion, stage);
	}
	else if (shipyardKind == 'inline'){
		let inlineContent:string|undefined = tl.getInput('shipyardInline');
		if (inlineContent){
			return Buffer.from(inlineContent).toString('base64');
		}
		else {
			throw ReferenceError("shipyardInline must be provided!");
		}
	}
	else if (shipyardKind == 'file'){
		let shipyardFilePath = filePathInput('shipyardFile');
		if (shipyardFilePath){
			console.log(`using shipyard ${shipyardFilePath}`);
			let resourceContent = fs.readFileSync(shipyardFilePath,'utf8');
			return Buffer.from(resourceContent).toString('base64');
		}
		else {
			throw ReferenceError("shipyardFile must be provided and valid");
		}
	}
	throw new TypeError("shipyardKind must be a valid and supported type");
}

/**
 * Return a default generated simple shipyard with only one stage
 * 
 * @param keptnVersion 
 * @param stage 
 */
function getGeneratedShipyardFor(keptnVersion:string, stage:string){
	if (!keptnVersion.startsWith('0.7') && !keptnVersion.startsWith('0.6')){
		return Buffer.from(
			"apiVersion: \"spec.keptn.sh/0.2.0\"\n"+
			"kind: \"Shipyard\"\n"+
			"metadata:\n"+
			"  name: \"shipyard-azdo\"\n"+
			"spec:\n"+
			"  stages:\n"+
			"    - name: \"" + stage + "\"")
		.toString('base64');
	}
	else{
		return Buffer.from(
			"stages:\n"+
			"  - name: \"" + stage + "\"\n"+
			"    test_strategy: \"performance\"")
			.toString('base64');
	}
}

/**
 * Helper function to wait an amount of millis.
 * @param ms 
 */
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add a resource to keptn
 * 
 * @param input Parameters
 * @param localPath to the config file
 * @param remoteUri remote Target path
 * @param httpClient an instance of axios
 */
async function addResource(input:Params, localPath:string, remoteUri:string, httpClient:AxiosInstance, keptnVersion:string){
	console.log('adding resource ' + localPath + ' to keptn target ' + remoteUri);
	let resourceContent = fs.readFileSync(localPath,'utf8');
	
	let options = {
		method: <Method>"POST",
		url: input.keptnApiEndpoint + getAPIFor("project-resource-post", keptnVersion) + "/project/" + input.project + '/stage/' + input.stage + '/service/' + input.service + '/resource',
		headers: {'x-token': input.keptnApiToken},
		data: {
			resources: [
				{
					resourceURI: remoteUri,
					resourceContent: Buffer.from(resourceContent).toString('base64')
				}
			]
		}
	};
	try{
		let response = await httpClient(options);
	}catch(err){
		throw err;
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
