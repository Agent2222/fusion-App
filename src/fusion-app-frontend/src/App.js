import { html, render } from 'lit-html';
import logo from './logo2.svg';
import { createICActor } from './config.js';

class App {
  greeting = '';

  constructor() {
    this.#render();
  }

  #handleSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    // Lazy-load declarations so we don't create an actor (and call fetchRootKey)
    // during initial page load.
    const fusionAppBackendDecl = await import('declarations/fusion-app-backend');
    const actor = await createICActor(
      fusionAppBackendDecl.idlFactory,
      fusionAppBackendDecl.canisterId
    );
    this.greeting = await actor.greet(name);
    this.#render();
  };

  #render() {
    let body = html`
      <main>
        <img src="${logo}" alt="DFINITY logo" />
        <br />
        <br />
        <form action="#">
          <label for="name">Enter your name: &nbsp;</label>
          <input id="name" alt="Name" type="text" />
          <button type="submit">Click Me!</button>
        </form>
        <section id="greeting">${this.greeting}</section>
      </main>
    `;
    render(body, document.getElementById('root'));
    document
      .querySelector('form')
      .addEventListener('submit', this.#handleSubmit);
  }
}

export default App;
