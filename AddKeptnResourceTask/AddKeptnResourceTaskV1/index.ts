import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance, AxiosError } from 'axios';
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
		failTaskWithError(err);
		return undefined;
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
async function run(input: Params) {
  try {
    const httpClient = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    if (
      input.resourceContentPath != undefined &&
      input.resourceUri != undefined
    ) {
		// TODO: we may want to inline this function
      await addResource(
        input,
        input.resourceContentPath,
        input.resourceUri,
        httpClient
      );
    }
  } catch (err) {
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
async function addResource(
  input: Params,
  localPath: string,
  remoteUri: string,
  httpClient: AxiosInstance
) {
  console.log("adding resource " + localPath + " to keptn target " + remoteUri);
  let resourceContent = fs.readFileSync(localPath); // do not use an encoding here to get binary files
  let endpointUri = "/configuration-service/v1/project/";
  let options = {
    method: <Method>"POST",
    url:
      input.keptnApiEndpoint +
      endpointUri +
      input.project +
      "/stage/" +
      input.stage +
      "/service/" +
      input.service +
      "/resource",
    headers: { "x-token": input.keptnApiToken },
    data: {
      resources: [
        {
          resourceURI: remoteUri,
          resourceContent: Buffer.from(resourceContent).toString("base64"),
        },
      ],
    },
  };

  return httpClient(options).catch((err: Error | AxiosError) => {
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
          throw Error(`Received error from Keptn:\n${err.response.data}`)
        }
      } else if (err.request) {
        throw Error("Did not receive a response from Keptn!")
      }

      throw Error(err.message)
    } else {
      throw err;
    }
  })
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
if (input !== undefined){
  run(input).then(result => {
    console.log(result);
  }).catch(err => {
    console.error(`Catching uncaught error and aborting task!`);
    failTaskWithError(err);
  });
}
