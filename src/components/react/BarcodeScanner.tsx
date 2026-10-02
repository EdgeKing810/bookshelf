import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Fullscreen camera barcode scanner powered by the ZXing-based html5-qrcode
 * decoder, which works consistently across iOS Safari and Android (Chrome,
 * Samsung Internet, Edge, Firefox). All camera access is wrapped in try/catch
 * so a failure surfaces an inline error instead of crashing the page.
 */
export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (rawValue: string) => void;
  onClose: () => void;
}) {
  const html5Ref = useRef<Html5Qrcode | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reader: Html5Qrcode | null = null;
    try {
      reader = new Html5Qrcode('barcode-reader');
      html5Ref.current = reader;
      reader
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 120 } },
          (decodedText) => {
            if (!doneRef.current && decodedText) {
              doneRef.current = true;
              onDetected(decodedText);
            }
          },
          () => {
            /* keep scanning */
          },
        )
        .then(() => {
          /* scanning started */
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : '';
          setError(
            msg && /permission|denied/i.test(msg)
              ? 'Camera permission was denied. Enable it for this site and try again.'
              : "Couldn't start the camera. Make sure it's available and enabled.",
          );
        });
    } catch {
      if (!cancelled) setError("Couldn't start the camera.");
    }

    return () => {
      cancelled = true;
      html5Ref.current
        ?.stop()
        .then(() => html5Ref.current?.clear())
        .catch(() => {});
      html5Ref.current = null;
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <div className="relative flex-1 overflow-hidden">
        <div id="barcode-reader" className="h-full w-full" />

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-white/60">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <p className="text-sm text-white/90">{error}</p>
            <button type="button" onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-72 -translate-x-1/2 -translate-y-1/2 sm:h-60 sm:w-80">
              <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-white" />
              <span className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-white" />
              <span className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-white" />
              <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-white" />
            </div>
            <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3">
              <p className="rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
                Point the camera at the book's barcode
              </p>
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-white">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}