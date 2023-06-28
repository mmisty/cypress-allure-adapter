import { allureTasks } from '../plugins/allure';
import { startReporterServer } from '../plugins/server';

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
  EVENT_TEST_END,
} = MOCHA_EVENT;

class MyReporter {
  private indents = 0;
  private allure; //: { [key in RequestTask]: (args: AllureTaskArgs<key>) => null };

  constructor(runner: Mocha.Runner, opts?: { reporterOptions?: { allureResults?: string } }) {
    this.indents = 0;
    const stats: Mocha.Stats | undefined = runner.stats;

    console.log(`ALLURE OPTIONS: ${JSON.stringify(opts)}`);

    this.allure = allureTasks({ allureResults: opts?.reporterOptions?.allureResults });

    // for reporter from tests
    startReporterServer({} as any, 3000, this.allure);

    runner
      .once(EVENT_RUN_BEGIN, (...spec) => {
        log('start');
        this.allure.specStarted({ spec: spec as any });
      })
      .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
        this.increaseIndent();
        this.allure.suiteStarted({ title: suite.title, fullTitle: suite.fullTitle() });
      })
      .on(EVENT_SUITE_END, () => {
        this.decreaseIndent();
        this.allure.suiteEnded({ no: '' });
      })
      .on(EVENT_TEST_BEGIN, async (test: Mocha.Test) => {
        log('Start test');
        this.allure.testStarted({ title: test.title, id: (test as any).id, fullTitle: test.fullTitle() });
      })
      .on(EVENT_TEST_PASS, async test => {
        await this.allure.testEnded({ result: 'passed' });
        log('PASS');
        // prepended to the test title
        log(`${this.indent()}pass: ${test.fullTitle()}`);
      })
      .on(EVENT_TEST_END, async test => {
        if (test.state === 'pending') {
          await this.allure.testEnded({ result: 'skipped' });
        }
      })
      .on(EVENT_TEST_FAIL, async (test, err) => {
        await this.allure.testEnded({ result: 'failed' });
        log('FAIL');
        log(`${this.indent()}fail: ${test.fullTitle()} - error: ${err.message}`);
      })
      .on(EVENT_TEST_RETRY, async () => {
        await this.allure.testEnded({ result: 'failed' });
      })
      .once(EVENT_RUN_END, () => {
        if (stats) {
          log(`end: ${stats.passes}/${stats.passes + stats.failures} ok`);
        } else {
          log('No stats!');
        }
      });
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

module.exports = MyReporter;
