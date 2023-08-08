describe('suite', () => {
  let port = 3000;
  const url = () => `http://localhost:${port}`;

  before(() => {
    cy.task('shutDownTestServer');
    cy.task<number>('startTestServer').then(p => (port = p));
  });

  it('01 suptr simple GET without data', () => {
    cy.request(`${url()}/`);
  });
  it('01.2 simple GET without data', () => {
    cy.request('GET', `${url()}/`);
  });

  it('01.3 simple GET -  args as object', () => {
    cy.request({ url: `${url()}/`, method: 'GET' });
  });

  it('simple POST with data', () => {
    cy.request('POST', `${url()}/hello`, { data: 'should' }).then(r => {
      cy.log(`result:${r.body.result}`);
      expect(r.body).deep.eq({ result: 'hello world' });
    });
  });

  it('POST without data', () => {
    cy.request('POST', `${url()}/mirror`);
  });

  it('POST with long data', () => {
    cy.request('POST', `${url()}/mirror`, {
      data: [{ chicken: 'Zina' }, { chicken: 'Marta' }, { chicken: 'Galya' }, { chicken: 'Zoya' }],
    });
  });
});
