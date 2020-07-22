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
			let sliPath = tl.getPathInput('sli', false, false);
			if (sliPath != undefined){
				p.sliPath = path.normalize(sliPath).trim();
			}
			let sloPath = tl.getPathInput('slo', false, false);
			if (sloPath != undefined){
				p.sloPath = path.normalize(sloPath).trim();
			}
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

		{ //scope verify and create project if needed
			let options = {
				method: <Method>"GET",
				url: input.keptnApiEndpoint + '/configuration-service/v1/project/' + input.project,
				headers: {'x-token': input.keptnApiToken},
				validateStatus: (status:any) => status === 200 || status === 404
			};
		
			let response = await httpClient(options);
			if (response.status === 200){
				console.log('project ' + input.project + ' already exists.');
			}
			else if (response.status === 404){
				if (input.autoCreate){
					let options = {
						method: <Method>"POST",
						url: input.keptnApiEndpoint + '/v1/project',
						headers: {'x-token': input.keptnApiToken},
						data: {
							name: input.project,
							shipyard: Buffer.from("stages:\n   - name: \"" + input.stage + "\"\n     test_strategy: \"performance\"").toString('base64')
						}
					};
					console.log('create project ' + input.project);
					let response = await httpClient(options);
				}
			}
		}

		{ //scope verify and create service if needed
			let options = {
				method: <Method>"GET",
				url: input.keptnApiEndpoint + '/configuration-service/v1/project/' + input.project + '/stage/'+ input.stage + '/service/' + input.service,
				headers: {'x-token': input.keptnApiToken},
				validateStatus: (status:any) => status === 200 || status === 404
			};
		
			let response = await httpClient(options);
			if (response.status === 200){
				console.log('service ' + input.service + ' already exists.');
			}
			if (response.status === 404){
				if (input.autoCreate){
					let options = {
						method: <Method>"POST",
						url: input.keptnApiEndpoint + '/v1/project/' + input.project + '/service',
						headers: {'x-token': input.keptnApiToken},
						data: {
							serviceName: input.service
						}
					};
					console.log('create service ' + input.service);
					let response = await httpClient(options);
				}
			}
		}

		if (input.monitoring != undefined){
			let options = {
				method: <Method>"POST",
				url: input.keptnApiEndpoint + '/v1/event',
				headers: {'x-token': input.keptnApiToken},
				data: {
					type: 'sh.keptn.event.monitoring.configure',
					source: 'AZDO',
					data: {
						project: input.project,
						service: input.service,
						type: input.monitoring
					}
				}
			};
			console.log('configure monitoring ' + input.monitoring);
			let response = await httpClient(options);

			if (input.sliPath != undefined){
				await addResource(input, input.sliPath, input.monitoring + '/sli.yaml', httpClient);
			}
			if (input.sloPath != undefined){
				await addResource(input, input.sloPath, 'slo.yaml', httpClient);
			}
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
async function addResource(input:Params, localPath:string, remoteUri:string, httpClient:AxiosInstance){
	console.log('adding resource ' + localPath + ' to keptn target ' + remoteUri);
	let resourceContent = fs.readFileSync(localPath,'utf8');
	let options = {
		method: <Method>"POST",
		url: input.keptnApiEndpoint + '/v1/project/' + input.project + '/stage/' + input.stage + '/service/' + input.service + '/resource',
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
