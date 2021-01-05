const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/cli.ts',
  target: 'node',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.IgnorePlugin(/^pg-native$/)
  ],
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'api.js',
    path: path.resolve(__dirname, 'dist'),
  },
}