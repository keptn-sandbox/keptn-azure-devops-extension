# How to Develop this extension

## Pre-Requesits
First of all, you need NodeJS installed locally (preferred version for Azure DevOps Pipeline extensions is NodeJS 10).

## Repo Structure

This repo contains multiple tasks! Each one of them is bundled into the extension.

## Setup

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

