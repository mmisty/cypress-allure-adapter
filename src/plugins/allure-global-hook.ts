import type { StatusDetails } from 'allure-js-commons';
import { AllureReporter } from './allure-reporter-plugin';
import Debug from 'debug';
import { Status, StatusType, UNKNOWN } from './allure-types';
import type { ContentType } from '../common/types';

const log = Debug('cypress-allure:reporter');
type Step = { name: string; event: 'start' | 'stop'; date: number; status?: Status; details?: StatusDetails };

/**
 * Global hook - is before or after hook when no suite started
 */
export class GlobalHooks {
  beforeAfterHooks: {
    title: string;
    status?: Status;
    details?: StatusDetails;
    hookId?: string;
    start: number;
    stop?: number;
    steps?: Step[];
    attachments?: { name: string; file: string; type: ContentType }[];
  }[] = [];

  constructor(private reporter: AllureReporter) {}

  hasHooks() {
    return this.beforeAfterHooks.length > 0;
  }

  get currentHook() {
    if (this.beforeAfterHooks.length === 0) {
      log('No current global hook!');

      return undefined;
    }

    return this.beforeAfterHooks[this.beforeAfterHooks.length - 1];
  }

  get currentStep() {
    if (!this.currentHook) {
      return undefined;
    }

    if (!this.currentHook.steps || this.currentHook.steps.length === 0) {
      log('Global hook: no current step');

      return undefined;
    }

    return this.currentHook.steps[this.currentHook.steps.length - 1];
  }

  start(title: string, id?: string) {
    this.beforeAfterHooks.push({ title, hookId: id, start: Date.now() });
  }

  startStep(name: string) {
    if (!this.currentHook) {
      return;
    }

    if (!this.currentHook.steps) {
      this.currentHook.steps = [];
    }
    this.currentHook.steps.push({ name, event: 'start', date: Date.now() });
    log(`this.currentHook.steps: ${JSON.stringify(this.currentHook.steps.map(t => t.name))}`);
  }

  endStep(status?: Status, details?: StatusDetails) {
    if (!this.currentHook) {
      return;
    }

    if (!this.currentStep) {
      return;
    }

    if (!this.currentHook.steps) {
      this.currentHook.steps = [];
    }
    this.currentHook.steps.push({ name: '', event: 'stop', date: Date.now() });
    this.currentStep.status = status;
    this.currentStep.details = details;

    log(`this.currentHook.steps: ${JSON.stringify(this.currentHook.steps.map(t => t.name))}`);
  }

  end(status: StatusType, details?: StatusDetails) {
    if (!this.currentHook) {
      return;
    }

    this.currentHook.stop = Date.now();
    this.currentHook.status = status;
    this.currentHook.details = details;
  }

  attachment(name: string, file: string, type: ContentType) {
    log(`add attachments for global hook: ${name}`);

    if (!this.currentHook) {
      return;
    }

    if (!this.currentHook.attachments) {
      this.currentHook.attachments = [];
    }
    this.currentHook.attachments.push({ name, file, type });

    log(`added attachment: ${name}`);
  }

  // proces attachments
  processForTest() {
    log('process global hooks for test');
    const res = this.beforeAfterHooks;
    res.forEach(hook => {
      if (!hook.attachments || hook.attachments.length == 0) {
        log('no attachments');
      }
      hook.attachments?.forEach(attach => {
        log('process attach');
        this.reporter.testFileAttachment({ name: attach.name, file: attach.file, type: attach.type });
        this.reporter.setAttached(attach.file);
      });
    });
  }

  // when suite created
  process() {
    log('process global hooks');
    const res = this.beforeAfterHooks;
    this.beforeAfterHooks = [];
    log(res.map(t => t.title));

    res.forEach(hook => {
      this.reporter.hookStarted({
        title: hook.title,
        hookId: hook.hookId,
        date: hook.start,
      });

      log(`hook steps: ${hook.steps?.length ?? 'undef'}`);
      hook.steps?.forEach(step => {
        if (step.event === 'start') {
          this.reporter.startStep({ name: step.name, date: step.date });
        }

        if (step.event === 'stop') {
          this.reporter.endStep({
            status: step.status ?? UNKNOWN,
            date: step.date,
            details: step.details,
          });
        }
      });
      this.reporter.endAllSteps({ status: hook.status || UNKNOWN });
      this.reporter.hookEnded({
        title: hook.title,
        result: hook.status || UNKNOWN,
        details: hook.details as StatusDetails,
        date: hook.stop,
      });
    });
  }
}
