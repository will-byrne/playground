import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Catppuccin Macchiato, mapped onto Mantine's dark palette so Mantine components
// match the daisyUI catppuccin theme used by the other clients:
// body = mantle, cards/inputs = base, borders = surface1, dimmed = subtext0.
const dark: MantineColorsTuple = [
  '#cad3f5', // 0 text
  '#b8c0e0', // 1 subtext1
  '#a5adcb', // 2 subtext0 (dimmed)
  '#8087a2', // 3 overlay1
  '#494d64', // 4 surface1 (borders)
  '#363a4f', // 5 surface0 (secondary)
  '#24273a', // 6 base (cards, inputs)
  '#1e2030', // 7 mantle (body)
  '#181926', // 8 crust
  '#11111b', // 9
];

const lavender: MantineColorsTuple = [
  '#f0f1fe',
  '#e1e3fc',
  '#d2d6fb',
  '#c4c9f9',
  '#b7bdf8',
  '#b7bdf8',
  '#b7bdf8',
  '#a3aaf6',
  '#8f97f4',
  '#7b84f2',
];

export const theme = createTheme({
  primaryColor: 'lavender',
  primaryShade: 6,
  colors: { dark, lavender },
  defaultRadius: 'md',
  fontFamily:
    'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  headings: { fontFamily: 'inherit', fontWeight: '700' },
  // Tailwind's breakpoints, so grids reflow at the same widths as the other clients.
  breakpoints: { xs: '30em', sm: '40em', md: '48em', lg: '64em', xl: '80em' },
  other: {
    accent: '#f4dbd6',
  },
});
