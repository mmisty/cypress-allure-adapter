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
  status?: number;
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
