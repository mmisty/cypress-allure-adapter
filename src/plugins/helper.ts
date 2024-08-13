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

function removeMatchingSteps(steps: ExecutableItem[]): ExecutableItem[] {
  return (
    steps.filter((step, i) => {
      // Recursively remove matching steps within nested arrays
      step.steps = removeMatchingSteps(step.steps);

      return step.steps.length > 0 || step.name !== step.steps[0]?.name;
    }) ?? []
  );
}

/**
 * Recursively merge the steps when a step has single child with the same name
 * Delete first child when it has the same name as parent
 * @param steps
 */
export function removeFirstMessageWhenSame2(steps: ExecutableItem[]): void {
  const result = [];
  steps.forEach((s, i) => {
    // if (!s[i]) {
    //   return;
    // }

    if (s[i] && s[i].steps.length > 0 && s[i].name === s[i].steps[0].name) {
      s[i].steps.splice(0, 1);
      removeFirstStepWhenSame(s[i].steps);
    }
  });
}

export function removeFirstStepWhenSame(steps: ExecutableItem[]): ExecutableItem[] {
  // Helper function to process each step recursively
  function processSteps(steps: ExecutableItem[]): ExecutableItem[] {
    return steps.map(step => {
      // Ensure `step.steps` is treated as a flat array of steps
      const flattenedSteps = flattenSteps(step.steps);

      // Recursively process each flattened step
      const processedSteps = processSteps(flattenedSteps);

      // Check if the first nested step has the same name as the current step
      if (processedSteps.length > 0 && processedSteps[0].name === step.name && processedSteps[0].steps.length === 0) {
        // Remove the first nested step
        const res = step;
        res.steps = processedSteps.slice(1);

        return res;
      }
      const res2 = step;
      res2.steps = processedSteps;

      // If no match or no steps, return as-is
      return res2;
    });
  }

  // Helper function to flatten nested arrays into a single array
  function flattenSteps(steps: ExecutableItem[] | ExecutableItem[][]): ExecutableItem[] {
    if (Array.isArray(steps[0])) {
      // Flatten nested arrays
      return steps[0].flatMap(s => s);
    }

    return steps as ExecutableItem[];
  }

  return processSteps(steps);
}

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
