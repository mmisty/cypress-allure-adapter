import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import path from 'path';
import type { Configuration } from 'webpack';

export const preprocessor = (isCoverage: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const wp = require('@cypress/webpack-preprocessor');

  const coverageRule = {
    test: /\.ts$/,
    exclude: [/node_modules/],
    loader: '@ephesoft/webpack.istanbul.loader', // Must be first loader
  };

  const tsRule = {
    test: /\.ts$/,
    exclude: [/node_modules/],
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  };

  const rules = isCoverage ? [coverageRule, tsRule] : [tsRule];

  const webpackOptions: Configuration = {
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      plugins: [
        // to resolve paths from tsconfig (i.e.cy-local)
        new TsconfigPathsPlugin({
          configFile: tsconfigPath,
          silent: true,
        }),
      ],
    },
    module: {
      rules,
    },
    cache: false,
    stats: 'verbose',
    mode: 'development',
    devtool: 'source-map',
  };

  const options = {
    webpackOptions,
  };

  return wp(options);
};
