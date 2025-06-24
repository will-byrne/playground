import {screen} from '@testing-library/react'
import '@testing-library/jest-dom'
import { Types } from './types';
import { render } from '../../utils/test-renderer';

describe('Types', () => {
  it('renders a type when passed in', () => {
    render(<Types types={['testType']} />)

    expect(screen.getByText('testType')).toBeInTheDocument();
  });

  it('renders three types when passed in', () => {
    render(<Types types={['testType1', 'testType2', 'testType3']} />)

    expect(screen.getByText('testType1')).toBeInTheDocument();
    expect(screen.getByText('testType2')).toBeInTheDocument();
    expect(screen.getByText('testType3')).toBeInTheDocument();
  });
})