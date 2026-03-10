import { _getInitialLang, useLang } from '../state/useLang';

describe('useLang store', () => {
  beforeEach(() => {
    // clear localStorage stub
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn()
      },
      writable: true
    });
  });

  it('defaults to arabic when storage is empty', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    expect(_getInitialLang()).toBe('ar');
  });

  it('reads english if stored value is "en"', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('en');
    expect(_getInitialLang()).toBe('en');
  });

  it('toggles language using the store API', () => {
    // set initial state explicitly
    useLang.setState({ lang: 'ar' });
    expect(useLang.getState().lang).toBe('ar');
    useLang.getState().toggle();
    expect(useLang.getState().lang).toBe('en');
    useLang.getState().toggle();
    expect(useLang.getState().lang).toBe('ar');
  });
});
