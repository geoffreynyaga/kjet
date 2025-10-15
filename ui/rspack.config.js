const path = require('path');
const { defineConfig } = require('@rspack/cli');
const { rspack } = require('@rspack/core');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = defineConfig({
  entry: './src/index.tsx',

  output: {
    path: path.resolve(__dirname, process.env.NODE_ENV === 'production' ? './static/ui' : './static/ui'),
    filename: '[name].[contenthash].js',
    clean: true // Built-in clean functionality
  },

  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },

  module: {
    rules: [
      {
        test: /\.js|\.jsx$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'ecmascript',
                jsx: true
              },
              transform: {
                react: {
                  runtime: 'automatic'
                }
              }
            }
          }
        }
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true
              },
              transform: {
                react: {
                  runtime: 'automatic'
                }
              }
            }
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },

  optimization: {
    minimize: true
  },

  plugins: [
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }),

    new WebpackManifestPlugin({
      fileName: 'manifest.json',
      publicPath: '/'
    }),

    // Environment variables
    new rspack.EnvironmentPlugin({
      NODE_ENV: 'development'
    }),

    new CleanWebpackPlugin()
  ],

  // Development server configuration
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    devMiddleware: {
      writeToDisk: (filePath) => {
        return /static\/ui/.test(filePath);
      }
    },
    static: {
      directory: path.resolve(__dirname, './static/ui'),
      watch: true
    }
  },

  // Enable source maps for development
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-cheap-module-source-map'
});