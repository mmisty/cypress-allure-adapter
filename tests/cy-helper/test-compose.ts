export const visitHtmlStr = [
  `cy.intercept('mytest.com**', {
        body: \`<html>
            <head></head>
          <body>
          <a href="#2" data-qa-id="link-2">My link</a>
          <a href="#3" data-qa-id="link-3">My link</a>
          </body>
          </html>
          \`
      });`,
  "cy.visit('mytest.com');",
].join('\n');

export const suiteStr = (title: string, testFnStr: string[]): string => {
  return `describe('${title}', () => {
  ${testFnStr.join('\n')}
})
`;
};

export const beforeStr = (beforeStepsStr: string[]): string => {
  return `before(() => {
    ${beforeStepsStr.join('\n')}
  })
  `;
};

export const beforeEachStr = (beforeEachStepsStr: string[]): string => {
  return `beforeEach(() => {
    ${beforeEachStepsStr.join('\n')}
  })
  `;
};

export const testStr = (title: string, testStepsStr: string[]): string => {
  return `it('${title}', () => {
    ${testStepsStr.join('\n')}
  })
  `;
};
