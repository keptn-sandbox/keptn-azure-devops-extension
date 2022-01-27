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

Then run
```
npm run install-all
```

which will go to each task directory and install dependencies there.

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
**Note**: See config.json `dev` section for configuration

Finally, publish the extension in your Visual Studio Marketplace (use your Dev publisher).

## Create Public Release VSIX Package

**Important**: You need to run `npm run build` before you build the package!

In the main directory, run
```
npm run package
```
**Note**: See config.json `public` section for configuration

Finally, publish the extension in your Visual Studio Marketplace.

