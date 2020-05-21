import { h, Component, render } from 'preact';
import { Loc, Router, useLoc } from './loc.js';
import Home from './pages/home.js';
import About from './pages/about.js';
import NotFound from './pages/_404.js';

function App() {
  return (
    <Loc>
      <div class="app">
        <Header />
        <Router>
          <Home path="/" />
          <About path="/about" />
          <NotFound default />
        </Router>
      </div>
    </Loc>
  );
}

function Header() {
  const { url } = useLoc();
  return (
    <header>
      <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/error">Error</a>
      </nav>
      <section>URL:<input readonly value={url} /></section>
    </header>
  );
}

render(<App />, document.body);
