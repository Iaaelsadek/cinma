import { useCallback, useEffect, useRef } from 'react';
import { saveWatchProgress, clearWatchProgress } from '../services/userLibrary';
import { pushRemoteLibraryState } from '../services/librarySync';
import { trackEvent } from '../services/analytics';
import { sendQoeSample } from '../services/qoe';

type UseWatchProgressOptions = {
  contentId: string;
  title: string;
  resumePositionSec?: number;
};

export const useWatchProgress = ({ contentId, title, resumePositionSec = 0 }: UseWatchProgressOptions) => {
  const hasTrackedStartRef = useRef(false);
  const lastTrackedSecondRef = useRef(0);
  const lastSavedSecondRef = useRef(0);
  const currentSecondRef = useRef(Math.max(0, Math.floor(resumePositionSec)));
  const startedAtMsRef = useRef(Date.now());
  const startupTrackedRef = useRef(false);
  const rebufferCountRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onPlaybackUpdate = useCallback(
    (isPlaying: boolean, isBuffering: boolean, positionMs: number, durationMs: number, didJustFinish: boolean) => {
      if (!isMountedRef.current) return;

      if (isPlaying && !hasTrackedStartRef.current) {
        hasTrackedStartRef.current = true;
        trackEvent('playback_started', { contentId, title });
      }

      if (isBuffering && hasTrackedStartRef.current) {
        rebufferCountRef.current += 1;
      }

      if (isPlaying && !startupTrackedRef.current) {
        startupTrackedRef.current = true;
        const startupMs = Date.now() - startedAtMsRef.current;
        sendQoeSample({
          contentId,
          startupMs,
          rebufferCount: rebufferCountRef.current,
          watchSeconds: 0,
          completed: false,
        });
      }

      const currentSecond = Math.floor(positionMs / 1000);
      currentSecondRef.current = currentSecond;

      if (currentSecond > 0 && currentSecond - lastTrackedSecondRef.current >= 30) {
        lastTrackedSecondRef.current = currentSecond;
        trackEvent('playback_progress', { contentId, positionSec: currentSecond });
      }

      const durationSec = Math.floor(durationMs / 1000);
      if (currentSecond > 0 && currentSecond - lastSavedSecondRef.current >= 15) {
        lastSavedSecondRef.current = currentSecond;
        saveWatchProgress(contentId, currentSecond, durationSec);
      }

      if (didJustFinish) {
        trackEvent('playback_completed', {
          contentId,
          durationSec: Math.floor(durationMs / 1000),
        });
        sendQoeSample({
          contentId,
          startupMs: Date.now() - startedAtMsRef.current,
          rebufferCount: rebufferCountRef.current,
          watchSeconds: currentSecond,
          completed: true,
        });
        clearWatchProgress(contentId);
        pushRemoteLibraryState();
      }
    },
    [contentId, title]
  );

  return {
    currentSecondRef,
    onPlaybackUpdate,
  };
};
