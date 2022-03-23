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
	autoCreate: boolean | undefined;
	monitoring: string | undefined;
	sliPath: string | undefined;
	sloPath: string | undefined;
	dynatraceConfPath: string | undefined;
}

/**
 * Prepare input parameters
 */
function prepare(): Params | undefined {
  try {
    let keptnApiEndpointConn: string | undefined =
      tl.getInput("keptnApiEndpoint");

    let p = new Params();
    let badInput = [];
    p.autoCreate = tl.getBoolInput("autoCreate");
    const project: string | undefined = tl.getInput("project");
    if (project !== undefined) {
      p.project = project;
      tl.setVariable("PrepareKeptnEnv_project", p.project);
    } else {
      badInput.push("project");
    }
    const service: string | undefined = tl.getInput("service");
    if (service !== undefined) {
      p.service = service;
      tl.setVariable("PrepareKeptnEnv_service", p.service);
    } else {
      badInput.push("service");
    }
    const stage: string | undefined = tl.getInput("stage");
    if (stage !== undefined) {
      p.stage = stage;
      tl.setVariable("PrepareKeptnEnv_stage", p.stage);
    } else {
      badInput.push("stage");
    }
    if (keptnApiEndpointConn !== undefined) {
      const keptnApiEndpoint: string | undefined = tl.getEndpointUrl(
        keptnApiEndpointConn,
        false
      );
      const keptnApiToken: string | undefined =
        tl.getEndpointAuthorizationParameter(
          keptnApiEndpointConn,
          "apitoken",
          false
        );

      if (keptnApiEndpoint != undefined) {
        p.keptnApiEndpoint = keptnApiEndpoint;
      } else {
        badInput.push("keptnApiEndpoint");
      }
      if (keptnApiToken !== undefined) {
        p.keptnApiToken = keptnApiToken;
      } else {
        badInput.push("keptnApiToken");
      }
    } else {
      badInput.push("keptnApiEndpoint");
    }
    p.monitoring = tl.getInput("monitoring");
    if (p.monitoring != undefined) {
      p.sliPath = filePathInput("sli");
      p.sloPath = filePathInput("slo");
      p.dynatraceConfPath = filePathInput("dynatraceConf");
    }
    if (badInput.length > 0) {
      tl.setResult(
        tl.TaskResult.Failed,
        "missing required input (" + badInput.join(",") + ")"
      );
      return;
    }

    console.log("using keptnApiEndpoint", p.keptnApiEndpoint);
    console.log("using project", p.project);
    console.log("using service", p.service);
    console.log("using stage", p.stage);

    return p;
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

/**
 * Check the provided path input. Must be a file and existing.
 * @param input
 */
function filePathInput(input: string): string | undefined {
  let p = tl.getPathInput(input, false, false);
  if (p != undefined) {
    p = path.normalize(p).trim();
    if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
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

    {
       // Check project name, only lowercase names are allowed
       if (input.project != input.project.toLocaleLowerCase()) {
        throw Error("project must be lowercase!")
      }
      
      //scope verify and create project if needed
      if (!(await entityExists("project", input, httpClient))) {
        if (input.autoCreate) {
          let options = {
            method: <Method>"POST",
            url:
              input.keptnApiEndpoint + getAPIFor("project-post") + "/project",
            headers: { "x-token": input.keptnApiToken },
            data: {
              name: input.project,
              shipyard: getShipyardFor(input.stage),
            },
          };
          console.log("create project " + input.project);
          let response = await httpClient(options);
        }
      } else {
        console.log("project " + input.project + " already exists.");
      }
    }

    {
      //scope verify and create service if needed
      let loopcount = 0;
      while (
        !(await entityExists("stage", input, httpClient)) &&
        loopcount < 10
      ) {
        await delay(2000);
        loopcount++;
      }
      let options = {
        method: <Method>"GET",
        url:
          input.keptnApiEndpoint +
          getAPIFor("project-get") +
          "/project/" +
          input.project +
          "/stage/" +
          input.stage +
          "/service/" +
          input.service,
        headers: { "x-token": input.keptnApiToken },
        validateStatus: (status: any) => status === 200 || status === 404,
      };

      let response = await httpClient(options);
      if (response.status === 200) {
        console.log("service " + input.service + " already exists.");
      }
      if (!(await entityExists("service", input, httpClient))) {
        if (input.autoCreate) {
          let options = {
            method: <Method>"POST",
            url:
              input.keptnApiEndpoint +
              getAPIFor("project-post") +
              "/project/" +
              input.project +
              "/service",
            headers: { "x-token": input.keptnApiToken },
            data: {
              serviceName: input.service,
            },
          };
          console.log("create service " + input.service);
          let response = await httpClient(options);
        }
        //Only send the configure-monitoring event once.
        if (input.monitoring != undefined) {
          let options = {
            method: <Method>"POST",
            url: input.keptnApiEndpoint + getAPIFor("event-post") + "/event",
            headers: { "x-token": input.keptnApiToken },
            data: {
              type: "sh.keptn.event.monitoring.configure",
              source: "azure-devops-plugin",
              data: {
                project: input.project,
                service: input.service,
                type: input.monitoring,
              },
            },
          };
          console.log("configure monitoring " + input.monitoring);
          let response = await httpClient(options);
        }
      } else {
        console.log("service " + input.service + " already exists.");
      }
    }

    if (input.monitoring != undefined) {
      let loopcount = 0;
      while (
        !(await entityExists("service", input, httpClient)) &&
        loopcount < 10
      ) {
        await delay(2000);
        loopcount++;
      }

      if (input.sliPath != undefined) {
        await addResource(
          input,
          input.sliPath,
          input.monitoring + "/sli.yaml",
          httpClient
        );
      }
      if (input.sloPath != undefined) {
        await addResource(input, input.sloPath, "slo.yaml", httpClient);
      }
      if (input.dynatraceConfPath != undefined) {
        await addResource(
          input,
          input.dynatraceConfPath,
          input.monitoring + "/dynatrace.conf.yaml",
          httpClient
        );
      }
    }
  } catch (err) {
    throw err;
  }
  return "task finished";
}

/**
 *
 * @param entityType
 * @param input
 * @param httpClient
 */
async function entityExists(
  entityType: string,
  input: Params,
  httpClient: AxiosInstance
) {
  let uri = getAPIFor("project-get");
  if (
    entityType == "project" ||
    entityType == "stage" ||
    entityType == "service"
  ) {
    uri += "/project/" + input.project;
  }
  if (entityType == "stage" || entityType == "service") {
    uri += "/stage/" + input.stage;
  }
  if (entityType == "service") {
    uri += "/service/" + input.service;
  }
  let options = {
    method: <Method>"GET",
    url: input.keptnApiEndpoint + uri,
    headers: { "x-token": input.keptnApiToken },
    validateStatus: (status: any) => status === 200 || status === 404,
  };

  let response = await httpClient(options);
  if (response.status === 200) {
    if (response.data == null) {
      return false;
    }
    return true;
  } else if (response.status === 404) {
    return false;
  }
  throw "ResponseStatus is not as expected";
}

function getAPIFor(apiType: string) {
  if (apiType.startsWith("project-resource")) {
    return "/configuration-service/v1";
  } else if (apiType.startsWith("project")) {
    return "/controlPlane/v1";
  } else if (apiType.startsWith("event")) {
    return "/v1";
  }
  return "/unknown-api";
}

/**
 * Generate / fetch the shipyard yaml base64 based on the input
 *
 * @param stage
 */
function getShipyardFor(stage: string) {
  let shipyardKind: string | undefined = tl.getInput("shipyardKind");
  if (shipyardKind == undefined) shipyardKind = "generated";
  if (shipyardKind == "generated") {
    return getGeneratedShipyardFor(stage);
  } else if (shipyardKind == "inline") {
    let inlineContent: string | undefined = tl.getInput("shipyardInline");
    if (inlineContent) {
      return Buffer.from(inlineContent).toString("base64");
    } else {
      throw ReferenceError("shipyardInline must be provided!");
    }
  } else if (shipyardKind == "file") {
    let shipyardFilePath = filePathInput("shipyardFile");
    if (shipyardFilePath) {
      console.log(`using shipyard ${shipyardFilePath}`);
      let resourceContent = fs.readFileSync(shipyardFilePath, "utf8");
      return Buffer.from(resourceContent).toString("base64");
    } else {
      throw ReferenceError("shipyardFile must be provided and valid");
    }
  }
  throw new TypeError("shipyardKind must be a valid and supported type");
}

/**
 * Return a default generated simple shipyard with only one stage
 *
 * @param stage
 */
function getGeneratedShipyardFor(stage: string) {
  return Buffer.from(
    'apiVersion: "spec.keptn.sh/0.2.0"\n' +
      'kind: "Shipyard"\n' +
      "metadata:\n" +
      '  name: "shipyard-azdo"\n' +
      "spec:\n" +
      "  stages:\n" +
      '    - name: "' +
      stage +
      '"'
  ).toString("base64");
}

/**
 * Helper function to wait an amount of millis.
 * @param ms
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  let resourceContent = fs.readFileSync(localPath, "utf8");

  let options = {
    method: <Method>"POST",
    url:
      input.keptnApiEndpoint +
      getAPIFor("project-resource-post") +
      "/project/" +
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

  return httpClient(options).catch(handleApiError)
}

function handleApiError(err: Error | AxiosError) {
  // If the error is an AxiosError, we can try to extract the error message from the 
  // response and display it in the pipeline or just use the Axios error message
  if (axios.isAxiosError(err)) {

    if (err.response) {
      // Response is most likely a JSON encoded object
      if (err.response.data instanceof Object) {
        throw err.response.data.message;
      }

      // If it's a string it could also be some payload that axios didn't understand
      if (err.response.data instanceof String) {
        throw Error(`Recieved error from Keptn:\n${err.response.data}`)
      }
    }

    throw err.message
  } else {
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
