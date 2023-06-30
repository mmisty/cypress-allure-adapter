import WebSocket from 'ws';

const log = (...args: unknown[]) => {
  console.log(`[allure-mocha-reporter] ${args}`);
};

const MOCHA_EVENT = {
  EVENT_HOOK_BEGIN: 'hook',
  EVENT_HOOK_END: 'hook end',
  EVENT_RUN_BEGIN: 'start',
  EVENT_DELAY_BEGIN: 'waiting',
  EVENT_DELAY_END: 'ready',
  EVENT_RUN_END: 'end',
  EVENT_SUITE_BEGIN: 'suite',
  EVENT_SUITE_END: 'suite end',
  EVENT_TEST_BEGIN: 'test',
  EVENT_TEST_END: 'test end',
  EVENT_TEST_FAIL: 'fail',
  EVENT_TEST_PASS: 'pass',
  EVENT_TEST_PENDING: 'pending',
  EVENT_TEST_RETRY: 'retry',
};

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_RETRY,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_BEGIN,
} = MOCHA_EVENT;

export class MyReporterClient {
  // this runs for one spec
  private tests: { title: string; id: string; fullTitle: string }[] = [];
  private tests2: any[] = [];
  private indents = 0;
  //private allure: (AllureTasks & { logs: any[]; stepsDone: boolean }) | undefined;

