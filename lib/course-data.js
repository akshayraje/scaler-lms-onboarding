// Canonical course structure and the authoritative answer key for the final
// assessment. Grading happens here, server-side, so a learner editing the
// browser page cannot change their own score or pass/fail outcome.

const MODULE_COUNT = 15;
const PASS_THRESHOLD = 0.8; // 80%

// Index of each question's correct option (0-based), in the same order the
// frontend renders the 15 final-assessment questions.
const EXAM_ANSWER_KEY = [1, 1, 0, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function gradeExam(answers) {
  if (!Array.isArray(answers) || answers.length !== EXAM_ANSWER_KEY.length) {
    throw new Error('Invalid answer submission');
  }
  let score = 0;
  answers.forEach((a, i) => {
    if (a === EXAM_ANSWER_KEY[i]) score++;
  });
  const pct = Math.round((score / EXAM_ANSWER_KEY.length) * 100);
  const passed = score / EXAM_ANSWER_KEY.length >= PASS_THRESHOLD;
  return { score: pct, correctCount: score, total: EXAM_ANSWER_KEY.length, passed };
}

module.exports = { MODULE_COUNT, PASS_THRESHOLD, EXAM_ANSWER_KEY, gradeExam };
