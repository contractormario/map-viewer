var path = require('path');
var webpack = require('webpack');

var PROD = process.env.NODE_ENV === 'prod';
var OUT = PROD ? 'bundle.min.js' : 'bundle.js';

module.exports = {
  entry: './main.js',
  output: { path: __dirname+'/public', filename: OUT },
  plugins: PROD ? [
    //new webpack.IgnorePlugin(/^(pixi|react)$/),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false,
      compress: {
        warnings: false,
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        drop_console: true
      },
      mangle: {
        except: ['$super', '$', 'exports', 'require']
      },
      output: {
        comments: false
      }
    })
    // new webpack.optimize.UglifyJsPlugin({
    //   // compress: {
    //   //   warnings: false,
    //   //   properties: true,
    //   //   sequences: true,
    //   //   dead_code: true,
    //   //   conditionals: true,
    //   //   comparisons: true,
    //   //   evaluate: true,
    //   //   booleans: true,
    //   //   unused: true,
    //   //   loops: true,
    //   //   hoist_funs: true,
    //   //   cascade: true,
    //   //   if_return: true,
    //   //   join_vars: true,
    //   //   //drop_console: true,
    //   //   drop_debugger: true,
    //   //   unsafe: true,
    //   //   hoist_vars: true,
    //   //   negate_iife: true,
    //   //   //side_effects: true
    //   // },
    //   //sourceMap: true,
    //   // mangle: {
    //   //   toplevel: true,
    //   //   sort: true,
    //   //   eval: true,
    //   //   properties: true
    //   // },
    //   // output: {
    //   //   space_colon: false,
    //   //   comments: false
    //   //   // comments: function(node, comment) {
    //   //   //   var text = comment.value;
    //   //   //   var type = comment.type;
    //   //   //   if (type == "comment2") {
    //   //   //     // multiline comment
    //   //   //     return /@copyright/i.test(text);
    //   //   //   }
    //   //   // }
    //   // }
    // })
  ] : [], // no plugins if PROD===false
  module: {
    loaders: [
      {
        test: /.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  },
};