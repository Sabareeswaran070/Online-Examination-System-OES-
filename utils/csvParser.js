const fs = require('fs');
const csv = require('csv-parser');

/**
 * Parse CSV file for bulk student upload
 * @param {String} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of student objects
 */
exports.parseStudentCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const students = [];
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Validate required fields
          if (!row.name || !row.email) {
            errors.push({
              row: students.length + 1,
              error: 'Name and Email are required fields',
            });
            return;
          }

          // Email validation
          const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
          if (!emailRegex.test(row.email)) {
            errors.push({
              row: students.length + 1,
              error: `Invalid email format: ${row.email}`,
            });
            return;
          }

          students.push({
            name: row.name.trim(),
            email: row.email.trim().toLowerCase(),
            password: row.password || 'Student@123',
            departmentId: row.departmentId,
            enrollmentNumber: row.enrollmentNumber,
            phone: row.phone,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
          });
        } catch (error) {
          errors.push({
            row: students.length + 1,
            error: error.message,
          });
        }
      })
      .on('end', () => {
        if (errors.length > 0) {
          reject({ students, errors });
        } else {
          resolve(students);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Parse CSV file for bulk question upload
 * @param {String} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of question objects
 */
exports.parseQuestionCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const questions = [];
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const index = questions.length + 1;

          if (!row.questionText || !row.type || !row.marks) {
            errors.push({ row: index, error: 'Question text, type, and marks are required' });
            return;
          }

          const question = {
            questionText: row.questionText.trim(),
            type: row.type.trim(),
            marks: Number(row.marks),
            difficulty: (row.difficulty || 'medium').trim().toLowerCase(),
            subject: row.subjectId ? row.subjectId.trim() : undefined,
            explanation: row.explanation ? row.explanation.trim() : '',
          };

          // Handle MCQ Options
          if (row.type === 'MCQ') {
            const options = [];
            const correctIdx = Number(row.correctAnswerIndex);

            for (let i = 1; i <= 6; i++) {
              const optText = row[`option${i}`];
              if (optText) {
                options.push({
                  text: optText.trim(),
                  isCorrect: (i - 1) === correctIdx
                });
              }
            }

            if (options.length < 2) {
              errors.push({ row: index, error: 'MCQ must have at least 2 options' });
              return;
            }
            question.options = options;
          }

          // Handle True/False
          if (row.type === 'TrueFalse') {
            const isTrue = (row.correctAnswer || '').toLowerCase() === 'true';
            question.options = [
              { text: 'True', isCorrect: isTrue },
              { text: 'False', isCorrect: !isTrue }
            ];
          }

          questions.push(question);
        } catch (error) {
          errors.push({ row: questions.length + 1, error: error.message });
        }
      })
      .on('end', () => {
        if (errors.length > 0) reject({ questions, errors });
        else resolve(questions);
      })
      .on('error', (error) => reject(error));
  });
};

/**
 * Validate CSV headers
 * @param {String} filePath - Path to CSV file
 * @param {Array} requiredHeaders - Array of required header names
 * @returns {Promise<Boolean>}
 */
exports.validateCSVHeaders = (filePath, requiredHeaders) => {
  return new Promise((resolve, reject) => {
    const headers = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers.push(...headerList);
      })
      .on('end', () => {
        const missingHeaders = requiredHeaders.filter(
          (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
          resolve({
            valid: false,
            missingHeaders,
          });
        } else {
          resolve({
            valid: true,
            headers,
          });
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} headers - Array of header names
 * @returns {String} CSV string
 */
exports.arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return '';
  }

  const csvHeaders = headers || Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(csvHeaders.join(','));

  // Add data rows
  for (const row of data) {
    const values = csvHeaders.map((header) => {
      const value = row[header];
      const escaped = ('' + value).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};
