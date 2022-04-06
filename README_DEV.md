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

# Modifying tasks
In order to avoid issues with Azure devops caching, changes to tasks MUST be accompanied to changes to the task version
following the guidelines in [Task versioning section of release process](RELEASE.md#task-versioning)

## Bumping task versions manually

### Option 1: modify task.json as part of the normal development process
Simply change the minor/patch version in task.json when performing changes (beware of conflicts if someone else is working in parallel on the same task)

### Option 2: use npm scripts
We can bump the **patch** version of a task by running `npm run task:bump`, for example
```
npm run task:bump AddKeptnResourceTask/AddKeptnResourceTaskV1/task.json
```

We can bump the **minor** version of a task by running for example
```
npm run task:bump -- --type  minor AddKeptnResourceTask/AddKeptnResourceTaskV1/task.json
```

If we want to bump **all** tasks patch versions we have a shortcut (note that we use **tasks** as prefix here)
```
npm run tasks:bump
```

## Bumping task versions using a git precommit hook

In this repo we also have a [bash script](git-hooks/pre-commit-hook.sh) that can be used as [git hook](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) normally for pre-commit.

The script will check if there are changes staged for commit for a task without including a modified `task.json` and automatically bump the patch version
and add task.json to the commit

You can install the hook by copying it to the `hooks` directory with the appropriate name and making it executable
```
cp ./git-hooks/pre-commit-hook.sh ./.git/hooks/pre-commit && chmod +x ./.git/hooks/pre-commit
```



# Test the extension

## Create Private Dev VSIX Package

**Important**: You need to run `npm run build` before you build the package!

In the main directory, run
```
AZDO_EXT_VERSION=<your version> npm run package-dev
```
**Note**: See [manifest.js](manifest.js) section for configuration

## Create Public Release VSIX Package

**Important**: You need to run `npm run build` before you build the package!

In the main directory, run
```
AZDO_EXT_VERSION=<your version> npm run package
```
**Note**: See [manifest.js](manifest.js) section for configuration


## Publish private or public release

**Important**: You need to run `npm run build` before you publish the package!

There are 2 npm scripts `publish-dev` and `publish` that will package and publish
the extension ( private and public respectively) in a single command provided that
a personal access token is passed in env variable `AZDO_PUBTOKEN`, so:
- To publish a private version of the extension
```
AZDO_EXT_VERSION=<your version> AZDO_PUBTOKEN=<your token goes here> npm run publish-dev
```
- To publish a public version fo the extension
```
AZDO_EXT_VERSION=<your version> AZDO_PUBTOKEN=<your token goes here> npm run publish
```
