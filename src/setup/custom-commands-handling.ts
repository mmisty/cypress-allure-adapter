// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { ignoreAllCommands } from '../common/command-names';
import { logWithPackage } from '../common';
import { EventEmitter } from 'events';
import Chainable = Cypress.Chainable;

export class CustomCommandsHandler {
  private wrappedFunction: (originalFn: (...args: any[]) => any) => (...fnargs: any[]) => any;

  constructor(
    private events: EventEmitter,
    private ignoreCommands: () => string[],
    private wrapCustomCommandsSetup: () => boolean | string[],
  ) {
    this.wrappedFunction =
      (originalFn: (...args: any[]) => any) =>
      (...fnargs: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentCmd = (Cypress as any).state?.().current;
        this.events.emit('cmd:started:tech', currentCmd, true);

        const res = originalFn(...fnargs);
        const end = () => this.events.emit('cmd:ended:tech', currentCmd, true);

        if (res?.then && !res?.should) {
          // for promises returned from commands
          res.then(() => {
            end();
          });
        } else if (res?.should) {
          res.should(() => {
            end();
          });
        } else {
          // when function returns
          // undefined we cannot add command at the end,
          // so custom command will be ended immediately
          end();
        }

        return res;
      };
  }

  wrapCustomCommandsFunction(commands: string[], isExclude: boolean) {
    const origAdd = Cypress.Commands.add;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cypress.Commands.add = (...args: any[]) => {
      const fnName = args[0];
      const fn = typeof args[1] === 'function' ? args[1] : args[2];
      const opts = typeof args[1] === 'object' ? args[1] : undefined;

      if (
        !fnName ||
        typeof fnName !== 'string' ||
        ignoreAllCommands(this.ignoreCommands).includes(fnName) ||
        // wrap only specified commands
        (commands.length > 0 && commands.includes(fnName) && isExclude) ||
        (commands.length > 0 && !commands.includes(fnName) && !isExclude)
      ) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        origAdd(...args);

        return;
      }

      if (fn && opts) {
        origAdd(fnName as keyof Chainable, opts, this.wrappedFunction(fn));
      } else if (fn) {
        origAdd(fnName as keyof Chainable, this.wrappedFunction(fn));
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        origAdd(...args);
      }
    };
  }

  wrap() {
    const wrapSetup = this.wrapCustomCommandsSetup();

    if (!wrapSetup) {
      return;
    }

    const commands = Array.isArray(wrapSetup) ? wrapSetup : [];
    let isExclude = false;
    let commadsFixed = commands;

    if (!commands?.every(c => c.startsWith('!')) || !commands?.every(c => !c.startsWith('!'))) {
      logWithPackage('warn', 'wrapCustomCommands environment variable - should either all start from "!" or not');
    }

    if (commands?.every(c => c.startsWith('!'))) {
      isExclude = true;
      commadsFixed = commands?.map(t => t.slice(1));
    }

    this.wrapCustomCommandsFunction(commadsFixed, isExclude);
  }

  wrapGroupedCommands() {
    const groupedCommands: (keyof typeof cy)[] = ['session', 'within'];

    groupedCommands.forEach(cmd => {
      const wrappedFn = this.wrappedFunction;
      const ignoreCommands = this.ignoreCommands;

      Cypress.Commands.overwrite(cmd as any, function (originalFn, ...args) {
        const fn = originalFn;

        if (ignoreAllCommands(ignoreCommands).includes(cmd)) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return fn(...args);
        }

        return wrappedFn(fn)(...args);
      });
    });
  }
}
