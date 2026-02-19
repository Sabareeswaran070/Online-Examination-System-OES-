const ExcelJS = require('exceljs');

/**
 * Generate Excel report for exam results
 * @param {Object} exam - Exam object
 * @param {Array} results - Array of result objects
 * @param {String} outputPath - Path to save Excel file
 */
exports.generateExamResultsExcel = async (exam, results, outputPath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exam Results');

    // Set column widths
    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Enrollment Number', key: 'enrollment', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Score', key: 'score', width: 12 },
      { header: 'Total Marks', key: 'totalMarks', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Time Taken (min)', key: 'timeTaken', width: 18 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add exam information at the top
    worksheet.insertRow(1, ['Exam Results Report']);
    worksheet.mergeCells('A1:J1');
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.insertRow(2, ['']);
    worksheet.insertRow(3, ['Exam Title:', exam.title]);
    worksheet.insertRow(4, ['Subject:', exam.subject.name || 'N/A']);
    worksheet.insertRow(5, ['Total Marks:', exam.totalMarks]);
    worksheet.insertRow(6, ['Passing Marks:', exam.passingMarks]);
    worksheet.insertRow(7, ['Total Attempts:', results.length]);

    // Calculate statistics
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const passCount = results.filter((r) => r.isPassed).length;
    const passPercentage = ((passCount / results.length) * 100).toFixed(2);

    worksheet.insertRow(8, ['Average Score:', avgScore.toFixed(2)]);
    worksheet.insertRow(9, ['Pass Count:', `${passCount} / ${results.length}`]);
    worksheet.insertRow(10, ['Pass Percentage:', `${passPercentage}%`]);
    worksheet.insertRow(11, ['']);

    // Add data rows
    results.forEach((result, index) => {
      worksheet.addRow({
        rank: index + 1,
        name: result.studentId.name,
        enrollment: result.studentId.regNo || result.studentId.enrollmentNumber || 'N/A',
        email: result.studentId.email,
        score: result.score,
        totalMarks: exam.totalMarks,
        percentage: `${result.percentage.toFixed(2)}%`,
        status: result.isPassed ? 'Pass' : 'Fail',
        timeTaken: result.totalTimeTaken || 'N/A',
        submittedAt: new Date(result.submittedAt).toLocaleString(),
      });
    });

    // Apply conditional formatting for pass/fail
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 12) {
        // Data rows start after header
        const statusCell = row.getCell(8);
        if (statusCell.value === 'Pass') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF27AE60' },
          };
          statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else if (statusCell.value === 'Fail') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE74C3C' },
          };
          statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
      }
    });

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate Excel template for bulk student upload
 * @param {String} outputPath - Path to save Excel file
 */
exports.generateStudentUploadTemplate = async (outputPath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Upload Template');

    // Set column headers
    worksheet.columns = [
      { header: 'Name *', key: 'name', width: 25 },
      { header: 'Email *', key: 'email', width: 30 },
      { header: 'Password', key: 'password', width: 20 },
      { header: 'Department ID *', key: 'departmentId', width: 25 },
      { header: 'Reg No', key: 'regNo', width: 20 },
      { header: 'Enrollment Number', key: 'enrollmentNumber', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 25 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add sample data
    worksheet.addRow({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'Student@123',
      departmentId: '60d5ec49f1b2c72b8c8e4f1a',
      regNo: 'REG2024001',
      enrollmentNumber: 'STU2024001',
      phone: '1234567890',
      dateOfBirth: '2000-01-15',
    });

    worksheet.addRow({
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      password: 'Student@123',
      departmentId: '60d5ec49f1b2c72b8c8e4f1a',
      regNo: 'REG2024002',
      enrollmentNumber: 'STU2024002',
      phone: '9876543210',
      dateOfBirth: '1999-05-20',
    });

    // Add instructions
    worksheet.insertRow(1, ['Instructions:']);
    worksheet.insertRow(2, [
      '1. Fields marked with * are mandatory',
    ]);
    worksheet.insertRow(3, [
      '2. If password is not provided, default password "Student@123" will be used',
    ]);
    worksheet.insertRow(4, [
      '3. Department ID must be a valid MongoDB ObjectId',
    ]);
    worksheet.insertRow(5, ['4. Delete these instruction rows before uploading']);
    worksheet.insertRow(6, ['']);

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate performance report Excel
 * @param {Object} student - Student object
 * @param {Array} results - Array of result objects
 * @param {String} outputPath - Path to save Excel file
 */
exports.generateStudentPerformanceReport = async (student, results, outputPath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Performance Report');

    // Student Info
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'Student Performance Report';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A3').value = 'Student Name:';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('B3').value = student.name;

    worksheet.getCell('A4').value = 'Reg No:';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('B4').value = student.regNo || student.enrollmentNumber || 'N/A';

    worksheet.getCell('A5').value = 'Email:';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('B5').value = student.email;

    worksheet.addRow([]);

    // Results table
    worksheet.columns = [
      { header: 'Exam Title', key: 'title', width: 30 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Score', key: 'score', width: 12 },
      { header: 'Total Marks', key: 'totalMarks', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    worksheet.getRow(7).font = { bold: true };
    worksheet.getRow(7).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    };

    results.forEach((result) => {
      worksheet.addRow({
        title: result.examId.title,
        subject: result.examId.subject.name || 'N/A',
        score: result.score,
        totalMarks: result.examId.totalMarks,
        percentage: `${result.percentage.toFixed(2)}%`,
        status: result.isPassed ? 'Pass' : 'Fail',
      });
    });

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  } catch (error) {
    throw error;
  }
};
