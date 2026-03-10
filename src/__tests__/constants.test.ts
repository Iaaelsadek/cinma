// test the standalone helper rather than the full constants module
import { envVar } from '../lib/envHelper';

describe('envVar helper', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns value from process.env when present', () => {
    process.env.TEST_KEY = 'value';
    expect(envVar('TEST_KEY')).toBe('value');
  });

  it('returns undefined when key is absent', () => {
    delete process.env.TEST_KEY;
    expect(envVar('TEST_KEY')).toBeUndefined();
  });

  it('returns undefined when no env source is available', () => {
    delete process.env.TEST_KEY;
    expect(envVar('NONEXISTENT')).toBeUndefined();
  });

  it('provides FLAGS via module mock', () => {
    const { FLAGS } = require('../lib/constants');
    expect(typeof FLAGS.ADS_ENABLED).toBe('boolean');
  });
});
