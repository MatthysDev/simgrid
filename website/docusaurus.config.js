// @ts-check
const { themes } = require('prism-react-renderer')

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'simgrid',
  tagline: 'One grid for all your simulators',
  favicon: 'img/favicon.svg',

  url: 'https://matthysdev.github.io',
  baseUrl: '/simgrid/',
  organizationName: 'MatthysDev',
  projectName: 'simgrid',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/MatthysDev/simgrid/tree/main/website/',
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      }),
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      { hashed: true, indexBlog: false, docsRouteBasePath: '/docs' },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { defaultMode: 'light', respectPrefersColorScheme: true },
      navbar: {
        title: 'simgrid',
        logo: { alt: 'simgrid logo', src: 'img/logo.svg' },
        items: [
          { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
          { to: '/docs/commands', label: 'Commands', position: 'left' },
          { to: '/docs/recipes/three-projects', label: 'Recipes', position: 'left' },
          { href: 'https://www.npmjs.com/package/simgrid-cli', label: 'npm', position: 'right' },
          { href: 'https://github.com/MatthysDev/simgrid', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'light',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Introduction', to: '/docs/intro' },
              { label: 'Installation', to: '/docs/installation' },
              { label: 'Commands', to: '/docs/commands' },
            ],
          },
          {
            title: 'Project',
            items: [
              { label: 'npm', href: 'https://www.npmjs.com/package/simgrid-cli' },
              { label: 'GitHub', href: 'https://github.com/MatthysDev/simgrid' },
              { label: 'Releases', href: 'https://github.com/MatthysDev/simgrid/releases' },
              { label: 'Issues', href: 'https://github.com/MatthysDev/simgrid/issues' },
            ],
          },
        ],
        copyright: 'MIT licensed · Built with Docusaurus · MatthysDev',
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
        additionalLanguages: ['bash', 'json'],
      },
    }),
}

module.exports = config
