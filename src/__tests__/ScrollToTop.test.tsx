import { render } from '@testing-library/react';
import { ScrollToTop } from '../components/utils/ScrollToTop';
import { vi } from 'vitest';
import { useLocation } from 'react-router-dom';

// mock react-router-dom's useLocation so we can control pathname changes
vi.mock('react-router-dom', () => {
  return {
    useLocation: vi.fn(),
  };
});

describe('ScrollToTop component', () => {
  beforeAll(() => {
    // stub scrollTo since jsdom doesn't implement it
    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls window.scrollTo when pathname changes', () => {
    const useLocationMock = useLocation as vi.Mock;
    const scrollToMock = window.scrollTo as vi.Mock;

    // initial render with path1
    useLocationMock.mockReturnValue({ pathname: '/first' } as ReturnType<typeof useLocation>);
    const { rerender } = render(<ScrollToTop />);
    // In StrictMode, this might be called twice. We just care that it's called.
    expect(scrollToMock).toHaveBeenCalled();

    scrollToMock.mockClear();

    // re-render with same pathname should not trigger another scroll
    rerender(<ScrollToTop />);
    expect(scrollToMock).not.toHaveBeenCalled();

    // re-render with new pathname
    useLocationMock.mockReturnValue({ pathname: '/second' } as ReturnType<typeof useLocation>);
    rerender(<ScrollToTop />);
    expect(scrollToMock).toHaveBeenCalled();
  });
});
