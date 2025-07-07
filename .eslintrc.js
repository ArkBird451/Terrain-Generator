module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
  ],
  rules: {
    'no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true 
    }],
    'default-case': ['warn', { 
      'commentPattern': '^eslint-disable-next-line default-case' 
    }],
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unknown-property': ['error', {
      ignore: [
        'intensity',
        'position',
        'castShadow',
        'shadowMapSize',
        'rotation',
        'args',
        'fov',
        'enableZoom',
        'enableRotate',
        'enablePan'
      ]
    }]
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}; 