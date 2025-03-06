# Shared Tree Demo

This app demonstrates how to create a simple tree data structure and build a React app using that data.

## Setting up the Fluid Framework

This app is designed to use
[Azure Fluid Relay](https://aka.ms/azurefluidrelay) a Fluid relay service offered by Microsoft. You can also run a local service for development purposes. Instructions on how to set up a Fluid relay are on the [Fluid Framework website](https://aka.ms/fluid).

To use AzureClient's local mode, you first need to start a local server.

TODO: fix that selection doesn't work when disconnected.

```bash
npm run start:server
```

Running this command from your terminal window will launch the Azure Fluid Relay local server. Once the server is started, you can run your application against the local service.

```bash
npm run start
```

This command starts the webpack development server, which will make the application available at [http://localhost:8080/](http://localhost:8080/).

One important note is that you will need to use a token provider or, purely for testing and development, use the insecure token provider. There are instructions on how to set this up on the [Fluid Framework website](https://aka.ms/fluid).

All the code required to set up the Fluid Framework and SharedTree data structure is in the infra folder. Most of this code will be the same for any app.

## Schema Definition

The SharedTree schema is defined in the \_schema.ts source files. This schema is passed into the SharedTree when it is initialized in index.tsx. For more details, see the schema.ts comments.

## Working with Data

Working with data in the SharedTree is very simple; however, working with distributed data is always a little more complicated than working with local data. To isolate this complexity, this app uses a set of helper functions in the \_helpers.ts source files and in the schema itself that take types defined in the schema as input and modify the data in some way. Each function includes a brief description of how it works.

One important note about managing local state and events: ideally, in any app you write, it is best to not
special case local changes. Treat the SharedTree as your local data and rely on tree events to update your view. This makes the code reliable and easy to maintain. Also, never mutate tree nodes within events listeners.

## User Interface

This app is built using React. Changes to the data are handled using the helper functions mentioned above. If you look at the code in \*ux.tsx files, you'll find very little code that is unique to an app built with the Fluid Framework. If you want to change the css you must run 'npx tailwindcss -i ./src/index.css -o ./src/output.css --watch' in the root folder of your project so that tailwind can update the output.css file.

### Invalidation

SharedTree's TreeNodes are mutable objects which can be edited locally, but also edited by remote clients: this can be challenging to make work with tools like React.
To know when changes occur, this application subscribes to events.
This is mostly done using the [`nodeChanged`](https://fluidframework.com/docs/api/fluid-framework/treechangeevents-interface#nodechanged-methodsignature) and [`treeChanged`](https://fluidframework.com/docs/api/fluid-framework/treechangeevents-interface#treechanged-methodsignature) events.
These are hooked into React by using React's [`useState` hook](https://react.dev/reference/react/useState) to produce a state variable and a setter callback which is then hooked up to the SharedTree events.
This must be done in such a way that the event registrations are not leaked (using `useEffect` to register and unregister) and such that they observe any edit that could impact the content of the React component reading the tree.

This application follows the pattern where each React component is responsible for its own invalidation for changes to any data it reads out of the TreeNodes passed into or closed over by it.

TODO: Tree or this application should provide some easier to use APIs or patterns for this, likely in the form of some utility methods and/or tools to facilitate alternative design patterns (like generating copy on write objects from trees).

## Devtools

This sample application is configured to leverage the Fluid Framework's [Developer Tooling](https://fluidframework.com/docs/testing/devtools/).

Refer to the above article for examples and usage instructions.

## Building and Running

You can use the following npm scripts (`npm run SCRIPT-NAME`) to build and run the app.

<!-- AUTO-GENERATED-CONTENT:START (SCRIPTS) -->

| Script      | Description                                                                           |
| ----------- | ------------------------------------------------------------------------------------- |
| `build`     | `npm run format && npm run webpack`                                                   |
| `compile`   | Compile the TypeScript source code to JavaScript.                                     |
| `dev`       | Runs the app in webpack-dev-server. Expects local-azure-service running on port 7070. |
| `dev:azure` | Runs the app in webpack-dev-server using the Azure Fluid Relay config.                |
| `format`    | Format source code using Prettier.                                                    |
| `lint`      | Lint source code using ESLint                                                         |
| `webpack`   | `webpack`                                                                             |
| `start`     | `npm run dev`                                                                         |

<!-- AUTO-GENERATED-CONTENT:END -->
