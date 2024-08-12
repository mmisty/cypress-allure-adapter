import { ExecutableItem } from 'allure-js-commons/dist/esm';

/**
 * Recursively merge the steps when a step has single child with the same name
 * Delete first child when it has the same name as parent
 * @param steps
 */
export function mergeStepsWithSingleChild(steps: ExecutableItem[]): void {
  function flattenStep(step: ExecutableItem): ExecutableItem {
    while (step.steps && step.steps.length === 1 && step.steps[0].name === step.name) {
      step = step.steps[0];
    }

    if (step.steps) {
      step.steps = step.steps.map(flattenStep);
    }

    return step;
  }

  for (let i = 0; i < steps.length; i++) {
    steps[i] = flattenStep(steps[i]);
  }
}
//
// function removeStepsByName(steps: Step[], nameToRemove: string): Step[] {
//   const result: Step[] = [];
//
//   steps.forEach(step => {
//     if (step.name === nameToRemove) {
//       // If the step name matches, promote its children (and recursively process them)
//       const promotedSteps = removeStepsByName(step.steps, nameToRemove);
//       result.push(...promotedSteps);
//     } else {
//       // Otherwise, keep the step and recursively process its children
//       result.push({
//         ...step,
//         steps: removeStepsByName(step.steps, nameToRemove)
//       });
//     }
//   });
//
//   return result;
// }

export function removeStepsByName(steps: ExecutableItem[], commands: string[]): ExecutableItem[] {
  const result: ExecutableItem[] = [];

  steps.forEach(step => {
    if (!step.name) {
      return;
    }

    if (commands.includes(step.name)) {
      // If the step name matches, promote its children
      const promotedSteps = removeStepsByName(step.steps, commands);
      result.push(...promotedSteps);
    } else {
      // Otherwise, keep the step and apply the function to its children
      result.push({
        ...step,
        steps: removeStepsByName(step.steps, commands),
      });
    }
  });

  return result;
}
