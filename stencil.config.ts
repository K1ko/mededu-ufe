import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'mededu-ufe',
  globalScript: 'src/global/app.ts',
  devServer: {
    historyApiFallback: {
      index: 'index.html',
    },
  },
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
};
