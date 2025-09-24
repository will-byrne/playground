import { html, TemplateResult } from 'lit';
import '../src/pokemon-card.js';
import { sylveon } from './mocks/pokemon.js';

export default {
  title: 'PokemonCard',
  component: 'pokemon-card',
};

interface Story<T> {
  (args: T): TemplateResult;
  args?: Partial<T>;
  argTypes?: Record<string, unknown>;
}

interface ArgTypes {
  header?: string;
  backgroundColor?: string;
}

const Template: Story<ArgTypes> = () => html`
  <pokemon-card .pokemon=${sylveon}></pokemon-card>
`;

export const App = Template.bind({});
