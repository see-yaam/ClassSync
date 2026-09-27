const controller = require('../src/controllers/submissionController');
const { calculateSimilarity } = require('../src/controllers/plagiarismController');

if (typeof controller.refreshHomeworkPlagiarismChecks !== 'function') {
  throw new Error('Missing refreshHomeworkPlagiarismChecks export');
}

const banglaA = 'আমি বাংলায় লিখছি। আমি খুব আনন্দিত।';
const banglaB = 'আমি বাংলায় লিখছি। আমি খুব আনন্দিত।';
const score = calculateSimilarity(banglaA, banglaB);

if (score < 99) {
  throw new Error(`Bangla similarity was ${score}, expected near 100`);
}

console.log('submission plagiarism refresh helper is available');
console.log('bangla similarity score:', score.toFixed(2));
