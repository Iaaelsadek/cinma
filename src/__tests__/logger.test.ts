// Ensure helper is mocked before loading logger so the module initializer
// sees the stubbed function.
jest.mock('../lib/envHelper');


// we will load logger dynamically inside tests in order to recreate its
// initialization with different environment variables

describe('logger utility', () => {
  let origEnv: NodeJS.ProcessEnv;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    origEnv = process.env;
  });

  beforeEach(() => {
    process.env = { ...origEnv };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // clear require cache so logger re-initializes on each test
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = origEnv;
  });

  function getLogger() {
    // require helper module and configure its mock before importing logger
    const helper = require('../lib/envHelper');
    // helper.envVar is a jest mock due to jest.mock call
    // tests will override return value as needed just before calling this
    return require('../lib/logger').logger as typeof import('../lib/logger').logger;
  }

  it('always warns and errors regardless of env', () => {
    const logger = getLogger();
    logger.warn('hello');
    logger.error('oops');
    expect(warnSpy).toHaveBeenCalledWith('hello');
    expect(errorSpy).toHaveBeenCalledWith('oops');
  });

  it('logs debug/info when verbose enabled', () => {
    delete process.env.NODE_ENV;
    const helper = require('../lib/envHelper');
    (helper.envVar as jest.Mock).mockReturnValue('true');
    const logger = getLogger();
    logger.debug('dbg');
    logger.info('info');
    expect(logSpy).toHaveBeenCalledWith('dbg');
    expect(logSpy).toHaveBeenCalledWith('info');
  });

  it('suppresses debug/info in prod without verbose flag', () => {
    process.env.NODE_ENV = 'production';
    const helper = require('../lib/envHelper');
    (helper.envVar as jest.Mock).mockReturnValue(undefined);
    const logger = getLogger();
    logger.debug('x');
    logger.info('y');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('respects VITE_ENABLE_VERBOSE_LOGS in prod', () => {
    process.env.NODE_ENV = 'production';
    const helper = require('../lib/envHelper');
    (helper.envVar as jest.Mock).mockImplementation((k: string) => {
      if (k === 'VITE_ENABLE_VERBOSE_LOGS') return 'true';
      return undefined;
    });
    const logger = getLogger();
    logger.debug('d');
    expect(logSpy).toHaveBeenCalledWith('d');
  });
});
