import { EventEmitter } from 'events';
import {
  CypressDataRequest,
  CypressDataStub,
  FullRequest,
  convertToRequestsIncoming,
  convertToRequestsResponse,
} from '../common/utils';

export const logRequestEvents = (requests: FullRequest[], events: EventEmitter) => {
  const isLogRequests = () => ['request:started', 'request:ended'].some(x => events.eventNames().includes(x));

  Cypress.on('net:stubbing:event', (message: string, eventData: CypressDataStub) => {
    if (!isLogRequests()) {
      // should not run this when no events registered
      return;
    }
    const current = requests.find(r => r.id === eventData?.browserRequestId);

    if (!current) {
      return;
    }

    switch (message) {
      case 'before:request': {
        // console.log(message, eventData);

        // request body available here
        current.request.body = eventData.data?.body;

        return;
      }

      case 'response:callback': {
        // console.log(message, eventData);

        current.response.data = eventData.data;
        const result = convertToRequestsResponse(current);

        events.emit('request:ended', result, eventData);
        // remove here for no emitting again in on 'response:received' event
        requests.splice(requests.map(r => r.id).indexOf(current.id), 1);
        break;
      }

      default: {
        break;
      }
    }
  });

  // carefully test
  Cypress.on('request:event', (message: string, res: CypressDataRequest) => {
    if (!isLogRequests()) {
      // should not run this when no events registered
      return;
    }

    switch (message) {
      case 'incoming:request': {
        // todo filter requests to watch
        // console.log(message, res);

        if (!res.url) {
          return;
        }

        const started = Date.now();
        const current: FullRequest = { id: res.requestId, request: res, started, response: {} };
        requests.push(current);

        const result = convertToRequestsIncoming(current.request);

        events.emit('request:started', result, res);
        break;
      }

      case 'response:received': {
        // console.log(message, res);

        const current = requests.find(r => r.id === res?.requestId);

        if (!current) {
          return;
        }

        if (!current.response.data) {
          current.response.data = {};
        }

        if (!current.response.statusCode) {
          current.response.statusCode = res.status;
        }

        current.response.data.headers = res.headers;

        const result = convertToRequestsResponse(current);
        events.emit('request:ended', result, res);
        requests.splice(requests.map(r => r.id).indexOf(current.id), 1);
        break;
      }

      default: {
        break;
      }
    }
  });
};
