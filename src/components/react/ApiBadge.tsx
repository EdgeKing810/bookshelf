import { AppProvider, useApp } from '../../context/AppContext';

function ApiStatus() {
  const { apiUrl } = useApp();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-medium text-base-content opacity-80">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="truncate">API · {apiUrl}</span>
    </span>
  );
}

export default function ApiBadge() {
  return (
    <AppProvider>
      <ApiStatus />
    </AppProvider>
  );
}