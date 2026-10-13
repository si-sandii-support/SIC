const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  mode: isProduction ? "production" : "development",
  context: __dirname,
  entry: "./src/main.jsx",
  devtool: isProduction ? false : "eval-cheap-module-source-map",
  cache: { type: "filesystem", buildDependencies: { config: [__filename] } },
  output: {
    path: path.resolve(__dirname, "dist-webpack"),
    filename: "assets/js/[name].[contenthash:8].js",
    chunkFilename: "assets/js/[name].[contenthash:8].chunk.js",
    assetModuleFilename: "assets/media/[name].[contenthash:8][ext][query]",
    publicPath: "auto",
    clean: true,
  },
  resolve: {
    extensions: [".js", ".jsx", ".mjs", ".json"],
    symlinks: true,
  },
  module: {
    rules: [
      {
        test: /\.[cm]?jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            jsc: {
              target: "es2020",
              parser: { syntax: "ecmascript", jsx: true, dynamicImport: true },
              transform: { react: { runtime: "automatic", development: !isProduction, refresh: !isProduction } },
              minify: isProduction,
            },
            sourceMaps: !isProduction,
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : "style-loader",
          { loader: "css-loader", options: { importLoaders: 1 } },
          { loader: "postcss-loader", options: { postcssOptions: { config: path.resolve(__dirname, "postcss.config.js") } } },
        ],
      },
      { test: /\.mjs$/i, type: "javascript/auto" },
      { test: /\.svg$/i, oneOf: [
        { resourceQuery: /url/, type: "asset/resource" },
        { type: "asset/inline" },
      ] },
      { test: /\.(png|jpe?g|gif|webp|bmp|woff2?|ttf|otf)$/i, type: "asset/resource" },
      { resourceQuery: /url/, type: "asset/resource" },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./index.html", scriptLoading: "defer", inject: "body" }),
    ...(isProduction ? [new MiniCssExtractPlugin({ filename: "assets/css/[name].[contenthash:8].css", chunkFilename: "assets/css/[name].[contenthash:8].chunk.css" })] : []),
    new webpack.DefinePlugin({
      "import.meta.env": JSON.stringify({
        MODE: isProduction ? "production" : "development",
        PROD: isProduction,
        DEV: !isProduction,
        VITE_API_URL: process.env.VITE_API_URL || "",
        VITE_DONATION_URL: process.env.VITE_DONATION_URL || "",
      }),
    }),
  ],
  optimization: {
    minimize: isProduction,
    minimizer: [new TerserPlugin({ parallel: true, terserOptions: { compress: { passes: 2 }, format: { comments: false } }, extractComments: false }), new CssMinimizerPlugin()],
    runtimeChunk: "single",
    moduleIds: "deterministic",
    chunkIds: "deterministic",
    splitChunks: {
      chunks: "all",
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        reactVendor: { test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, name: "react-vendor", priority: 40, reuseExistingChunk: true },
        documentVendor: { test: /[\\/]node_modules[\\/](pdfjs-dist|mammoth|xlsx|papaparse|jszip)[\\/]/, name: "document-vendor", priority: 30, reuseExistingChunk: true },
        dndVendor: { test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/, name: "drag-vendor", priority: 20, reuseExistingChunk: true },
        common: { minChunks: 2, priority: -10, reuseExistingChunk: true },
      },
    },
  },
  performance: { hints: isProduction ? "warning" : false, maxEntrypointSize: 900000, maxAssetSize: 900000 },
  stats: "errors-warnings",
};
