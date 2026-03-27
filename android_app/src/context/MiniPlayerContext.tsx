import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { NativeMediaItem } from '../services/nativeCatalog';

export type MiniPlayerState = {
  item: NativeMediaItem;
  streamUrl: string;
  positionMs: number;
  servers: Array<{ name: string; url: string; quality?: string }>;
};

type MiniPlayerContextType = {
  miniPlayer: MiniPlayerState | null;
  showMiniPlayer: (state: MiniPlayerState) => void;
  dismissMiniPlayer: () => void;
  updatePosition: (ms: number) => void;
  positionRef: React.MutableRefObject<number>;
};

const MiniPlayerContext = createContext<MiniPlayerContextType>({
  miniPlayer: null,
  showMiniPlayer: () => {},
  dismissMiniPlayer: () => {},
  updatePosition: () => {},
  positionRef: { current: 0 },
});

export const MiniPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [miniPlayer, setMiniPlayer] = useState<MiniPlayerState | null>(null);
  const positionRef = useRef<number>(0);

  const showMiniPlayer = useCallback((state: MiniPlayerState) => {
    positionRef.current = state.positionMs;
    setMiniPlayer(state);
  }, []);

  const dismissMiniPlayer = useCallback(() => {
    setMiniPlayer(null);
    positionRef.current = 0;
  }, []);

  const updatePosition = useCallback((ms: number) => {
    positionRef.current = ms;
  }, []);

  return (
    <MiniPlayerContext.Provider
      value={{ miniPlayer, showMiniPlayer, dismissMiniPlayer, updatePosition, positionRef }}
    >
      {children}
    </MiniPlayerContext.Provider>
  );
};

export const useMiniPlayer = () => useContext(MiniPlayerContext);
