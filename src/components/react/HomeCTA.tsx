import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function HomeCTAInner() {
  const { auth } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span className="h-11 w-40 animate-pulse rounded-xl bg-base-300/60" />
        <span className="h-11 w-32 animate-pulse rounded-xl bg-base-300/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {auth ? (
        <a href="/library" className="btn btn-primary btn-lg shadow-lg shadow-primary/25">
          Open my library
        </a>
      ) : (
        <>
          <a href="/register" className="btn btn-primary btn-lg shadow-lg shadow-primary/25">
            Start your library
          </a>
          <a href="/login" className="btn btn-outline btn-lg">
            Sign in
          </a>
        </>
      )}
    </div>
  );
}

export default function HomeCTA() {
  return (
    <AppProvider>
      <HomeCTAInner />
    </AppProvider>
  );
}