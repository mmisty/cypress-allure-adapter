import { visitHtml } from '../../common/helper';

describe('assertions', () => {
  beforeEach(() => {
    //visitHtml();
    visitHtml({
      body: `
        <div data-test-id="item">
            <div>Apple</div>
            <div data-test-id="other-item">Hello</div>
        </div>
        </br>
        <div data-test-id="item">
            <div>Banana</div>
            <div data-test-id="other-item">Buy</div>
        </div>
        </br>
        <div data-test-id="item">
            <div>Orange</div>
            <div data-test-id="other-item">Is Round</div>
        </div>

        <div data-qa-id="task-card-title">
            <div>Task card</div>
        </div>

`,
      script: `
      // add element after some time
      setTimeout(()=> {
        var child = document.createElement("div");
        child.setAttribute('data-test-id','item');
        child.innerHTML = '<div>Lichi</div><div data-test-id="other-item">Fruit</div>';
        document.body.appendChild(child);
    }, 300);
    // adds second after 300ms
    setTimeout(()=> {
        
         var child2 = document.createElement("div");
        child2.setAttribute('data-test-id','item');
        child2.innerHTML = '<div>Lichi</div><div data-test-id="other-item">Tropical Fruit</div>';
        document.body.appendChild(child2);
    }, 600);
    
     // adds second after 1000ms
    setTimeout(()=> {
        
        var child2 = document.createElement("div");
        child2.setAttribute('data-qa-id','task-card-title');
        child2.innerHTML = '<div>Task Card 2</div>';
        document.body.appendChild(child2);
    }, 1000);
      `,
    });
  });

  it('test', () => {
    cy.get('div').should(t => {
      expect(1, ' 1 should eq').eq(1);
    });
  });

  it('assertion: synchronous asserts', () => {
    expect(1).eq(1);
    expect(1, 'sync assert').eq(1);
  });

  it('assertion: exist cypress function', () => {
    cy.get('div').should('exist');
  });

  it('assertion: exist cypress function', () => {
    cy.get('div').should('exist');
  });

  it('assertion: exist as chai function', () => {
    cy.get('div').should(t => {
      expect(t).to.exist;
    });
  });

  it('assertion: exist as chai function with custom message', () => {
    cy.get('div').should(t => {
      expect(t, 'custom assert').to.exist;
    });
  });

  it('01 assertion: should contain', () => {
    cy.window().then(w => {
      cy.get('div').should('contain', 'Some text');

      cy.url().should('contain', 'mytest.com/123');
      cy.qaId('task-card-title').should('contain', 'Task Card 2');
      setTimeout(() => {
        w.location.href = '/mytest.com/123';
        //cy.visit('/mytest.com/123');
      }, 500);
      setTimeout(() => {
        w.location.href = '/mytest.com';
        //cy.visit('/mytest.com/123');
      }, 800);
      cy.url().should('contain', 'mytest.com');
      cy.url().should('contain', 'mytest.com');
      cy.url().should('contain', 'mytest.com');
    });
  });

  it('02 several url', () => {
    cy.window().then(w => {
      setTimeout(() => {
        w.location.href = '/mytest.com/123';
      }, 500);
      cy.url().should('contain', 'mytest.com/123');
      cy.url().should('contain', 'mytest.com');
      cy.url().should('contain', 'mytest.com');
    });
  });

  it('03 several urls', () => {
    cy.url().should('contain', 'mytest.com');
    cy.url().should('contain', 'mytest.com');
    cy.url().should('contain', 'mytest.com');
  });

  it('04 several asserts', () => {
    cy.qaId('task-card-title').should('contain', 'Task Card 2');
    cy.qaId('task-card-title').should('contain', 'Task Card 2');
    cy.qaId('task-card-title').should('contain', 'Task Card 2');
    cy.qaId('task-card-title').should('contain', 'Task Card 2');
    cy.qaId('task-card-title').should('contain', 'Task Card 2');
    cy.qaId('task-card-title').should('contain', 'Task Card 2');
    cy.wait(1000);
  });

  it('assertion: should contain after some time', () => {
    cy.get('div').should('contain', 'Tropical Fruit').and('contain', 'Lichi');
  });

  it('assertion: url should', () => {
    cy.url().should('contain', 'mytest.com');
  });

  it('assertion: several sync assertions', () => {
    cy.get('div');

    for (let t = 0; t < 20; t++) {
      expect(t).eq(t);
    }
  });
});
