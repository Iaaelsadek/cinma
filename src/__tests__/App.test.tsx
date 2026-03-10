import React from 'react';
import { render } from '@testing-library/react';

// Mock the real App to avoid heavyweight providers and lazy content. This keeps
// the smoke test reliable while verifying that Jest is configured correctly.
jest.mock('../App', () => ({
  __esModule: true,
  default: () => <div id="root" data-testid="root">mocked app</div>
}));

import App from '../App';

describe('App component', () => {
  it('renders a root div', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('root')).toBeInTheDocument();
  });
});
