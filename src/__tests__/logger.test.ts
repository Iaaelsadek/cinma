import { vi } from 'vitest';

// Ensure helper is mocked before loading logger so the module initializer
// sees the stubbed function.
vi.mock('../lib/envHelper');


// we will load logger dynamically inside tests in order to recreate its
// initialization with different environment variables

describe('logger utility', () => {
  let origEnv: NodeJS.ProcessEnv;
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeAll(() => {
    origEnv = process.env;
  });

  beforeEach(() => {
    process.env = { ...origEnv };
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // clear require cache so logger re-initializes on each test
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = origEnv;
  });

  async function getLogger() {
    // require helper module and configure its mock before importing logger
    const helper = await import('../lib/envHelper');
    // helper.envVar is a jest mock due to jest.mock call
    // tests will override return value as needed just before calling this
    return await import('../lib/logger').then(m => m.logger) as typeof import('../lib/logger').logger;
  }

  it('always warns and errors regardless of env', async () => {
    const logger = await getLogger();
    logger.warn('hello');
    logger.error('oops');
    expect(warnSpy).toHaveBeenCalledWith('hello');
    expect(errorSpy).toHaveBeenCalledWith('oops');
  });

  it('logs debug/info when verbose enabled', async () => {
    delete process.env.NODE_ENV;
    const helper = await import('../lib/envHelper');
    (helper.envVar as any).mockReturnValue('true');
    const logger = await getLogger();
    logger.debug('dbg');
    logger.info('info');
    expect(logSpy).toHaveBeenCalledWith('dbg');
    expect(logSpy).toHaveBeenCalledWith('info');
  });

  it('suppresses debug/info in prod without verbose flag', async () => {
    process.env.NODE_ENV = 'production';
    const helper = await import('../lib/envHelper');
    (helper.envVar as any).mockReturnValue(undefined);
    const logger = await getLogger();
    logger.debug('x');
    logger.info('y');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('respects VITE_ENABLE_VERBOSE_LOGS in prod', async () => {
    process.env.NODE_ENV = 'production';
    const helper = await import('../lib/envHelper');
    (helper.envVar as any).mockImplementation((k: string) => {
      if (k === 'VITE_ENABLE_VERBOSE_LOGS') return 'true';
      return undefined;
    });
    const logger = await getLogger();
    logger.debug('d');
    expect(logSpy).toHaveBeenCalledWith('d');
  });
});
