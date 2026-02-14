/**
 * Email Service
 * Configure with a real email service like SendGrid, Nodemailer, etc.
 * This is a placeholder implementation
 */

const logger = require('../config/logger');

/**
 * Send email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Email text content
 * @param {String} options.html - Email HTML content
 */
exports.sendEmail = async (options) => {
  try {
    // TODO: Implement actual email sending with a service like:
    // - Nodemailer with SMTP
    // - SendGrid
    // - Amazon SES
    // - Mailgun
    // etc.

    logger.info(`Email would be sent to: ${options.to}`);
    logger.info(`Subject: ${options.subject}`);

    // Placeholder - Log email content instead of actually sending
    console.log('\n=== EMAIL ===');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Content:\n${options.text || options.html}`);
    console.log('=============\n');

    return true;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (user, tempPassword = null) => {
  const subject = 'Welcome to Online Examination System';
  const text = `
Hello ${user.name},

Welcome to the Online Examination System!

Your account has been created successfully.

Email: ${user.email}
Role: ${user.role}
${tempPassword ? `Temporary Password: ${tempPassword}` : ''}

${tempPassword ? 'Please change your password after your first login.' : ''}

Best regards,
Online Examination System Team
  `;

  await exports.sendEmail({
    to: user.email,
    subject,
    text,
  });
};

/**
 * Send exam notification email
 */
exports.sendExamNotification = async (student, exam) => {
  const subject = `Exam Scheduled: ${exam.title}`;
  const text = `
Hello ${student.name},

A new exam has been scheduled for you.

Exam: ${exam.title}
Subject: ${exam.subject.name}
Start Time: ${new Date(exam.startTime).toLocaleString()}
Duration: ${exam.duration} minutes
Total Marks: ${exam.totalMarks}

Please make sure to be available at the scheduled time.

Best regards,
Online Examination System Team
  `;

  await exports.sendEmail({
    to: student.email,
    subject,
    text,
  });
};

/**
 * Send result notification email
 */
exports.sendResultNotification = async (student, exam, result) => {
  const subject = `Exam Result: ${exam.title}`;
  const text = `
Hello ${student.name},

Your exam result is now available.

Exam: ${exam.title}
Subject: ${exam.subject.name}
Score: ${result.score}/${exam.totalMarks}
Percentage: ${result.percentage.toFixed(2)}%
Status: ${result.isPassed ? 'PASSED' : 'FAILED'}

You can view your detailed results by logging into the system.

Best regards,
Online Examination System Team
  `;

  await exports.sendEmail({
    to: student.email,
    subject,
    text,
  });
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const subject = 'Password Reset Request';
  const text = `
Hello ${user.name},

You have requested to reset your password.

Please use the following token to reset your password:
${resetToken}

This token will expire in 1 hour.

If you did not request this, please ignore this email.

Best regards,
Online Examination System Team
  `;

  await exports.sendEmail({
    to: user.email,
    subject,
    text,
  });
};

/**
 * Send bulk email
 */
exports.sendBulkEmail = async (recipients, subject, text) => {
  try {
    const promises = recipients.map((recipient) =>
      exports.sendEmail({
        to: recipient,
        subject,
        text,
      })
    );

    await Promise.all(promises);
    logger.info(`Bulk email sent to ${recipients.length} recipients`);
  } catch (error) {
    logger.error('Error sending bulk email:', error);
    throw error;
  }
};
