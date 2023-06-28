import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { tasks } from './tasks';

// this runs in node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const configureEnv = (on: PluginEvents, _config: PluginConfigOptions) => {
  // do setup with events and env, register tasks
  // register plugin events
  on('task', tasks);
};
