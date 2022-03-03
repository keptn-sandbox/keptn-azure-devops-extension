function addTaskToContribution(
  contributions,
  taskId,
  taskName,
  taskDescription
) {
  contributions.push({
    id: taskId,
    description: taskDescription,
    type: "ms.vss-distributed-task.task",
    targets: ["ms.vss-distributed-task.tasks"],
    properties: {
      name: taskName,
    },
  });
}

function addPathToFileContributions(
  fileContributions,
  depPath,
  taskPath,
  packagedTaskPath
) {
  if (packagedTaskPath == undefined || packagedTaskPath === "") {
    packagedTaskPath = taskPath;
  }

  taskObj = {
    path: taskPath,
    packagePath: packagedTaskPath,
  };

  fileContributions.push(
    {
      path: depPath,
      packagePath: packagedTaskPath,
    },
    taskObj
  );
}

module.exports = (env) => {
  let [idPostfix, namePostfix, isPublic] =
    env.mode == "development" ? ["-dev", " [DEV]", false] : ["", "", true];
  let version = env.version != undefined ? env.version : "1.5.0";

  let manifest = {
    manifestVersion: 1,
    id: `cloud-automation-integration${idPostfix}`,
    version: version,
    name: `Cloud Automation Integration ${namePostfix}`,
    description:
      "Integration of Cloud Automation powered by Keptn within your build or release pipeline.",
    publisher: "dynatrace",
    public: isPublic,
    targets: [
      {
        id: "Microsoft.VisualStudio.Services",
      },
    ],
    icons: {
      default: "images/logo.png",
    },
    scopes: ["vso.build_execute", "vso.release_execute"],
    categories: ["Azure Pipelines"],
    content: {
      details: {
        path: "README.md",
      },
    },
    repository: {
      type: "git",
      uri: "https://github.com/keptn-sandbox/keptn-azure-devops-extension",
    },
    contributions: [
      {
        id: "service-endpoint",
        description: "Service Endpoint type for Keptn",
        type: "ms.vss-endpoint.service-endpoint-type",
        targets: ["ms.vss-endpoint.endpoint-types"],
        properties: {
          name: "Keptn-Api-Endpoint",
          displayName: "Keptn",
          url: {
            displayName: "Keptn API Url",
            helpText: "Url pointing to the Keptn REST API.",
          },
          authenticationSchemes: [
            {
              type: "ms.vss-endpoint.endpoint-auth-scheme-token",
            },
          ],
          helpMarkDown:
            '<a href="https://github.com/keptn-sandbox/keptn-azure-devops-extension" target="_blank"><b>Learn More</b></a>',
        },
      },
    ],
    files: [
      {
        path: "images",
        addressable: true,
      },
      {
        path: "screenshots",
        addressable: true,
      },
    ],
  };

  addTaskToContribution(
    manifest.contributions,
    "add-keptn-resource",
    "AddResourceTask",
    "Add a resource to Keptn"
  );
  addPathToFileContributions(
    manifest.files,
    "dist",
    "AddResourceTask/AddResourceTaskV1"
  );

  addTaskToContribution(
    manifest.contributions,
    "prep-keptn-env",
    "SetupProjectTask",
    "Setup Keptn project environment"
  );
  addPathToFileContributions(
    manifest.files,
    "dist",
    "SetupProjectTask/SetupProjectTaskV2"
  );

  addTaskToContribution(
    manifest.contributions,
    "send-keptn-event",
    "SendEventTask",
    "Send an event to Keptn"
  );
  addPathToFileContributions(
    manifest.files,
    "dist",
    "SendEventTask/SendEventTaskV3"
  );

  addTaskToContribution(
    manifest.contributions,
    "waitfor-keptn-event",
    "WaitForEventTask",
    "Wait for a Keptn event"
  );
  addPathToFileContributions(
    manifest.files,
    "dist",
    "WaitForEventTask/WaitForEventTaskV2"
  );

  return manifest;
};
