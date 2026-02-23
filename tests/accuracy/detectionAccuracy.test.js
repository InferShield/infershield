const { benignRequests } = require('../../backend/benchmarks/benign-test-data');
const { maliciousRequests } = require('../../backend/benchmarks/malicious-test-data');

/**
 * Detection pipeline placeholder - Replace with the actual pipeline method.
 * @param {string} request - Request to analyze.
 * @returns {boolean} - True if flagged as malicious, false otherwise.
 */
function detectionPipeline(request) {
  // Placeholder for the actual detection logic
  return false;
}

describe('Detection Accuracy Tests', () => {
  test('False Positive Rate (Benign Requests)', () => {
    let falsePositives = 0;

    // Run each benign request through the detection pipeline
    benignRequests.forEach((request) => {
      if (detectionPipeline(request)) {
        falsePositives += 1; // Incorrectly flagged benign
      }
    });

    const falsePositiveRate = (falsePositives / benignRequests.length) * 100;

    console.log(`False Positives: ${falsePositives} / ${benignRequests.length}`);
    console.log(`False Positive Rate: ${falsePositiveRate.toFixed(2)}%`);

    // Target is <10% false positive rate
    expect(falsePositiveRate).toBeLessThan(10);
  });

  test('True Positive Rate (Malicious Requests)', () => {
    let truePositives = 0;

    // Run each malicious request through the detection pipeline
    maliciousRequests.forEach((request) => {
      if (detectionPipeline(request)) {
        truePositives += 1; // Correctly flagged malicious
      }
    });

    const truePositiveRate = (truePositives / maliciousRequests.length) * 100;

    console.log(`True Positives: ${truePositives} / ${maliciousRequests.length}`);
    console.log(`True Positive Rate: ${truePositiveRate.toFixed(2)}%`);

    // Target is >99% true positive rate
    expect(truePositiveRate).toBeGreaterThan(99);
  });
});