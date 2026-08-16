module.exports = function (options) {
  return {
    ...options,
    externals: [
      ...(options.externals || []),
      function ({ request }, callback) {
        const externals = [
          'bcrypt',
          'argon2',
          'playwright',
          'playwright-core',
          'puppeteer',
          'puppeteer-core',
          'puppeteer-extra',
          'puppeteer-extra-plugin-stealth',
          '@mapbox/node-pre-gyp',
          'mock-aws-s3',
          'aws-sdk',
          'nock',
        ];
        if (externals.includes(request) || request.startsWith('chromium-bidi')) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
  };
};
