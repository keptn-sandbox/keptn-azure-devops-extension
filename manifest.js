module.exports = (env) => {
	let [idPostfix, namePostfix, isPublic] = (env.mode == "development") ? ["-dev", " [DEV]", false] : ["", "", true];
    let version = (env.version != undefined) ? env.version : "1.5.0";

	let manifest = {
		"manifestVersion": 1,
		"id": `cloud-automation-integration${idPostfix}`,
		"version": version,
		"name": `Cloud Automation Integration ${namePostfix}`,
		"description": "Integration of Cloud Automation powered by Keptn within your build or release pipeline.",
		"publisher": "dynatrace",
		"public": isPublic,
		"targets": [{
		  "id": "Microsoft.VisualStudio.Services"
		}],
		"icons": {
		  "default": "images/logo.png"
		},
		"scopes": [
		  "vso.build_execute",
		  "vso.release_execute"
		],
		"categories": [
		  "Azure Pipelines"
		],
		"content": {
		  "details": {
			"path": "README.md"
		  }
		},
		"repository": {
		  "type": "git",
		  "uri": "https://github.com/keptn-sandbox/keptn-azure-devops-extension"
		},
		"contributions": [
		  {
			"id": "service-endpoint",
			"description": "Service Endpoint type for Keptn",
			"type": "ms.vss-endpoint.service-endpoint-type",
			"targets": [ "ms.vss-endpoint.endpoint-types" ],
			"properties": {
			  "name": "Keptn-Api-Endpoint",
			  "displayName": "Keptn",
			  "url": {
				"displayName": "Keptn API Url",
				"helpText": "Url pointing to the Keptn REST API."
			  },
			  "authenticationSchemes": [
				{
				  "type": "ms.vss-endpoint.endpoint-auth-scheme-token"
				}
			  ],
			  "helpMarkDown": "<a href=\"https://github.com/keptn-sandbox/keptn-azure-devops-extension\" target=\"_blank\"><b>Learn More</b></a>"
			}
		  },
		  {
			"id": "prep-keptn-env",
			"description": "Prepare Keptn environment",
			"type": "ms.vss-distributed-task.task",
			"targets": [ "ms.vss-distributed-task.tasks" ],
			"properties": {
			  "name": "PrepareKeptnEnvTask"
			}
		  },
		  {
			"id": "send-keptn-event",
			"description": "Send an event to Keptn",
			"type": "ms.vss-distributed-task.task",
			"targets": [ "ms.vss-distributed-task.tasks" ],
			"properties": {
			  "name": "SendKeptnEventTask"
			}
		  },
		  {
			"id": "waitfor-keptn-event",
			"description": "Wait for an event from Keptn",
			"type": "ms.vss-distributed-task.task",
			"targets": [ "ms.vss-distributed-task.tasks" ],
			"properties": {
			  "name": "WaitForKeptnEventTask"
			}
		  },
		  {
			"id": "add-keptn-resource",
			"description": "Add a resource to Keptn",
			"type": "ms.vss-distributed-task.task",
			"targets": [ "ms.vss-distributed-task.tasks" ],
			"properties": {
			  "name": "AddKeptnResourceTask"
			}
		  }
		],
		"files": [
		  {
			"path": "images", "addressable": true
		  },
		  {
			"path": "screenshots", "addressable": true
		  },
		  {
			"path": "PrepareKeptnEnvTask"
		  },
		  {
			"path": "SendKeptnEventTask"
		  },
		  {
			"path": "WaitForKeptnEventTask"
		  },
		  {
			"path": "AddKeptnResourceTask"
		  }
		]
	  }

	return manifest;
}