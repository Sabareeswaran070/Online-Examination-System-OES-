const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF report for exam results
 * @param {Object} exam - Exam object
 * @param {Array} results - Array of result objects
 * @param {String} outputPath - Path to save PDF
 */
exports.generateExamReport = async (exam, results, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .text('Exam Results Report', { align: 'center' })
        .moveDown();

      // Exam Details
      doc
        .fontSize(12)
        .text(`Exam Title: ${exam.title}`, { bold: true })
        .text(`Subject: ${exam.subject.name}`)
        .text(`Total Marks: ${exam.totalMarks}`)
        .text(`Passing Marks: ${exam.passingMarks}`)
        .text(`Total Attempts: ${results.length}`)
        .moveDown();

      // Statistics
      const avgScore =
        results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const passCount = results.filter((r) => r.isPassed).length;
      const passPercentage = ((passCount / results.length) * 100).toFixed(2);

      doc
        .fontSize(14)
        .text('Statistics', { underline: true })
        .fontSize(12)
        .text(`Average Score: ${avgScore.toFixed(2)}`)
        .text(`Pass Count: ${passCount} / ${results.length}`)
        .text(`Pass Percentage: ${passPercentage}%`)
        .moveDown();

      // Results Table Header
      doc.fontSize(14).text('Student Results', { underline: true }).moveDown();

      const tableTop = doc.y;
      const tableHeaders = ['Rank', 'Name', 'Enrollment', 'Score', 'Percentage', 'Status'];
      const columnWidths = [50, 150, 100, 70, 90, 80];
      let x = 50;

      // Draw table headers
      tableHeaders.forEach((header, i) => {
        doc.fontSize(10).text(header, x, tableTop, {
          width: columnWidths[i],
          align: 'left',
        });
        x += columnWidths[i];
      });

      doc.moveDown();
      let y = doc.y;

      // Draw table rows
      results.forEach((result, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        x = 50;
        const rowData = [
          (index + 1).toString(),
          result.studentId.name,
          result.studentId.regNo || result.studentId.enrollmentNumber || 'N/A',
          result.score.toString(),
          `${result.percentage.toFixed(2)}%`,
          result.isPassed ? 'Pass' : 'Fail',
        ];

        rowData.forEach((data, i) => {
          doc.fontSize(9).text(data, x, y, {
            width: columnWidths[i],
            align: 'left',
          });
          x += columnWidths[i];
        });

        y += 20;
        doc.y = y;
      });

      // Footer
      doc
        .moveDown()
        .fontSize(8)
        .text(
          `Generated on: ${new Date().toLocaleDateString()}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF certificate for student
 * @param {Object} student - Student object
 * @param {Object} exam - Exam object
 * @param {Object} result - Result object
 * @param {String} outputPath - Path to save PDF
 */
exports.generateCertificate = async (student, exam, result, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 50,
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Certificate Border
      doc
        .lineWidth(5)
        .strokeColor('#4A90E2')
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke();

      doc
        .lineWidth(2)
        .strokeColor('#4A90E2')
        .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
        .stroke();

      // Certificate Title
      doc
        .fontSize(40)
        .fillColor('#2C3E50')
        .text('CERTIFICATE', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(20)
        .fillColor('#34495E')
        .text('of Achievement', { align: 'center' })
        .moveDown(2);

      // This is to certify
      doc
        .fontSize(14)
        .fillColor('#7F8C8D')
        .text('This is to certify that', { align: 'center' })
        .moveDown(0.5);

      // Student Name
      doc
        .fontSize(30)
        .fillColor('#2C3E50')
        .text(student.name.toUpperCase(), { align: 'center' })
        .moveDown(0.5);

      // Achievement text
      doc
        .fontSize(14)
        .fillColor('#7F8C8D')
        .text('has successfully completed the examination', {
          align: 'center',
        })
        .moveDown(0.5);

      // Exam Title
      doc
        .fontSize(18)
        .fillColor('#4A90E2')
        .text(exam.title, { align: 'center' })
        .moveDown(0.5);

      // Score and Percentage
      doc
        .fontSize(16)
        .fillColor('#27AE60')
        .text(
          `Score: ${result.score}/${exam.totalMarks} (${result.percentage.toFixed(2)}%)`,
          { align: 'center' }
        )
        .moveDown(0.5);

      // Date
      doc
        .fontSize(12)
        .fillColor('#7F8C8D')
        .text(`Date: ${new Date(result.submittedAt).toLocaleDateString()}`, {
          align: 'center',
        })
        .moveDown(2);

      // Signature line
      const signatureY = doc.page.height - 150;
      doc
        .moveTo(150, signatureY)
        .lineTo(300, signatureY)
        .stroke()
        .moveTo(doc.page.width - 300, signatureY)
        .lineTo(doc.page.width - 150, signatureY)
        .stroke();

      doc
        .fontSize(12)
        .fillColor('#2C3E50')
        .text('Authorized Signature', 150, signatureY + 10, {
          width: 150,
          align: 'center',
        })
        .text('Date', doc.page.width - 300, signatureY + 10, {
          width: 150,
          align: 'center',
        });

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
