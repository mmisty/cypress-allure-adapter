import { ExecutableItem, StatusDetails } from 'allure-js-commons';
import Debug from 'debug';
import { Stage, Status, UNKNOWN } from './allure-types';
import type { ContentType } from '../common/types';
import { AllureReporter3 } from './allure-reporter-3';
import { AttachmentOptions } from 'allure-js-commons/dist/src/model';

const log = Debug('cypress-allure:reporter');
type Step = { name: string; event: 'start' | 'stop'; date: number; status?: Status; details?: StatusDetails };

export type GlobalHookType2 = {
  name: string;
  title: string;
  status?: Status;
  stage?: Stage;
  detailsMessage?: string;
  detailsTrace?: string;
  statusDetails?: StatusDetails;
  hookId?: string;
  start: number;
  stop?: number;
  steps?: Step[];
  attachments?: { name: string; file: string; type: ContentType }[];
};

export class GlobalHookC implements Partial<ExecutableItem> {
  public isStoredHook = true;
  public name: string;
  public title: string;
  public status: Status | undefined;
  public start: number | undefined;
  public stop: number | undefined;
  public statusDetails: StatusDetails | undefined;
  public stage: Stage | undefined;
  public detailsMessage: string | undefined;
  public detailsTrace: string | undefined;

  constructor(private data: GlobalHookType2) {
    this.name = data.name;
    this.title = data.title;
    this.status = data.status;
    this.start = data.start;
    this.stop = data.stop;
    this.statusDetails = data.statusDetails;
    this.stage = data.stage;
    this.detailsMessage = data.detailsMessage;
    this.detailsTrace = data.detailsTrace;
  }

  toString() {
    return this.name;
  }

  startStep(name: string, date?: number) {
    if (!this.data.steps) {
      this.data.steps = [];
    }
    this.data.steps.push({ name: name ?? 'no name', event: 'start', date: date ?? Date.now() });
    log(`this.currentHook.steps: ${JSON.stringify(this.data.steps.map(t => t.name))}`);
  }

  get currentStep() {
    if (!this.data.steps || this.data.steps.length === 0) {
      log('Global hook: no current step');

      return undefined;
    }

    return this.data.steps[this.data.steps.length - 1];
  }

  endStep(status?: Status, details?: StatusDetails) {
    if (!this.currentStep) {
      return;
    }

    if (!this.data.steps) {
      this.data.steps = [];
    }
    this.data.steps.push({ name: '', event: 'stop', date: Date.now() });
    this.currentStep.status = status;
    this.currentStep.details = details;

    log(`this.currentHook.steps: ${JSON.stringify(this.data.steps.map(t => t.name))}`);
  }

  addSteps(reporter: AllureReporter3) {
    this.data.steps?.forEach(step => {
      if (step.event === 'start') {
        reporter.startStep({ name: step.name, date: step.date });
      }

      if (step.event === 'stop') {
        reporter.endStep({ status: step.status ?? UNKNOWN, date: step.date, details: step.details });
      }
    });
    // reporter.endAllSteps({ status: hook.status || UNKNOWN });
  }

  addAttachment(name: string, type: ContentType, file: string) {
    log(`add attachement: ${name}`);

    if (!this.data.attachments) {
      this.data.attachments = [];
    }

    this.data.attachments.push({ name, file, type });

    log(`added attachement: ${name}`);
  }

  addAttachments(reporter: AllureReporter3) {
    log('process global hooks for test');

    if (!this.data.attachments || this.data.attachments.length == 0) {
      log('no attachments');
    }
    this.data.attachments?.forEach(attach => {
      log('process attach');
      reporter.testFileAttachment({ name: attach.name, file: attach?.file, type: attach.type });
    });
  }

  // when suite created
  /*process() {
    log('process global hooks');

    this.reporter.hookStarted({
      title: hook.title,
      hookId: hook.hookId,
      date: hook.start,
    });

    log(`hook steps: ${hook.steps?.length}` ?? 'undef');
    this.data.steps?.forEach(step => {
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
  }*/
}
