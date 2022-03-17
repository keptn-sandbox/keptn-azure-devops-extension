# Releasing

A new version of the Azure DevOps Cloud Automation Integration powered by Keptn
is released as needed when there are fixes and features ready.

## Versioning

The versioning of the Azure DevOps Cloud Automation Integration powered by
Keptn loosely follows [semver](https://semver.org/) due to some [constraints](#versioning-constraints)
imposed by Visual Studio Marketplace publishing process so there are small
differences between [release](#release-versioning) and [prerelease](#pre-release-versioning) version format.


### Versioning constraints

#### Extension versioning
As stated in [Microsoft documentation about publishing
extensions](https://docs.microsoft.com/en-us/azure/devops/extend/publish/overview?view=azure-devops#package-your-extension-in-a-vsix-file)

> An extension/integration's version must be incremented on every update.

This means that we cannot publish a version of the extension that is preceding
the last published one. Furthermore, installed extensions are updated
automatically by `Azure DevOps Service` so users that install this extension
from the Visual Studio marketplace may not have the option of running a
specific version older than the latest.

In order to work under such constraints Microsoft recommends in their
[documentation](https://docs.microsoft.com/en-us/azure/devops/extend/publish/overview?view=azure-devops#update-an-extension)
to use two extensions:
- a private `dev` one for validation before releasing publicly
- a public `production` version that can be installed by users

For the Azure DevOps Cloud Automation Integration powered by Keptn we map
different type of releases in this way:
- **Pre-Release** workflow will publish an update for the `dev` extension
- **Release** workflow will publish an update for the `production`extension

Backwards compatibility is achieved by [bundling multiple task versions](https://docs.microsoft.com/en-us/azure/devops/extend/develop/integrate-build-task?view=azure-devops#bundle-multiple-versions-of-buildrelease-tasks-within-one-extension)
in the extension and maintaining [task versions](#task-versioning) separately
from the overall extension version.

### Release versioning
Every release version number consists of three parts (x.y.z) that
have a different meaning and describe the type of change this version
introduces.

- **Patch:** (x.y.**z**): A patch version only includes fixes and small patches.
- **Minor:** (x.**y**.z): A minor version includes new features that do **NOT**
  introduce a breaking change.
- **Major:** (**x**.y.z): A major version is the only version that can contain
  breaking changes.

Version numbers will be calculated based on commit messages. For that purpose
please refer to [conventional
commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) to correctly
categorize changes for the next version number.

### Pre-release versioning
Prereleases will add an additional version identifier in the format of
x.y.z.**p** where the first three version numbers follow the same convention
as [releases](#release-versioning) and the last version number identifies a pre-release
among all pre-releases based on the same release.

### Task versioning
Azure DevOps extension's [tasks are versioned](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/tasks?view=azure-devops&tabs=yaml#task-versions)
independently from the extension itself.
Each task has its own manifest file in `task.json` within the task directory
where the version information of the task is represented using
[semver](https://semver.org/), for example:
```
"version": {
    "Major": 2,
    "Minor": 0,
    "Patch": 0
  },
```
Steps used in Azure DevOps pipeline have a reference to the major version of
tasks under the assumption that all versions of a task with the same major
version are backward-compatible and will not be automatically bumped to a newer
major version.

Task versions **must** be increased when developing features or fixing issues.
In case of breaking changes to a task we need to duplicate the task files in a
new directory on disk, increase the major version both in the directory name
and `task.json` file and then implement the breaking change in the new version.

## How to release

### Typical case: create a new version based on latest release

New versions are created using `Pre-Release` and `Release` workflows available
in the [`Actions`
tab](https://github.com/keptn-sandbox/keptn-azure-devops-extension/actions) on
GitHub.
The worflows will take care of calculating the next version number and create a
GitHub release depending on the type of changes introduced.

Workflows must be run on the appropriate branch (`master`/`main` should be the
normal case, for special cases see the next section).

It is advised to create at least a `Pre-Release` to use the `dev` extension for
validation before releasing the `production` version.

After running the `Pre-Release` workflow a new GitHub prerelease will have been
created and the `dev` extension will have been published in Visual Studio
Marketplace.

If validation of the prereleased version is successful, run the `Release`
workflow on the tag created for the pre-release to be sure to release the same
version of the code.

**Note:** Public extensions versions cannot be removed from the marketplace if
there has been at least 1 install (they can be
[unpublished](https://docs.microsoft.com/en-us/azure/devops/extend/publish/overview?view=azure-devops#unpublish-an-extension)
though) so keep that in mind when releasing (no take-backsies ;) ).


A new GitHub Release will be created as a draft and a Pull Request will be
opened describing the changes in [CHANGELOG.md](CHANGELOG.md) while the
`production` extension will be published on Visual Studio Marketplace using
the dynatrace publisher.

### Special cases: bugfixing for old versions

Since there's no possiblity to choose the extension version when installing
from the marketplace, the only viable strategy is to roll forward the extension
for all users (this removes the need for hotfixes).
Fixes however must be propagated to all impacted task versions and (by
definition) **must not** introduce breaking changes.

As an example, given the extension:

```
some_extension
├── manifest.json <-- extension version 1.3.6
├── SomeOtherTask
│   └── SomeOtherTaskV1
│       └── task.json <-- SomeOtherTask version 1.2.3
└── SomeTask
    ├── SomeTaskV1
    │   └── task.json <-- SomeTask version 1.10.5
    ├── SomeTaskV2
    │   └── task.json <-- SomeTask version 2.1.3
    └── SomeTaskV3
        └── task.json <-- SomeTask version 3.0.4
```

if some issue is affecting SomeTaskV2 and SomeTaskV3 but not SomeTaskV1 a new
release that contains only the fix might be:

```
some_extension
├── manifest.json <-- extension version 1.3.7
├── SomeOtherTask
│   └── SomeOtherTaskV1
│       └── task.json <-- SomeOtherTask version 1.2.3
└── SomeTask
    ├── SomeTaskV1
    │   └── task.json <-- SomeTask version 1.10.5
    ├── SomeTaskV2
    │   └── task.json <-- SomeTask version 2.1.4
    └── SomeTaskV3
        └── task.json <-- SomeTask version 3.0.5
```
with the following changes:
- extension version has been incremented (patch version only in this example
  since it contains only bugfixes compared to 1.3.6)
- SomeOtherTaskV1 and SomeTaskV1 versions are unchanged since the tasks are the
  same as before the fix
- SomeTaskV2 and SomeTaskV3 have their patch version incremented since they now
  contain the fix for the issue

It's important to be consistent in backporting fixes in all the affected task
versions and updating manually the respective task versions when performing
changes to the code.
As already mentioned the new extension version will be generated when running
the workflows according to the type of changes included since the previous
release.
