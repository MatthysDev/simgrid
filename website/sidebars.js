// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: ['installation', 'quick-start'],
    },
    'commands',
    {
      type: 'category',
      label: 'Guides',
      items: ['guides/profiles', 'guides/logs', 'guides/doctor'],
    },
    {
      type: 'category',
      label: 'Recipes',
      items: ['recipes/three-projects'],
    },
    'how-it-works',
    'faq',
  ],
}

module.exports = sidebars
