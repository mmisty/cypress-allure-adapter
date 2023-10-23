import { Suite } from 'mocha';

export const addGherkin = () => {
  const org = describe;

  const getTags = (test: any): { tag: string; info: string }[] => {
    // this is tags support for @badeball/cypress-cucumber-preprocessor
    // for other plugins need to get tags separately
    const tagsStored = test._testConfig?.env?.__cypress_cucumber_preprocessor_dont_use_this_spec?.pickle?.tags ?? [];

    return tagsStored.map(t => ({ tag: t.name, info: '' }));
  };

  (global as any).describe = function (...args) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const suite: Suite = org(...args);

    suite.eachTest((test: any) => {
      const tags = getTags(test);
      test.tags = tags;

      if (Cypress.env('USE_GREP') === 'true' || Cypress.env('USE_GREP') === true) {
        // compatibility with @mmisty/cypress-grep
        test.title = `${test.title}${tags.map(t => t.tag).join(' ')}`;
      }
    });

    return suite;
  };

  // adds tags to report
  Cypress.Allure.on('test:started', test => {
    const mochaTest = test as any;
    mochaTest?.tags?.forEach((tg: { tag: string }) => {
      Cypress.Allure.tag(tg.tag);
    });
  });
};
