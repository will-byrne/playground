import {screen} from '@testing-library/react'
import '@testing-library/jest-dom'
import { Abilities } from './abilities';
import { render } from '../../utils/test-renderer';

const mockAbility = {
  name: 'testName',
  flavour_text: 'testFlavorText',
  effect: 'testEffect',
};

describe('Abilities', () => {
  describe('happy path', () => {
    it('renders the section heading', () => {
      render(<Abilities abilities={[]} />)

      expect(screen.getByRole('heading', { name: 'Abilities' })).toBeInTheDocument();
    });

    it('renders an ability with its name, flavor_text and effect when passed in', () => {
      render(<Abilities abilities={[mockAbility]} />)

      expect(screen.getByText('testName')).toBeInTheDocument();
      expect(screen.getByText('testFlavorText')).toBeInTheDocument();
      expect(screen.getByText('testEffect')).toBeInTheDocument();
    });

    it('renders multiple abilities when passed in', () => {
      render(<Abilities abilities={[ mockAbility, { ...mockAbility, name: 'testName2'}, { ...mockAbility, name: 'testName3'}]} />)

      expect(screen.getByText('testName')).toBeInTheDocument();
      expect(screen.getByText('testName2')).toBeInTheDocument();
      expect(screen.getByText('testName3')).toBeInTheDocument();
    });
  });
})
