# How to Develop this extension

## Pre-Requesits
First of all, you need NodeJS installed locally (preferred version for Azure DevOps Pipeline extensions is NodeJS 10).

## Repo Structure

This repo contains multiple tasks! Each one of them is bundled into the extension.

## Setup

**Important:** the setup has been tested using node 14 LTS. If you use a different node version stuff may break!

Install typescript compiler (4.0.2 is the [version recommended by Microsoft](https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops#prerequisites)
```
npm install typescript@4.0.2 -g --save-dev
```

In the main directory run
```
npm install
```

## Clean, Build, Test (CBT)

**Note:** at the time of writing, existing tests are flaky, please proceed with caution

In the main directory, run
```
npm run cbt
```
which will clean the repo, build (transpile) the code, and test it. Alternatively, you can those steps on your own:

```
npm run clean

npm run build

npm run test-prep
npm run test-send
npm run test-wait
npm run test-addr
```

# Test the extension

## Create Private Dev VSIX Package

**Important**: You need to run `npm run build` before you build the package!

In the main directory, run
```
npm run package-dev
```
**Note**: See [manifest.js](manifest.js) section for configuration

## Create Public Release VSIX Package

**Important**: You need to run `npm run build` before you build the package!

In the main directory, run
```
npm run package
```
**Note**: See [manifest.js](manifest.js) section for configuration


## Publish private or public release

**Important**: You need to run `npm run build` before you publish the package!

There are 2 npm scripts `publish-dev` and `publish` that will package and publish
the extension ( private and public respectively) in a single command provided that
a personal access token is passed in env variable `AZDO_PUBTOKEN`, so:
- To publish a private version of the extension
```
AZDO_PUBTOKEN=<your token goes here> npm run publish-dev
```
- To publish a public version fo the extension
```
AZDO_PUBTOKEN=<your token goes here> npm run publish
```
