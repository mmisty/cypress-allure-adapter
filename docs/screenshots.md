## Screenshots

By default, adapter adds all screenshots to a test.

There is possibility to attach screenshots made by 
`cy.screenshot` command to a step.

To attach to a step use 
setting to screenshot command

```typescript
cy.screenshot({ allureAttachToStep: true });
```