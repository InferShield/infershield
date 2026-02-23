const { createDetectionPipeline } = require('./detection/detectionPipeline');

function createApp(config = {}) {
  const pipeline = createDetectionPipeline(config);
  
  return {
    evaluate: pipeline.evaluate
  };
}

module.exports = { createApp };
