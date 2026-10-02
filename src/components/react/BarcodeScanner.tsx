import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

type DetectedBarcode = { rawValue: string };

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'isbn_10', 'isbn_13', 'upc_a', 'upc_e'];

/**
 * Fullscreen camera barcode scanner. Uses the native BarcodeDetector API when
 * available, otherwise falls back to the ZXing-based html5-qrcode decoder so it
 * works in browsers that don't ship BarcodeDetector (e.g. desktop Firefox).
 */
export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (rawValue: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const html5Ref = useRef<Html5Qrcode | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [native] = useState<boolean>(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

  useEffect(() => {
    let cancelled = false;

    if (native && window.BarcodeDetector) {
      detectorRef.current = new window.BarcodeDetector({ formats: BARCODE_FORMATS });

      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            await video.play();
          }
        } catch {
          if (!cancelled) setError("Couldn't access the camera.");
        }
      })();

      const interval = window.setInterval(async () => {
        const video = videoRef.current;
        const detector = detectorRef.current;
        if (!video || !detector || video.readyState < 2 || doneRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0 && codes[0].rawValue) {
            doneRef.current = true;
            onDetected(codes[0].rawValue);
          }
        } catch {
          /* keep scanning */
        }
      }, 250);

      return () => {
        cancelled = true;
        window.clearInterval(interval);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
    }

    // Fallback: ZXing decoder via html5-qrcode.
    const reader = new Html5Qrcode('barcode-reader');
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
          /* scanning */
        },
      )
      .catch(() => {
        if (!cancelled) setError("Couldn't access the camera.");
      });

    return () => {
      cancelled = true;
      html5Ref.current
        ?.stop()
        .then(() => html5Ref.current?.clear())
        .catch(() => {});
      html5Ref.current = null;
    };
  }, [native, onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <div className="relative flex-1 overflow-hidden">
        {native ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div id="barcode-reader" className="h-full w-full" />
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center">
            <p className="text-sm text-white/80">{error}</p>
            <button type="button" onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        ) : (
          <>
            {native && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-72 -translate-x-1/2 -translate-y-1/2 sm:h-60 sm:w-80">
                <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-white" />
                <span className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-white" />
                <span className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-white" />
                <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-white" />
              </div>
            )}
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