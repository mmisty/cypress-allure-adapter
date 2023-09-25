import { ExecutableItem, ExecutableItemWrapper, Status, StatusDetails } from 'allure-js-commons';
import { GlobalHookC } from './allure-global-hook2';
import { LabelName, Stage, UNKNOWN } from './allure-types';
import { getAllParents, isType, SpecTree } from './tree-utils';
import { writeFile } from 'fs';
import { uniq } from '@mmisty/cypress-grep/utils/functions';

export type Label = { name: string; value: string };

export function setExecutableItemStatus(executableItem: ExecutableItem | undefined, res: Status, dtls?: StatusDetails) {
  if (!executableItem) {
    return;
  }

  executableItem.status = res;

  if (res === Status.FAILED) {
    if (dtls) {
      executableItem.statusDetails.message = dtls?.message;
      executableItem.statusDetails.trace = dtls?.trace;
    }
  }

  if (res === Status.SKIPPED) {
    executableItem.statusDetails.message = dtls?.message;
  }

  if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
    executableItem.statusDetails.message = dtls?.message;
  }
}

export function setExecutableStatus(
  executable: ExecutableItemWrapper | GlobalHookC | undefined,
  res: Status,
  dtls?: StatusDetails,
) {
  if (!executable) {
    return;
  }

  if (res === Status.PASSED) {
    executable.status = Status.PASSED;
    executable.stage = Stage.FINISHED;
  }

  if (res === Status.BROKEN) {
    executable.status = Status.BROKEN;
    executable.stage = Stage.FINISHED;
  }

  if (res === Status.FAILED) {
    executable.status = Status.FAILED;
    executable.stage = Stage.FINISHED;

    executable.detailsMessage = dtls?.message;
    executable.detailsTrace = dtls?.trace;
  }

  if (res === Status.SKIPPED) {
    executable.status = Status.SKIPPED;
    executable.stage = Stage.PENDING;

    executable.detailsMessage = dtls?.message || 'Suite disabled';
  }

  if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
    executable.status = UNKNOWN;
    executable.stage = Stage.PENDING;

    executable.detailsMessage = dtls?.message || `Result: ${res ?? '<no>'}`;
  }

  if (dtls) {
    executable.statusDetails = dtls;
  }
}

export const addPathLabel = (run: SpecTree, currentSpec: Cypress.Spec | undefined) => {
  if (!run.currentTestData) {
    return;
  }

  if (currentSpec) {
    const value = currentSpec.relative;
    // run.currentTestData.test?.addLabel('path', label);
    run.currentTestData.labels?.push({ name: 'path', value });
  }
};

export const addPackageLabel = (run: SpecTree, currentSpec: Cypress.Spec | undefined): void => {
  if (!run.currentTestData) {
    return;
  }

  if (currentSpec) {
    const value = currentSpec.relative?.split('/').join('.');
    run.currentTestData.labels?.push({ name: LabelName.PACKAGE, value });
  }
};

export const addGroupLabelByUser = (run: SpecTree, label: string, value?: string): void => {
  if (!run.currentTestData) {
    return;
  }

  if (value === undefined) {
    // remove labels
    run.currentTestData.labels = run.currentTestData.labels?.filter(t => t.name !== label);
  } else {
    run.currentTestData.labels?.push({ name: label, value });
  }
};

export const addGroupLabels = (run: SpecTree): Label[] => {
  const labels: Label[] = [];

  const suites = getAllParents(run.root, run.currentSuite, isType('suite')).map(t => t.data.name);

  const [parentSuite, suite, subSuite] = suites;

  if (suites.length > 0) {
    labels.push({ name: LabelName.PARENT_SUITE, value: parentSuite });
  }

  if (suites.length > 1) {
    labels.push({ name: LabelName.SUITE, value: suite });
  }

  if (suites.length > 2) {
    labels.push({ name: LabelName.SUB_SUITE, value: subSuite });
  }

  return labels;
};

// todo unit test
export function applyLabels(run: SpecTree) {
  if (!run.currentTest) {
    return;
  }

  const labels = run.currentTestData?.labels ?? [];

  const applyLabel = (name: string) => {
    const lb = labels.filter(l => l.name == name);

    // return last added
    const lastLabel = lb[lb.length - 1];

    if (lastLabel) {
      run.currentTestData?.test.addLabel(lastLabel.name, lastLabel.value ?? 'undef');
    }
  };

  uniq(labels.map(t => t.name)).forEach(name => {
    applyLabel(name);
  });
}

export const setLastStepStatus = (steps: ExecutableItem[], status: Status, details?: StatusDetails) => {
  const stepsCount = steps.length;

  if (stepsCount > 0) {
    setLastStepStatus(steps[stepsCount - 1].steps, status, details);
    setExecutableItemStatus(steps[stepsCount - 1], status, details);
  }
};

export const writeTestFile = (log: (msg: string) => void, testFile: string, content: string, callBack: () => void) => {
  writeFile(testFile, content, errWrite => {
    if (errWrite) {
      log(`error test file  ${errWrite.message} `);

      return;
    }
    log(`write test file done ${testFile} `);
    callBack();
  });
};
