import { ContentType } from '@src/plugins/allure-types';

describe('suite', () => {
  beforeEach(() => {
    cy.allure().epic('EPIC').attachment('sds', 'sd', ContentType.TEXT); //.thread('01');
  });
  it('test 1', () => {
    cy.allure().feature('Test labels').story('Test');
    cy.allure().tag('test tag').host('MY_MAC2').thread('02');
  });

  it('test 2', () => {
    cy.allure().tag('test tag 2').tag('33');
    cy.allure().feature('Test labels'); //.story('Test');
    cy.allure().label('tag', 'd').tag('33').step('sdsd');
    cy.allure()
      .startStep('hello')
      .parameter('expected', '1')
      .parameter('actual', '2')
      .parameters({ name: 'ff', value: 'vv' }, { name: 'gg', value: 'vv' })
      .testParameter('message', 'skipppon')
      .addDescriptionHtml('<div>skipppon</div>')
      .addDescriptionHtml('<div>ggg</div>')
      //.thread('P1')
      .fullName('#1')
      .testAttachment('123.csv', 'sddssd', ContentType.TEXT)
      .testFileAttachment('test.csv', 'integration/e2e/interface.test.ts', ContentType.TEXT)
      .attachment('123.csv', 'sddssd', ContentType.TEXT)
      .host('MY_MAC1')
      .thread('02')
      .language('javascript')
      .severity('trivial')
      .lead('LUB')
      .link('http://trivial', 'kk', 'issue')
      .owner('Ta Pi')
      .allureId('##111i')
      .endStep();
  });
});
