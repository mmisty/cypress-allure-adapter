import { COMMAND_REQUEST, CommandT, stringify } from '../common/command-names';
import { logClient } from './helper';
import { baseUrlFromUrl } from '../common';

type OneRequestConsoleProp = {
  'Request Body': unknown;
  'Request Headers': unknown;
  'Request URL': string;
  'Response Body'?: unknown;
  'Response Headers'?: unknown;
  'Response Status'?: number;
};

export const attachRequests = (
  dbg: string,
  allureAttachRequests: boolean,
  command: CommandT,
  opts: { compactAttachments: boolean },
) => {
  const debug = logClient(dbg);
  const maxParamLength = 70;
  const compact = opts.compactAttachments ?? true;
  const indent = compact ? undefined : ' ';
  debug(command);
  const logsAttr = command.attributes?.logs ?? [];
  const consoleProps = logsAttr.map(t => t.attributes?.consoleProps?.());
  debug('consoleProps:');
  debug(consoleProps);

  // t.Command for less than 13.x cypress
  const logs = consoleProps.filter(t => t.name === COMMAND_REQUEST || t.Command === COMMAND_REQUEST);

  const getRequests = (): OneRequestConsoleProp[] | undefined => {
    const logsMapped = logs.map(t => t.props ?? t); // support  cypress < 13.x

    if (logsMapped.every(t => !!t.Requests)) {
      // several requests if there are come redirects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return logsMapped.flatMap(t => t.Requests.map((x: any) => ({ ...x, duration: t.Yielded?.duration })));
    }

    if (logsMapped.every(t => !!t.Request)) {
      return logsMapped.map(t => ({ ...t.Request, duration: t.Yielded?.duration }));
    }

    return undefined;
  };

  const requests = getRequests();

  if (!requests) {
    return;
  }
  const allRequests = requests.filter(r => !!r);
  allRequests.forEach((req: OneRequestConsoleProp) => {
    const reqHeaders = { obj: req['Request Headers'], name: 'Request Headers' };
    const reqBody = { obj: req['Request Body'], name: 'Request Body' };
    const resHeaders = { obj: req['Response Headers'], name: 'Response Headers' };
    const resBody = { obj: req['Response Body'], name: 'Response Body' };
    const resStatusParam = { name: 'Response Status', value: `${req['Response Status'] ?? ''}` };
    const reqUrlParam = { name: 'Request URL', value: `${req['Request URL'] ?? ''}` };

    const stepUrl = reqUrlParam.value.replace(
      Cypress.config('baseUrl') ?? baseUrlFromUrl(Cypress.config('browserUrl') ?? '') ?? '',
      '',
    );
    const stepStatus = resStatusParam.value !== '200' ? 'broken' : 'passed';

    /*if (reqNumber === 0) {
      Cypress.Allure.parameters({ name: 'duration', value: req.duration });
    }*/

    if (allRequests.length > 1) {
      Cypress.Allure.startStep(`request: ${resStatusParam.value} ${stepUrl}`);
    }

    const attaches = [reqBody, reqHeaders, resBody, resHeaders].map(t => ({
      ...t,
      stringified: stringify(t.obj, true, indent),
    }));

    const shortAttaches = attaches.filter(a => a.stringified.length < maxParamLength);
    const longAttaches = attaches.filter(a => a.stringified.length >= maxParamLength);

    if (allRequests.length === 1) {
      Cypress.Allure.parameters(resStatusParam);
    }

    Cypress.Allure.parameters(reqUrlParam, ...shortAttaches.map(a => ({ name: a.name, value: a.stringified })));

    if (allureAttachRequests) {
      const requests: any = {};
      longAttaches
        .filter(t => !!t.obj)
        .forEach(attach => {
          requests[attach.name] = attach.obj;
        });
      Cypress.Allure.attachment('requests', stringify(requests, true, indent), 'application/json');
    }

    if (allRequests.length > 1) {
      Cypress.Allure.endStep(stepStatus);
    }
  });
};
