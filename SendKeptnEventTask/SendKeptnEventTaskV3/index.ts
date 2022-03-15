import tl = require('azure-pipelines-task-lib/task');
import axios, { Method, AxiosInstance } from 'axios';
import moment from 'moment-timezone';
import https = require('https');

class EvalParams {
	start: string | undefined;
	end: string | undefined;
	timeframe: string | undefined;
}

class DeliveryParams {
	image: string | undefined;
	sequence: string = "delivery"; //Smart Default
	deploymentURI: string | undefined;
	deploymentStrategy: string | undefined;
}

class GenericParams {
	body: string | undefined;
}

class Params {
	eventType: string = '';
	project: string = '';
	service: string = '';
	stage: string = '';
	keptnApiEndpoint: string = '';
	keptnApiToken: string = '';
	keptnContextVar: string = '';
	evaluationParams: EvalParams | undefined;
	deliveryParams: DeliveryParams | undefined;
	genericParams: GenericParams | undefined;
}

/**
 * Prepare input parameters
 */
function prepare(): Params | undefined {
  try {
    let p = new Params();
    let badInput: string[] = [];

    p.project = getKeptnSettingVariable("project", badInput);
    p.stage = getKeptnSettingVariable("stage", badInput);
    p.service = getKeptnSettingVariable("service", badInput);

    let eventType: string | undefined = tl.getInput("eventType");
    if (eventType !== undefined) {
      p.eventType = eventType;
    } else {
      badInput.push("eventType");
    }

    let keptnApiEndpointConn: string | undefined =
      tl.getInput("keptnApiEndpoint");
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
    const keptnContextVar: string | undefined = tl.getInput("keptnContextVar");
    if (keptnContextVar != undefined) {
      p.keptnContextVar = keptnContextVar;
    } else {
      badInput.push("keptnContextVar");
    }

    console.log("using keptnApiEndpoint", p.keptnApiEndpoint);
    console.log("using eventType", p.eventType);
    console.log("using project", p.project);
    console.log("using service", p.service);
    console.log("using stage", p.stage);
    console.log("using keptnContextVar", p.keptnContextVar);

    if (p.eventType == "startEvaluation") {
      let pe = new EvalParams();
      const start: string | undefined = tl.getInput("start");
      if (start != undefined) {
        pe.start = start;
      }
      const end: string | undefined = tl.getInput("end");
      if (end != undefined) {
        pe.end = end;
      }
      const timeframe: string | undefined = tl.getInput("timeframe");
      if (timeframe != undefined) {
        pe.timeframe = timeframe;
      }
      if (
        pe.start == undefined &&
        pe.end == undefined &&
        pe.timeframe == undefined
      ) {
        pe.timeframe = "30m";
      }
      p.evaluationParams = pe;
      console.log("using start", start);
      console.log("using end", end);
      console.log("using timeframe", timeframe);
    } else if (p.eventType == "delivery") {
      let dc = new DeliveryParams();
      const sequence: string | undefined = tl.getInput("sequence");
      if (sequence != undefined) {
        dc.sequence = sequence;
      }
      const image: string | undefined = tl.getInput("image");
      if (image != undefined) {
        dc.image = image;
      }
      const deploymentURI: string | undefined = tl.getInput("deploymentURI");
      if (deploymentURI != undefined) {
        dc.deploymentURI = deploymentURI;
      }
      const deploymentStrategy: string | undefined =
        tl.getInput("deploymentStrategy");
      if (deploymentStrategy != undefined) {
        dc.deploymentStrategy = deploymentStrategy;
      }

      p.deliveryParams = dc;
      console.log("using sequence", sequence);
      console.log("using image", image);
      console.log("using deploymentURI", deploymentURI);
      console.log("using deploymentStrategy", deploymentStrategy);
    } else if (p.eventType == "generic") {
      let gc = new GenericParams();
      const body: string | undefined = tl.getInput("body");
      if (body != undefined) {
        gc.body = body;
      }

      p.genericParams = gc;
      console.log("using body", body);
    }

    if (badInput.length > 0) {
      tl.setResult(
        tl.TaskResult.Failed,
        "missing required input (" + badInput.join(",") + ")"
      );
      return;
    }
    return p;
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

/**
 *
 * @param variable
 * @param badInput
 */
function getKeptnSettingVariable(variable: string, badInput: string[]): string {
  let value: string | undefined = tl.getInput(variable);
  if (value !== undefined) {
    return value;
  } else {
    let v: string | undefined = tl.getVariable("PrepareKeptnEnv_" + variable);
    if (v !== undefined) {
      return v;
    }
    badInput.push(variable);
  }
  return "";
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

    if (
      input.eventType == "startEvaluation" &&
      input.evaluationParams != undefined
    ) {
      let keptnContext = await triggerEvaluation(input, axiosInstance);
      return keptnContext;
    } else if (
      input.eventType == "delivery" &&
      input.deliveryParams != undefined
    ) {
      let keptnContext = await triggerDelivery(input, axiosInstance);
      return keptnContext;
    } else if (
      input.eventType == "generic" &&
      input.genericParams != undefined
    ) {
      let keptnContext = await triggerGeneric(input, axiosInstance);
      return keptnContext;
    } else {
      throw new Error("Unsupported eventType");
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Send the start-evaluation event based on the input parameters
 *
 * @param input Parameters
 * @param httpClient an instance of axios
 */
async function triggerEvaluation(input: Params, httpClient: AxiosInstance) {
  let options: any = {
    method: <Method>"POST",
    url: input.keptnApiEndpoint + getAPIFor("event-post") + "/event",
    headers: { "x-token": input.keptnApiToken },
  };

  options.url =
    input.keptnApiEndpoint +
    getAPIFor("project-post") +
    "/project/" +
    input.project +
    "/stage/" +
    input.stage +
    "/service/" +
    input.service +
    "/evaluation";
  let body: any = {
    labels: parseLabels(),
  };
  if (
    input.evaluationParams != undefined &&
    input.evaluationParams.start != undefined
  ) {
    body.start = input.evaluationParams.start;
  }
  if (
    input.evaluationParams != undefined &&
    input.evaluationParams.end != undefined
  ) {
    body.end = input.evaluationParams.end;
  }
  if (
    input.evaluationParams != undefined &&
    input.evaluationParams.timeframe != undefined
  ) {
    body.timeframe = input.evaluationParams.timeframe;
  }

  options.data = body;

  console.log("sending startEvaluation event ...");
  console.log(options.data);
  let response = await httpClient(options);
  return storeKeptnContext(input, response);
}

/**
 * Send the delivery triggered event based on the input parameters
 *
 * @param input Parameters
 * @param httpClient an instance of axios
 */
async function triggerDelivery(input: Params, httpClient: AxiosInstance) {
  let options: any = {
    method: <Method>"POST",
    url: input.keptnApiEndpoint + "/v1/event",
    headers: { "x-token": input.keptnApiToken },
    data: {
      type:
        "sh.keptn.event." +
        input.stage +
        "." +
        input.deliveryParams?.sequence +
        ".triggered",
      source: "azure-devops-plugin",
      specversion: "1.0",
      data: {
        project: input.project,
        service: input.service,
        stage: input.stage,
        configurationChange: null,
        deployment: {
          deploymentURIsLocal: null,
          deploymentstrategy: "",
        },
        labels: parseLabels(),
      },
    },
  };

  if (input.deliveryParams != undefined) {
    let dp: DeliveryParams = input.deliveryParams;
    if (dp.image != undefined) {
      let cc = {
        values: {
          image: dp.image,
        },
      };
      options.data.data.configurationChange = cc;
    }
    if (dp.deploymentURI != undefined) {
      options.data.data.deployment.deploymentURIsLocal = dp.deploymentURI;
    }
    if (dp.deploymentStrategy != undefined) {
      options.data.data.deployment.deploymentStrategy = dp.deploymentStrategy;
    }
  }

  console.log("sending delivery triggered event ...");
  let response = await httpClient(options);
  return storeKeptnContext(input, response);
}

/**
 * Send a generic triggered event based on the input parameters
 *
 * @param input Parameters
 * @param httpClient an instance of axios
 */
async function triggerGeneric(input: Params, httpClient: AxiosInstance) {
  let options: any = {
    method: <Method>"POST",
    url: input.keptnApiEndpoint + "/v1/event",
    headers: { "x-token": input.keptnApiToken },
    data: {
      type:
        "sh.keptn.event." +
        input.stage +
        "." +
        (input.deliveryParams != undefined
          ? input.deliveryParams.sequence
          : "delivery") +
        ".triggered",
      source: "azure-devops-plugin",
      specversion: "1.0",
    },
  };
  if (
    input.genericParams != undefined &&
    input.genericParams.body != undefined
  ) {
    options.data.data = JSON.parse(input.genericParams.body);
  }

  console.log("sending generic event ...");
  let response = await httpClient(options);
  return storeKeptnContext(input, response);
}

function getAPIFor(apiType: string) {
  if (apiType.startsWith("project")) {
    return "/controlPlane/v1";
  } else if (apiType.startsWith("event")) {
    return "/v1";
  }
  return "/unknown-api";
}

/**
 * Helper function to parse the labels
 */
function parseLabels(): any {
  let labels: any = {};
  if (tl.getVariable("Build.BuildNumber") != undefined) {
    labels["buildId"] = tl.getVariable("Build.BuildNumber");
  }
  if (tl.getVariable("Release.DefinitionName") != undefined) {
    labels["definition"] = tl.getVariable("Release.DefinitionName");
  }
  if (tl.getVariable("Build.QueuedBy") != undefined) {
    labels["runby"] = tl.getVariable("Build.QueuedBy");
  }
  if (tl.getVariable("Release.EnvironmentName") != undefined) {
    labels["environment"] = tl.getVariable("Release.EnvironmentName");
  }
  if (tl.getVariable("Release.ReleaseWebURL") != undefined) {
    labels["pipeline"] = tl.getVariable("Release.ReleaseWebURL");
  }

  const labelsConfig: string | undefined = tl.getInput("labels");
  if (labelsConfig != undefined && labelsConfig.trim().length > 0) {
    let aLabelsConfig = labelsConfig.trim().split(/\r?\n/);
    aLabelsConfig.forEach(function (pair) {
      let aPair = pair.split(":");
      if (aPair.length >= 2) {
        labels[aPair[0].trim()] = aPair[1].trim();
      }
    });
  }

  return labels;
}
export { parseLabels as parseLabels };

function storeKeptnContext(input: Params, response: any) {
  if (input.keptnContextVar != undefined) {
    tl.setVariable(input.keptnContextVar, response.data.keptnContext);
    return (
      "stored " +
      response.data.keptnContext +
      " in variable " +
      input.keptnContextVar
    );
  } else {
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
