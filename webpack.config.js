
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    main: './static/js/main.js',
    system: './static/js/SystemIntegration.js'
  },
  output: {
    path: path.resolve(__dirname, 'static/dist'),
    filename: '[name].[contenthash].js',
    publicPath: '/static/dist/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-transform-runtime'
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'static'),
      '@config': path.resolve(__dirname, 'static/js/config'),
      '@middleware': path.resolve(__dirname, 'static/js/middleware'),
      '@utils': path.resolve(__dirname, 'static/js/utils')
    }
  },
  optimization: {
    minimizer: [new TerserPlugin()],
    splitChunks: {
      chunks: 'all'
    }
  }
};
