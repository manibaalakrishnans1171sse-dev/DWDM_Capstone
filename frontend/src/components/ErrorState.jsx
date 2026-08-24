export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3 flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-white border border-red-200 hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
