import Severity = Cypress.Severity;

export const processTagsOnTestStart = (test: Mocha.Test) => {
  const tags = test?.tags;

  if (!tags || tags.length === 0) {
    return;
  }

  tags.forEach(t => {
    const tagNoAt = t.tag.slice(1);

    switch (tagNoAt) {
      case 'tmsWithId':
      case 'tms':
      case 'issueWithId':

      case 'issue': {
        const [urlOrId, name] = t.info ?? [];

        if (!urlOrId) {
          const message = `tag @${tagNoAt} tag should have id: @${tagNoAt}("idOrUrl")`;
          Cypress.log({ name: 'WARNING', message }).error(new Error());
          break;
        }
        Cypress.Allure[tagNoAt](urlOrId, name);

        break;
      }

      case 'link': {
        const [urlOrId, name, type] = t.info ?? [];

        if (!urlOrId) {
          const message = `tag @${tagNoAt} should have id or url: @${tagNoAt}("idOrUrl")`;
          Cypress.log({ name: 'WARNING', message }).error(new Error());

          break;
        }
        Cypress.Allure[tagNoAt](urlOrId, name, type as 'issue' | 'tms');

        break;
      }

      case 'suite':
      case 'parentSuite':

      case 'subSuite': {
        const [singleValue] = t.info ?? [];

        Cypress.Allure[tagNoAt](singleValue);

        break;
      }

      case 'epic':
      case 'feature':
      case 'story':
      case 'allureId':
      case 'language':
      case 'severity':
      case 'thread':
      case 'fullName':
      case 'lead':
      case 'host':
      case 'layer':
      case 'browser':
      case 'device':
      case 'os':

      case 'owner': {
        const [singleValue] = t.info ?? [];

        if (!singleValue) {
          const message = `tag @${tagNoAt} tag should have value: @${tagNoAt}("value")`;
          Cypress.log({ name: 'WARNING', message }).error(new Error());
          break;
        }
        Cypress.Allure[tagNoAt](singleValue as Severity);

        break;
      }

      case 'label': {
        const [name, value] = t.info ?? [];

        if (!name) {
          const message = `tag @${tagNoAt} tag should have name and/or value: @${tagNoAt}("myLabel","value")`;
          Cypress.log({ name: 'WARNING', message }).error(new Error());
          break;
        }
        Cypress.Allure.label(name, value);
        break;
      }

      default: {
        const addTags = Cypress.env('allureAddNonSpecialTags');

        if (addTags === 'true' || addTags === true || addTags === undefined) {
          Cypress.Allure.tag(t.tag);
        }
        break;
      }
    }
  });
};
