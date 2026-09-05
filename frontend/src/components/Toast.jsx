export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-[12px] font-semibold text-emerald-800 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
        {message}
      </div>
    </div>
  );
}
