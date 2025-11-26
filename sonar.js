const scanner = require('sonarqube-scanner');

scanner({
  serverUrl: 'https://sonarcloud.io',
  token: process.env.SONAR_TOKEN,
  options: {
    'sonar.projectKey': 'bmecommerce_ecom-angular',
    'sonar.organization': 'bmecommerce',
    'sonar.sources': 'src'
  }
}, () => process.exit());
