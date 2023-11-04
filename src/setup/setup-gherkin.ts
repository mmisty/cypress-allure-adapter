import { Suite } from 'mocha';
import { parseInlineTags } from '@mmisty/cypress-tags/utils/tags';

export const addGherkin = () => {
  const originalDesc = describe;

  const getTags = (test: any): { tag: string; info: string }[] => {
    // this is tags support for @badeball/cypress-cucumber-preprocessor
    // for other plugins need to get tags separately
    const tagsStored: { name: string }[] =
      test._testConfig?.env?.__cypress_cucumber_preprocessor_dont_use_this_spec?.pickle?.tags ?? [];
    const existingTags = test.tags ?? [];
    // __ replace to space for descriptions
    const cucumberTags = tagsStored.map(t => parseInlineTags(t.name.replace(/__/g, ' '))[0]);

    return tagsStored.length > 0 ? [...existingTags, ...cucumberTags] : existingTags;
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (global as any).describe = function (...args) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const suite: Suite = originalDesc(...args);

    suite.eachTest((test: any) => {
      test.tags = getTags(test);
    });

    return suite;
  };
};
