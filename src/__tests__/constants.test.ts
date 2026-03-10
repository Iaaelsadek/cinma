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

  it('does not throw when import.meta is not available', () => {
    // in jest global import.meta is undefined; the function should catch errors
    delete process.env.TEST_KEY;
    expect(envVar('NONEXISTENT')).toBeUndefined();
  });

  it('returns undefined when eval throws', () => {
    delete process.env.TEST_KEY;
    const origEval = global.eval;
    // force eval to blow up, covering catch branch
    // @ts-ignore
    global.eval = () => { throw new Error('boom'); };
    expect(envVar('ANY')).toBeUndefined();
    global.eval = origEval;
  });
});
