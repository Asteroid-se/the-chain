'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-content empty-state">
      <h1>Something went wrong.</h1>
      <p>Your workspace couldn’t be loaded. Please try again.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
