import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Polls the `version` column of a trip every 30s.
 * Returns `stale = true` when the remote version is newer than the local snapshot.
 * Call `acknowledge()` after the consumer refreshes its data to reset.
 */
export function useTripVersionPoll(tripId: string | undefined) {
  const [stale, setStale] = useState(false);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const localVersion = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!tripId) return;

    const { data, error } = await supabase
      .from('trips')
      .select('version, updated_at')
      .eq('id', tripId)
      .maybeSingle();

    if (error || !data) return;

    if (localVersion.current === null) {
      // First poll — seed the local version
      localVersion.current = data.version ?? 0;
      return;
    }

    const remote = data.version ?? 0;
    if (remote > localVersion.current) {
      setStale(true);
      // updated_at can hint who changed it; for now just flag it
      setUpdatedBy(data.updated_at ?? null);
    }
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;

    // Reset on trip change
    localVersion.current = null;
    setStale(false);
    setUpdatedBy(null);

    // Initial poll
    void poll();

    timer.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [tripId, poll]);

  /** Call after refreshing data to accept the new version */
  const acknowledge = useCallback(() => {
    setStale(false);
    setUpdatedBy(null);
    // Re-seed on next poll
    localVersion.current = null;
  }, []);

  return { stale, updatedBy, acknowledge };
}
