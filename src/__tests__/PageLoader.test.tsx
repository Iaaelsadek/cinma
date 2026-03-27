import { render } from '@testing-library/react';
import { PageLoader } from '../components/common/PageLoader';

describe('PageLoader component', () => {
  it('renders spinner container', () => {
    const { container } = render(<PageLoader />);
    // the outer container is the full screen; the actual spinner is nested inside
    const outer = container.querySelector('div > div');
    expect(outer).toBeInTheDocument();

    const spinner = container.querySelector('div > div > div');
    expect(spinner).toBeInTheDocument();
    // check it has animate-spin class which indicates loader
    expect(spinner).toHaveClass('animate-spin');
  });
});
