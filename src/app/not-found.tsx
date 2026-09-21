import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page-content empty-state">
      <h1>This link ends here.</h1>
      <p>That page doesn’t exist in this workspace.</p>
      <Link className="primary-button" href="/">
        Back to downloader
      </Link>
    </div>
  );
}
