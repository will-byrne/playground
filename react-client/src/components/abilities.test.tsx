import { test, expect } from 'bun:test';
import { screen, render } from '@testing-library/react';
import { Abilities } from './ablities';

test('Happy path render', () => {
  render(<Abilities abilities={[]}/>);
  expect(screen.getByText('Abilities')).toBeInTheDocument();
})