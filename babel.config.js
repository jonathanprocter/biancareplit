module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { node: 'current' },
      modules: 'commonjs'
    }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(@radix-ui|class-variance-authority|tailwind-merge|clsx)/)'
  ]
};