/**
 * Shared stream pool used across catalog services.
 */
export const STREAM_POOL = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
  'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
  'https://moctobpltc-i.akamaihd.net/hls/live/571251/1000/master.m3u8',
];

export const pickStream = (seed: number) => STREAM_POOL[Math.abs(seed) % STREAM_POOL.length];
