import { AllureTest, ExecutableItem, ExecutableItemWrapper, Status, StatusDetails } from 'allure-js-commons';
import { GlobalHookC } from './allure-global-hook2';
import { LabelName, Stage, UNKNOWN } from './allure-types';
import { DataTree, getAllParents, isType, Tree } from './tree-utils';
import { writeFile } from 'fs';

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

export const addPathLabel = (currentSpec: Cypress.Spec | undefined): Label[] => {
  const labels: Label[] = [];

  if (currentSpec) {
    const paths = currentSpec.relative?.split('/');
    labels.push({ name: LabelName.PACKAGE, value: paths.join('.') });
  }

  return labels;
};

export const addGroupLabelByUser = (existingLabels: Label[], label: string, value?: string): void => {
  if (value === undefined) {
    // remove suite labels
    existingLabels = existingLabels.filter(t => t.name !== label);
  } else {
    existingLabels.push({ name: label, value: value });
  }
};

export const addGroupLabels = (root: Tree<DataTree>, currentSuite: Tree<DataTree> | undefined): Label[] => {
  const labels: Label[] = [];

  const suites = getAllParents(root, currentSuite, isType('suite')).map(t => t.data.name);

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

export function applyGroupLabels(test: AllureTest | undefined, labels: Label[]) {
  // apply labels

  const applyLabel = (name: string) => {
    if (!test) {
      return;
    }
    const lb = labels.filter(l => l.name == name);

    // return last added
    const lastLabel = lb[lb.length - 1];

    if (lastLabel) {
      test.addLabel(lastLabel.name, lastLabel.value ?? 'undif');
    }
  };

  applyLabel(LabelName.PARENT_SUITE);
  applyLabel(LabelName.SUITE);
  applyLabel(LabelName.SUB_SUITE);
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
