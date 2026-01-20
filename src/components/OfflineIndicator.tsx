import { useOfflineSync } from "@/hooks/useOfflineSync";
import { WifiOff, Loader2 } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, hasPendingOperations, isSyncing } = useOfflineSync();

  if (isOnline && !hasPendingOperations && !isSyncing) {
    return null;
  }

  return (
    <>
      {!isOnline && (
        <div className="offline-indicator">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode</span>
        </div>
      )}

      {isSyncing && (
        <div className="sync-indicator">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Syncing...</span>
        </div>
      )}

      {isOnline && hasPendingOperations && !isSyncing && (
        <div className="sync-indicator bg-warning text-warning-foreground">
          <span>Pending sync...</span>
        </div>
      )}
    </>
  );
}
