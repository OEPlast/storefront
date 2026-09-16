export default function Loading() {
  return (
    <div className="container py-8">
      <div
        className="flex min-h-[400px] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-black" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
