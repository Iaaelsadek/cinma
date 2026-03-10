import React from 'react';
import { render } from '@testing-library/react';
import { ScrollToTop } from '../components/utils/ScrollToTop';

// mock react-router-dom's useLocation so we can control pathname changes
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    __esModule: true,
    ...original,
    useLocation: jest.fn(),
  };
});

const { useLocation } = require('react-router-dom');

describe('ScrollToTop component', () => {
  beforeAll(() => {
    // stub scrollTo since jsdom doesn't implement it
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls window.scrollTo when pathname changes', () => {
    // initial render with path1
    useLocation.mockReturnValue({ pathname: '/first' });
    render(<ScrollToTop />);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    // re-render with new pathname
    useLocation.mockReturnValue({ pathname: '/second' });
    render(<ScrollToTop />);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });
});
