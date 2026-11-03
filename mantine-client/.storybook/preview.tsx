import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import type { Preview } from "@storybook/react";
import { theme } from '../src/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <MantineProvider theme={theme} forceColorScheme="dark">
        <Story />
      </MantineProvider>
    ),
  ],
};

export default preview;
