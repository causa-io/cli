# Causa CLI

This is the repository for the Causa CLI, `cs`. Causa provides, amongst others, development tools for mono-repositories ("workspaces"), meant to be used to manage several projects and their corresponding infrastructure. It uses a plugin system such that `cs` features can be tailored to each workspace's needs, depending on the programming languages and other technologies used.

Examples of features provided by Causa include:

- Building and pushing artefacts for projects (containers, serverless functions, etc).
- Managing and deploying the infrastructure for such project, in several environments.
- Managing evens and their topics in event-driven systems.

This document provides an overview of how to set up a Causa workspace and the CLI, as well as the core functionalities exposed by the CLI. This is not an exhaustive list, as other Causa modules provide additional language-specific and project type-specific features.

## ➕ Requirements

The Causa CLI requires [Node.js](https://nodejs.org/) and npm (which comes bundled with Node.js). We recommend installing Node.js using a version manager, such as [asdf](https://asdf-vm.com/) and its [nodejs](https://github.com/asdf-vm/asdf-nodejs) plugin.

## 🎉 Installation

Once Node.js and npm have been installed, the Causa CLI can be installed by running:

```bash
npm install -g @causa/cli
```

This will install the Causa CLI globally, and ensure the `cs` command is accessible in the `PATH`. However, note that Causa modules for each workspace are installed within the workspace and not globally. This makes each Causa workspace completely independent from one another.

The global installation of the CLI can be updated by running:

```bash
npm update -g @causa/cli
```

## 🔧 Configuration

### Base configuration

A Causa workspace is defined by a Causa configuration file at its root, containing at least the name of the workspace. Usually, it is in this same file that global configuration is defined, such as the dependencies on specific Causa modules:

```yaml
version: 1

workspace:
  name: my-workspace

causa:
  modules:
    '@causa/workspace-core': '>= 0.18.0 < 1.0.0'
```

Causa configuration files should be named `causa.yaml` and can optionally contain a dot-separated suffix, e.g. `causa.environments.yaml`. While several configuration files can coexist (they will be merged), a single one should define the `workspace.name`.

Module dependencies are expressed similarly to [`package.json` dependencies](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#dependencies) and use [semantic versioning](https://semver.org/).

Running the `cs` CLI in the workspace directory will create a `.causa` folder containing the installed Causa modules.

### Projects hierarchy

A workspace can contain one or several projects. The root of each project should contain a Causa configuration file which, similarly to the workspace, defines the project's name:

```yaml
project:
  name: my-project
  description: |-
    A project defining a business service written in TypeScript.
    It should be deployed as a container.
  language: typescript
  type: serviceContainer
```

A project could very well be defined at the workspace's root if it is the only project in it. However, it is more common to put projects in sub-folders, such as:

```
causa.yaml       # Defines `workspace.name`.
causa.other.yaml # Defines additional configuration at the workspace-level.

project-a/
↳ causa.yaml     # Defines `project.name: project-a`.

project-b/
↳ causa.yaml     # Defines `project.name: project-b`.
↳ causa.2.yaml   # Defines other project-specific configuration.
```

There is no limit to folder nesting. For example, projects could be grouped by team or domain, depending on the organization's hierarchy.

When running the `cs` command, the configuration used to perform operations is read from the current folder:

```bash
cs               # Running from the root of the workspace.
cs -w project-a/ # Running a command on project A.
cd project-a
cs               # Also running a command on project A.
```

### Configuration inheritance

The configuration values defined in the Causa files are inherited by configurations in sub-folders. Configuration files at the root of the workspace apply to all projects. Configurations files within a single project only apply to this project, and overwrite workspace-values as needed.

However note that:

- Configuration objects are merged, not replaced. If there are conflicting keys in the objects to merge, the value from the most nested configuration is kept (i.e. the one in the project).
- Configuration arrays are concatenated, not replaced.

### Environment configuration

There is a final degree of freedom when defining configurations: environments. In this context, environment is meant as "deployment environment", such as staging and production. Environment-specific configuration can be defined in any Causa file:

```yaml
environments:
  staging: # The ID of the environment, used in `cs` commands.
    name: Staging # A displayable name.
    configuration:
      myConf: some value # Will only be loaded when setting the environment to `staging`.
```

When running a `cs` command, the environment can be specified with the `-e` argument:

```bash
cs -w project-a/ -e staging
```

This will first load the entire configuration for project A (including the workspace configuration). Then, it will merge the `staging`-specific configuration in it. The content of the environment configuration may have been defined at the workspace level, at the project level, or both.

## ✨ Features

The features presented here are mainly provided by the `@causa/workspace-core` module. This module should be referenced in the Causa configuration. Depending on the technology stack used by an organization, it will probably be necessary to depend on other modules. These modules will provide tech stack-specific implementations of base features presented here, as well as additional functionalities.

### Project development

The entrypoint of the `cs` command for many developers will be the day-to-day operations, such as `cs build`.

#### `cs build`

This command builds _the artefact_ for the current project. This could be a ZIP archive for serverless functions, a Docker image for a containerized service, etc. While this operation may compile code if necessary, it does more by outputting an artefact ready to be pushed to some kind of registry.

Implementation is always language and/or project type-specific, so the corresponding Causa module should be depended upon.

#### `cs publish`

This commands builds the artefact for the current project, and pushes it to the configured registry. For example, this could upload a serverless functions archive to a remote storage, push a Docker image, publish an npm/python package, etc.

While this command combines `cs build` and a push step, the "push" implementation is often language and/or project type-specific, so the corresponding Causa module should be depended upon. An exception to this is pushing Docker images for `serviceContainer` projects, which is supported by the core module.

#### `cs model generateCode`

This commands generates code for the model (i.e. events and entities) used by the project.

Generating code is language-specific and will require the corresponding module. Some modules may provide more generators, such as test utilities for each event and entity in the model.

### Local tools

In addition to project development commands, developers will need to test their code locally. This section presents additional tools helping this process.

#### `cs emulators`

Testing usually requires mocks or in-memory versions of databases and other services. The `cs emulators start` and `cs emulators stop` commands manage local emulators of those services.

No emulator is provided by default as they are tech stack-specific. For example, the [google module](https://github.com/causa-io/workspace-module-google) will expose various GCP emulators.

The `cs emulators list` command returns the list of available emulators, loaded from the Causa modules.

### Documentation

One of the goals of Causa configuration files is also to provide metadata that can be used for documentation generation.

#### `cs openapi`

If some projects in the repository expose HTTP endpoints, the OpenAPI documentation for those endpoints can be generated using `cs openapi generateSpecification`.

The implementation of OpenAPI generation is language-specific and will required the corresponding Causa module.

When run from within a project, only the OpenAPI specification for the project will be generated. When run at the workspace level, the OpenAPI documents for all relevant projects will be generated and merged into a single document.

### Infrastructure and environments

One of the strengths of a Causa workspace is being able to manage the entire span of a production system. This includes deploying new features and bug fixes to staging environments for testing. This section presents infrastructure-related `cs` commands.

#### `cs infrastructure`

`cs infrastructure` commands are specific to the `infrastructure` `project.type`. A common language for infrastructure projects is `terraform`, for which support is implemented in the [terraform module](https://github.com/causa-io/workspace-module-terraform).

One can run `cs infrastructure prepare` in order to prepare a deployment of the current infrastructure project. The output of this operation is a plan.

The next step is to run `cs infrastructure deploy` with the prepared plan as an argument. This will effectively deploy the infrastructure changes.

One can note that although it is possible to call `cs infrastructure` with the `-e` (environment) argument, it is not required. Indeed, some infrastructure projects may not have several environments. However, as it is usually the case, the following section provides more details on this use case.

#### `cs environment`

`cs environment` commands also manage infrastructure, but the infrastructure specific to each deployment environment. As presented in the configuration section, several environments can be configured for a workspace. Additionally, a single project can be set as the project defining the infrastructure for environments:

```yaml
infrastructure:
  environmentProject: path/to/infrastructure/project # Relative to the workspace's root.
```

When calling `cs environment prepare` and `cs environment deploy`, the same operations as the `infrastructure` commands will be run, but on the "environment project". Also in this case the `-e <environment>` argument is required.
