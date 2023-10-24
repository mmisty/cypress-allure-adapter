import { Suite } from 'mocha';
import { parseInlineTags, parseTags, tag } from '@mmisty/cypress-grep/utils/tags';

export const addGherkin = () => {
  const org = describe;

  const getTags = (test: any): { tag: string; info: string }[] => {
    // this is tags support for @badeball/cypress-cucumber-preprocessor
    // for other plugins need to get tags separately
    const tagsStored = test._testConfig?.env?.__cypress_cucumber_preprocessor_dont_use_this_spec?.pickle?.tags ?? [];

    return tagsStored.length > 0 ? tagsStored.map(t => parseInlineTags(t.name)[0]) : test.tags ?? [];
  };

  (global as any).describe = function (...args) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const suite: Suite = org(...args);

    suite.eachTest((test: any) => {
      const tags = getTags(test);
      console.log(tags);
      test.tags = tags;
      test.configAllure = { tags };

      if (Cypress.env('USE_GREP') === 'true' || Cypress.env('USE_GREP') === true) {
        // compatibility with @mmisty/cypress-grep
        // todo do not include special tags
        const tagLine = tags.map(t => tag(t.tag.slice(1), ...t.info.map(x => x.replace(/_/g, ' ')))).join(' ');
        console.log(tagLine);
        // const fl = test.fullTitle;
        //
        test.fullTitleWithTags = `${test.title}${tagLine}`;
        //test.title = `${test.title}${tagLine}`;
        // test.fullTitle = function () {
        //   const all = fl();
        //
        //   return [...all.slice(0, all.length - 1), `${all[all.length - 1]}${tagLine}`];
        // };
        //test.title = `${test.title}${tagLine}`;
      }
    });

    return suite;
  };

  // adds tags to report
  Cypress.Allure.on('test:started', test => {
    const mochaTest = test as any;
    console.log(test);

    mochaTest?.tags?.forEach((tg: { tag: string; info: string[] }) => {
      console.log(tg);

      const name = tg.tag.slice(1);

      console.log(name);

      switch (name) {
        case 'feature':

        case 'story': {
          tg.info.forEach(info => Cypress.Allure[name](info));
          break;
        }

        case 'tms':
        case 'link':

        case 'issue': {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          Cypress.Allure[name](...tg.info);
          break;
        }

        default: {
          const reporterKeys = Object.keys(Cypress.Allure);

          if (reporterKeys.includes(name)) {
            Cypress.Allure[name](...tg.info);
          } else {
            Cypress.Allure.tag(tg.tag);
          }
          break;
        }
      }
    });
  });
};
