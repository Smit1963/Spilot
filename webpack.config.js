const path = require('path');

module.exports = {
  entry: './src/webview/index.tsx',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'webview.js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: true
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    }
  },
  performance: {
    hints: false
  }
};