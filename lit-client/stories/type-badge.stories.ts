import { html, TemplateResult } from 'lit';
import '../src/type-badge.js';

export default {
  title: 'TypeBadge',
  component: 'type-badge',
  argTypes: {
    backgroundColor: { control: 'color' },
  },
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
  <type-badge type="fairy"></type-badge>
`;

export const App = Template.bind({});
