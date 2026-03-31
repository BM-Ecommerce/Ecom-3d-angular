module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist/visualizer',
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance':    ['warn', { minScore: 0.5 }],
        'categories:accessibility':  ['warn', { minScore: 0.7 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
