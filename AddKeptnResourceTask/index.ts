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
	resourceContentPath: string | undefined;
	resourceUri: string | undefined;
}

/**
 * Prepare input parameters
 */
function prepare():Params | undefined {
	
	try {
		let keptnApiEndpointConn: string | undefined =  tl.getInput('keptnApiEndpoint');
		
		let p = new Params();
		let badInput=[];
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
		p.resourceContentPath = filePathInput('resourceContent');
		if (p.resourceContentPath == undefined){
			badInput.push('resourceContent');
		}
		const resourceUri: string | undefined = tl.getInput('resourceUri');
		if (resourceUri !== undefined) {
			p.resourceUri = resourceUri;
		}
		else{
            badInput.push('resourceUri');
		}
		
		if (badInput.length > 0) {
            tl.setResult(tl.TaskResult.Failed, 'missing required input (' + badInput.join(',') + ')');
            return;
        }
        
		console.log('using keptnApiEndpoint', p.keptnApiEndpoint);
		console.log('using project', p.project);
		console.log('using service', p.service);
		console.log('using stage', p.stage);
		console.log('using resourceContentPath', p.resourceContentPath);
		console.log('using resourceUri', p.resourceUri);

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

		let keptnVersion;
		//Check which version of Keptn we have here
		{
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
		}

		if (input.resourceContentPath!=undefined && input.resourceUri!=undefined){
			await addResource(input, input.resourceContentPath, input.resourceUri, httpClient, keptnVersion);
		}
	}catch(err){
		throw err;
	}
	return "task finished";
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
	let resourceContent = fs.readFileSync(localPath); // do not use an encoding here to get binary files
	let endpointUri = '/configuration-service/v1/project/';
	if (keptnVersion == '0.6'){
		endpointUri = '/v1/project/';
	}
	let options = {
		method: <Method>"POST",
		url: input.keptnApiEndpoint + endpointUri + input.project + '/stage/' + input.stage + '/service/' + input.service + '/resource',
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
		tl.setResult(tl.TaskResult.Failed, `${err}`);
	});
}
