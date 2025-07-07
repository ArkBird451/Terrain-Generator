module.exports = {
  ignoreWarnings: [
    {
      module: /node_modules\/@mediapipe/,
      message: /Failed to parse source map/,
    },
    {
      module: /node_modules\/@mediapipe/,
      message: /Could not parse source map/,
    }
  ],
  stats: {
    warningsFilter: [
      /Failed to parse source map/,
      /Could not parse source map/
    ]
  }
}; 