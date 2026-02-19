const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Generate certificate for exam completion
 * @param {Object} student - Student object
 * @param {Object} exam - Exam object
 * @param {Object} result - Result object
 * @param {String} outputPath - Output file path
 */
exports.generateCertificate = async (student, exam, result, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Certificate background and border
      doc
        .lineWidth(10)
        .strokeColor('#1E3A8A')
        .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
        .stroke();

      doc
        .lineWidth(3)
        .strokeColor('#3B82F6')
        .rect(35, 35, doc.page.width - 70, doc.page.height - 70)
        .stroke();

      // Decorative corners
      const cornerSize = 40;
      doc
        .fillColor('#3B82F6')
        .circle(50, 50, cornerSize / 2)
        .fill()
        .circle(doc.page.width - 50, 50, cornerSize / 2)
        .fill()
        .circle(50, doc.page.height - 50, cornerSize / 2)
        .fill()
        .circle(doc.page.width - 50, doc.page.height - 50, cornerSize / 2)
        .fill();

      // Certificate Title
      doc
        .fontSize(48)
        .fillColor('#1E3A8A')
        .font('Helvetica-Bold')
        .text('CERTIFICATE', 0, 100, {
          align: 'center',
          width: doc.page.width,
        });

      doc
        .fontSize(22)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('of Achievement', 0, 160, {
          align: 'center',
          width: doc.page.width,
        });

      // Decorative line
      doc
        .moveTo(doc.page.width / 2 - 100, 200)
        .lineTo(doc.page.width / 2 + 100, 200)
        .strokeColor('#3B82F6')
        .lineWidth(2)
        .stroke();

      // This certifies text
      doc
        .fontSize(16)
        .fillColor('#4B5563')
        .font('Helvetica')
        .text('This is to certify that', 0, 230, {
          align: 'center',
          width: doc.page.width,
        });

      // Student name
      doc
        .fontSize(36)
        .fillColor('#1E3A8A')
        .font('Helvetica-Bold')
        .text(student.name.toUpperCase(), 0, 270, {
          align: 'center',
          width: doc.page.width,
        });

      // Registration / Enrollment number
      if (student.regNo || student.enrollmentNumber) {
        doc
          .fontSize(14)
          .fillColor('#6B7280')
          .font('Helvetica')
          .text(`(Reg No: ${student.regNo || student.enrollmentNumber})`, 0, 315, {
            align: 'center',
            width: doc.page.width,
          });
      }

      // Achievement text
      doc
        .fontSize(16)
        .fillColor('#4B5563')
        .font('Helvetica')
        .text('has successfully completed the examination', 0, 350, {
          align: 'center',
          width: doc.page.width,
        });

      // Exam title
      doc
        .fontSize(24)
        .fillColor('#3B82F6')
        .font('Helvetica-Bold')
        .text(exam.title, 0, 385, {
          align: 'center',
          width: doc.page.width,
        });

      // Subject
      if (exam.subject && exam.subject.name) {
        doc
          .fontSize(16)
          .fillColor('#6B7280')
          .font('Helvetica')
          .text(`Subject: ${exam.subject.name}`, 0, 425, {
            align: 'center',
            width: doc.page.width,
          });
      }

      // Performance box
      const boxY = 460;
      const boxWidth = 400;
      const boxX = (doc.page.width - boxWidth) / 2;

      doc
        .roundedRect(boxX, boxY, boxWidth, 60, 10)
        .fillColor('#EFF6FF')
        .fill()
        .strokeColor('#3B82F6')
        .lineWidth(1)
        .stroke();

      // Score
      doc
        .fontSize(20)
        .fillColor('#1E3A8A')
        .font('Helvetica-Bold')
        .text(
          `Score: ${result.score}/${exam.totalMarks}`,
          boxX,
          boxY + 15,
          {
            align: 'center',
            width: boxWidth,
          }
        );

      // Percentage and grade
      let grade = 'F';
      if (result.percentage >= 90) grade = 'A+';
      else if (result.percentage >= 80) grade = 'A';
      else if (result.percentage >= 70) grade = 'B+';
      else if (result.percentage >= 60) grade = 'B';
      else if (result.percentage >= 50) grade = 'C';
      else if (result.percentage >= 40) grade = 'D';

      doc
        .fontSize(16)
        .fillColor('#059669')
        .font('Helvetica')
        .text(
          `${result.percentage.toFixed(2)}% - Grade: ${grade}`,
          boxX,
          boxY + 38,
          {
            align: 'center',
            width: boxWidth,
          }
        );

      // Date
      const dateY = doc.page.height - 120;
      doc
        .fontSize(14)
        .fillColor('#4B5563')
        .font('Helvetica')
        .text(
          `Date of Issue: ${new Date(result.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          0,
          dateY,
          {
            align: 'center',
            width: doc.page.width,
          }
        );

      // Signature section
      const signY = doc.page.height - 80;
      const leftSignX = 150;
      const rightSignX = doc.page.width - 250;

      // Left signature line
      doc
        .moveTo(leftSignX, signY)
        .lineTo(leftSignX + 150, signY)
        .strokeColor('#6B7280')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(12)
        .fillColor('#4B5563')
        .font('Helvetica')
        .text('Authorized Signature', leftSignX, signY + 10, {
          width: 150,
          align: 'center',
        });

      // Right signature line (Date)
      doc
        .moveTo(rightSignX, signY)
        .lineTo(rightSignX + 150, signY)
        .strokeColor('#6B7280')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(12)
        .fillColor('#4B5563')
        .font('Helvetica')
        .text('Director/Principal', rightSignX, signY + 10, {
          width: 150,
          align: 'center',
        });

      // Watermark
      doc
        .fontSize(60)
        .fillColor('#F3F4F6')
        .font('Helvetica-Bold')
        .text('CERTIFIED', 0, doc.page.height / 2 - 30, {
          align: 'center',
          width: doc.page.width,
          opacity: 0.1,
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
