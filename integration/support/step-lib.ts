// lib

import Log = Cypress.Log;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    type ServicableObject = { [key in string]: (...args: any[]) => any };
    type STEPS<X extends Cypress.ServicableObject> = <T extends keyof X>(
      input: T,
      ...args: Parameters<X[T]>
    ) => ReturnType<X[T]>;

    interface StepsGeneric<X extends Cypress.ServicableObject> {
      steps<T extends keyof X>(input: T, ...args: Parameters<X[T]>): ReturnType<X[T]>;
    }

    interface Cypress {
      Tools: {
        extendSteps<T extends ServicableObject>(stepObj: T): T;
        getSteps(): ServicableObject;
      };
    }
  }
}

const stepsStorage = { steps: {} };

(global as any).Cypress.Tools = {
  extendSteps(stepObj: any) {
    stepsStorage.steps = { ...stepsStorage.steps, ...stepObj };
  },
  getSteps() {
    return stepsStorage.steps;
  },
};

//
// Cypress.Commands.add('ss', { prevSubject: 'optional' }, (subj, cmd, ...args) => {
//   // let log;
//   // cy.doSyncCommand(() => {
//   const log = Cypress.log({ name: '', message: `**${cmd}**`, groupStart: true, type: 'parent' });
//   // });
//
//   const res = Cypress.Tools.getSteps()[cmd](...args);
//   const end = () => Cypress.log({ emitOnly: true, groupEnd: true });
//
//   if (res?.then && !res?.should) {
//     // for promises returned from commands
//     res.then(() => {
//       end();
//     });
//   } else {
//     cy.doSyncCommand(subj2 => {
//       const logGroupIds = (Cypress as any).state('logGroupIds') || [];
//
//       log.state('logGroupIds', logGroupIds.slice(0, -1));
//       console.log(log);
//
//       return subj2;
//     });
//   }
//
//   return res;
// });

(global as any).cy.steps = (cmd: string, ...args: any[]) => {
  let log: Log | undefined;
  cy.doSyncCommand(() => {
    log = Cypress.log({ name: '', message: `**${cmd}**`, groupStart: true, type: 'parent' } as any);
  });

  const res = Cypress.Tools.getSteps()[cmd](...args);
  const end = () => Cypress.log({ emitOnly: true, groupEnd: true } as any);

  if (res?.then && !res?.should) {
    // for promises returned from commands
    res.then(() => {
      end();
    });
  } else {
    cy.doSyncCommand(subj2 => {
      const logGroupIds = (Cypress as any).state('logGroupIds') || [];

      (log as any)?.state('logGroupIds', logGroupIds.slice(0, -1));
      // console.log(log);

      return subj2;
    });
  }

  return res;
};

export {};
