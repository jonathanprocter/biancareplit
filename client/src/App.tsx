import { StrictMode } from 'react';

function Home() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">
          Medical Education Platform
        </h1>
        <p className="text">
          Welcome to your personalized learning experience
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <StrictMode>
      <Home />
    </StrictMode>
  );
}

export default App;