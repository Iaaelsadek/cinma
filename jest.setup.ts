import '@testing-library/jest-dom';
// polyfills for jest environment
import 'whatwg-fetch';

// Node 18+ provides TextEncoder/TextDecoder via util
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// mock CONFIG to avoid import.meta during tests
jest.mock('./src/lib/constants', () => ({
  CONFIG: {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    TMDB_API_KEY: '',
    YOUTUBE_API_KEY: '',
    DOMAIN: '',
    API_BASE: ''
  },
  FLAGS: {
    ADS_ENABLED: false,
    // other feature flags can be added here if needed by tests
  },
  // helpers exported for tests
  envVar: jest.fn()
}));

// jsdom doesn't implement media playback, stub common methods used by audio hooks
Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
});
Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

// jsdom does not implement scrollTo
Object.defineProperty(window, 'scrollTo', { value: jest.fn() });
