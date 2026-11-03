const config = {
  stories: ['../out-tsc/stories/**/*.stories.{js,md,mdx}'],
  staticDirs: [{ from: '../styles', to: '/styles' }],
  framework: {
    name: '@web/storybook-framework-web-components',
  },
};

export default config;
