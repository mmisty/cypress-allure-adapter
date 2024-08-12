import { ExecutableItem } from 'allure-js-commons';

export type CypressDataStub = {
  browserRequestId?: string;
  statusCode?: number;
  data?: {
    headers?: any;
    body?: any;
    method?: string;
    query?: any;
    resourceType?: string;
    statusCode?: number;
    url?: string;
  };
};

export type CypressDataRequest = {
  requestId: string;
  headers?: any;
  body?: any;
  method?: string;
  url: string;
  resourceType?: string;
};

export type FullRequest = { id: string; request: CypressDataRequest; response: CypressDataStub; started: number };

export const convertToRequestsResponse = (data: FullRequest): Cypress.RequestEvent => {
  const url = data.request.url;
  const method = data.request.method;
  const status = data.response?.data?.statusCode ?? data.response?.statusCode;

  const ended = Date.now(),
    duration = ended - data.started;

  const res: Cypress.RequestEvent = {
    method: method,
    isFromCypress: false,
    url,
    requestHeaders: data.request.headers,
    requestBody: data.request.body,
    status: status,
    responseHeaders: data.response?.data?.headers,
    responseBody: data.response?.data?.body,
    message: `${method} ${status} ${url}`,

    requestStarted: data.started,
    requestEnded: ended,
    duration: duration,
  };

  return res;
};

export const convertToRequestsIncoming = (data: CypressDataRequest): Partial<Cypress.RequestEvent> => {
  const url = data.url;
  const method = data.method;
  const status = undefined;

  const res: Cypress.RequestEvent = {
    method: method,
    isFromCypress: false,
    url,
    requestHeaders: data.headers,
    requestBody: undefined, // todo
    status: status,
    responseHeaders: undefined,
    responseBody: undefined,
    message: `${method} ${status} ${url}`,
    requestStarted: Date.now(),
  };

  return res;
};

/**
 * Recursively merge the steps by removing a step if it has the same name as the parent,
 * while keeping its children.
 * @param steps
 */
export function mergeStepsWithName(stepName: string, steps: ExecutableItem[]): void {
  function mergeSteps(step: ExecutableItem): ExecutableItem {
    if (!step.steps || step.steps.length === 0) {
      return step;
    }

    step.steps = step.steps.map(mergeSteps);

    // Remove the step if it has the same name as the parent, but keep its children
    if (step.steps.length > 0 && step.steps[0].name === stepName) {
      const childSteps = step.steps[0].steps;
      step.steps.shift();
      step.steps.unshift(...childSteps);
    }

    return step;
  }

  for (let i = 0; i < steps.length; i++) {
    steps[i] = mergeSteps(steps[i]);
  }
}
