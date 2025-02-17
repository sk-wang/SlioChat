module.exports = {
  plugins: [
    require('postcss-preset-env')({
      browsers: 'last 2 versions',
      stage: 3,
      features: {
        'nesting-rules': true
      }
    })
  ]
}; 