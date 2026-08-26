'use client';

export default function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] w-full flex-col rounded-2xl bg-white shadow-xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-base font-semibold text-black">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-black/5 px-5 py-4">{footer}</div>
      </div>
    </div>
  );
}