  constructor(opts: {
    reporterOptions: {
      allureResults?: string;
    };
  }) {
    const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
    this.indents = 0;
    const stats: Mocha.Stats | undefined = runner.stats;
    setInterval(() => {
      console.log('WS:');
      const ws = (Cypress as any).ws as WebSocket;
      console.log(ws);
      console.log(queue);

      if (queue.length > 0 && ws?.readyState === ws.OPEN) {
        console.log('WORK');
        const events = queue.splice(0, queue.length);
        console.log(events);
        events.forEach(event => {
          ws.send(
            JSON.stringify({
              task: event.event,
              arg: { ...event.payload },
            }),
          );
        });
      }
    }, 5000);
    //console.log(`PID ${process.p id}`);
    //this.allure = opts.reporterOptions.reporter;

    // const server: any = undefined; // = startReporterServer({} as any, 3000, this.allure);

    /*const backendRequest = async <T extends RequestTask>(task: T, arg: AllureTaskArgs<T>) => {
      const body = { task, arg };

      // todo find a way to use reporter in open mode, disable this for a while in open mode

      const makeReq = (body: unknown) => axios.post('http://localhost:3000/__cypress/messages', body);

      await makeReq(body)
        .then(function (response) {
          console.log(`RESPN ${JSON.stringify(arg)}`);
          console.log(response.data);
        })
        .catch(function (error) {
          console.log(`Error requesting: ${task}`);
          console.log(error);
        });
    };*/

    console.log(`ALLURE OPTIONS: ${JSON.stringify(opts)}`);
    /*if (!process.env['ALLURE_STARTED']) {
      const oo = { ...opts, reporterOptions: { ...opts.reporterOptions } };

      console.log(`ALLURE OPTIONS: ${JSON.stringify(oo)}`);

      //this.allure = allureTasks({ allureResults: opts?.reporterOptions?.allureResults });
      // for reporter from tests
      process.env['ALLURE_STARTED'] = `${process.pid}`;
    }*/

    /*server?.on('close', () => {
      log('event close server');
      runner.emit('end:run');
      log('HTTP server closed exit');
    });*/

    /*runner.addListener('my', () => {
      log('VIDEO event\n\n\n event');
    });*/
    // let end = 'start';
    const webSocket = () => (Cypress as any).ws as WebSocket;
    const queue: any[] = [];
    runner
      .once(EVENT_RUN_BEGIN, async () => {
        log('event start');
        queue.push({ event: EVENT_RUN_BEGIN, date: Date.now(), payload: {} });
        // webSocket.send('event start');
      })
      .on('any task', args => {
        queue.push({ event: 'any task', date: Date.now(), payload: { ...args } });
      })
      .on('screenshot', name => {
        log('event screenshot');
        queue.push({ event: 'screenshot', date: Date.now(), payload: { name } });
        //webSocket().send(JSON.stringify({ task: 'screenshotOne', arg: { name, date: Date.now() } }));
      })
      .on('step start', async (name: string) => {
        log(`event step start${name}`);
        queue.push({ event: 'step start', date: Date.now(), payload: { name } });
        //webSocket().send(JSON.stringify({ task: 'stepStarted', arg: { name, date: Date.now() } }));
      })
      .on('step', async (name: string, status: string) => {
        log('event step');
        runner.emit('step start', name);
        runner.emit('step end', status);
      })
      .on('step end', async (status: string) => {
        log(`event step end${status}`);
        queue.push({ event: 'step end', date: Date.now(), payload: { status } });
        // webSocket().send(JSON.stringify({ task: 'stepEnded', arg: { status, date: Date.now() } }));
      })
      .on(EVENT_SUITE_BEGIN, async (suite: Mocha.Suite) => {
        log(`event ${EVENT_SUITE_BEGIN}`);
        queue.push({
          event: EVENT_SUITE_BEGIN,
          date: Date.now(),
          payload: { title: suite.title, fullTitle: suite.fullTitle() },
        });

        /*if (suite.title === '' && suite.file) {
          // set current spec
          log(`event ${suite.file}`);
          webSocket().send(JSON.stringify({ task: 'specStarted', arg: { spec: Cypress.spec } }));
          // await backendRequest('specStarted', { spec });
          // this.allure?.specStarted({ spec });
        }
        this.increaseIndent();
        //await waitSteps();

        webSocket().send(
          JSON.stringify({ task: 'suiteStarted', arg: { title: suite.title, fullTitle: suite.fullTitle() } }),
        );
        //await backendRequest('suiteStarted', { title: suite.title, fullTitle: suite.fullTitle() });
        //this.allure?.suiteStarted({ title: suite.title, fullTitle: suite.fullTitle() });*/
      })
      .on(EVENT_SUITE_END, async () => {
        log(`event ${EVENT_SUITE_END}`);
        queue.push({ event: EVENT_SUITE_END, date: Date.now(), payload: {} });

        this.decreaseIndent();
        // await waitTestsEnd();
        // await backendRequest('suiteEnded', {});
        //webSocket().send(JSON.stringify({ task: 'suiteEnded', arg: {} }));

        //this.allure?.suiteEnded({});
      })
      .on(EVENT_TEST_BEGIN, async (test: Mocha.Test) => {
        log(`event ${EVENT_TEST_BEGIN}`);

        queue.push({
          event: EVENT_TEST_BEGIN,
          date: Date.now(),
          payload: { title: test.title, id: (test as any).id, fullTitle: test.fullTitle() },
        });

        //await waitSteps();
        /*webSocket().send(
          JSON.stringify({
            task: 'testStarted',
            arg: { title: test.title, id: (test as any).id, fullTitle: test.fullTitle() },
          }),
        );*/
        //await backendRequest('testStarted', { title: test.title, id: (test as any).id, fullTitle: test.fullTitle() });
        // this.allure?.testStarted();
      })
      .on(EVENT_TEST_PASS, async test => {
        log(`event ${EVENT_TEST_PASS}`);
        //await waitSteps();
        // await this.allure.testEnded({ result: 'passed' });
        log('PASS');
        // prepended to the test title
        log(`${this.indent()}pass: ${test.fullTitle()}`);
      })
      .on('test end my', async test => {
        log('event test end my');
        // console.log(test);

        if (test.state === 'pending') {
          //await waitSteps();
          // await backendRequest('testEnded', { result: 'skipped' });
          queue.push({
            event: 'test end my',
            date: Date.now(),
            payload: { result: 'skipped' },
          });
          // webSocket().send(
          //   JSON.stringify({
          //     task: 'testEnded',
          //     arg: { result: 'skipped' },
          //   }),
          // );
          //await this.allure?.testEnded({ result: 'skipped' });
          //this.tests2.pop();
        } else {
          queue.push({
            event: 'test end my',
            date: Date.now(),
            payload: {
              result: test.state,
              details: {
                message: test.err?.message,
                trace: test.err?.stackTrace,
              },
            },
          });
          /*webSocket().send(
            JSON.stringify({
              task: 'testEnded',
              arg: {
                result: test.state,
                details: {
                  message: test.err?.message,
                  trace: test.err?.stackTrace,
                },
              },
            }),
          );*/
          // await backendRequest('testEnded', {
          //   result: test.state,
          //   details: {
          //     message: test.err?.message,
          //     trace: test.err?.stackTrace,
          //   },
          // });
          // await this.allure?.testEnded({
          //   result: test.state,
          //   details: {
          //     message: test.err?.message,
          //     trace: test.err?.stackTrace,
          //   },
          // });
        }
      })
      .on(EVENT_TEST_FAIL, async (test, err) => {
        log(`event ${EVENT_TEST_FAIL}`);
        // wait steps
        //await waitSteps();
        queue.push({
          event: EVENT_TEST_FAIL,
          date: Date.now(),
          payload: {
            result: 'failed',
            details: {
              message: test.err?.message,
              trace: test.err?.stackTrace,
            },
          },
        });
        /*webSocket().send(
          JSON.stringify({
            task: 'testResult',
            arg: { result: 'failed' },
          }),
        );*/
        // await backendRequest('testResult', { result: 'failed' });
        ////this.allure?.testResult({ result: 'failed' });

        // await this.allure.testEnded({ result: 'failed' });
        log('FAIL');
        log(`${this.indent()}fail: ${test.fullTitle()} - error: ${err.message}`);
      })
      .on(EVENT_TEST_RETRY, async () => {
        log(`event ${EVENT_TEST_RETRY}`);
        //await waitSteps();
        // await backendRequest('testEnded', { result: 'failed' });
        webSocket().send(
          JSON.stringify({
            task: 'testResult',
            arg: { result: 'failed' },
          }),
        );
        // await this.allure?.testEnded({ result: 'failed' });
        this.tests2.pop();
      })
      .once(EVENT_RUN_END, () => {
        log(`event ${EVENT_RUN_END}`);
        // server?.close();
        queue.push({
          event: EVENT_RUN_END,
          date: Date.now(),
          payload: {},
        });

        // videos are being generated after spec end

        /* await backendRequest('suiteStarted', { title: 'videos', fullTitle: 'videos' });
          await backendRequest('testStarted', {
            title: 'simple-pass.cy.ts',
            fullTitle: `videos simple-pass.cy.ts${Date.now()}`,
            // id same in diff specs
            id: 'dd',
          });*/
        /* this.allure?.suiteStarted({ title: 'videos', fullTitle: 'videos' });
          this.allure?.testStarted({
            title: 'simple-pass.cy.ts',
            fullTitle: `videos simple-pass.cy.ts${Date.now()}`,
            // id same in diff specs
            id: 'dd',
          });*/
        //await backendRequest('video', { path: '' });
        //this.allure?.video({ path: '' });
        // await backendRequest('testEnded', { result: 'passed' });
        // await backendRequest('suiteEnded', {});
        //this.allure?.testEnded({ result: 'passed' }); // todo
        //this.allure?.suiteEnded({}); // todo

        if (stats) {
          log(`end: ${stats.passes}/${stats.passes + stats.failures} ok`);
        } else {
          log('No stats!');
        }
        //end = 'end';
      });
    /* process.on('beforeExit', async () => {
        log('before exit');
  
        // while (end !== 'end') {
        //    await delay(100);
        //}
      });*/

    // this is being called once at the end of all specs
    /*process.on('exit', async () => {
        log('process exit');
      });*/

    /*webSocket().onmessage = (event: MessageEvent) => {
      console.log(event.data);

      try {
        const t = JSON.parse(event.data);

        if (t.event === 'video') {
          webSocket().send(
            JSON.stringify({
              task: 'video',
              arg: { path: t.path },
            }),
          );
        }
      } catch (e) {
        console.log(`ss${(e as Error).message}`);
      }
    };*/
  }

  indent() {
    return Array(this.indents).join('  ');
  }

  increaseIndent() {
    this.indents++;
  }

  decreaseIndent() {
    this.indents--;
  }
}
