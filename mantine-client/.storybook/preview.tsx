import '../src/App.css'
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import type { Preview } from "@storybook/react";


const preview: Preview = {
  decorators: [
    (Story) => (
      <MantineProvider defaultColorScheme="dark">
        <Story />
      </MantineProvider>
    ),
  ],
};

export default preview;
