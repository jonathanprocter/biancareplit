module.exports = {
  presets: [
    '@babel/preset-env',
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@radix-ui|class-variance-authority|tailwind-merge|clsx)/)'
  ]
};
