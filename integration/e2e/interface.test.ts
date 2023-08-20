describe('interface', () => {
  beforeEach(() => {
    cy.allure().epic('EPIC').attachment('sds', 'sd', 'text/plain'); //.thread('01');
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
      .testAttachment('123.csv', 'sddssd', 'text/plain')
      .testFileAttachment('test.csv', 'integration/e2e/interface.test.ts', 'text/plain')
      .attachment('123.csv', 'sddssd', 'text/plain')
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

  it('links', () => {
    cy.allure().tag('links');
    cy.allure().tms('PROJ-01', 'PROJ-01: Description of user story');
    cy.allure().tms('PROJ-03');
    cy.allure().issue('PROJ-02', 'Description of issue');
    cy.allure().issue('PROJ-04');
  });
});
