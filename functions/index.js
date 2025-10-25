const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

setGlobalOptions({ maxInstances: 10 });

// Email configuration
// For production, use environment variables: firebase functions:config:set
const EMAIL_CONFIG = {
  service: 'gmail', // or 'sendgrid', 'mailgun', etc.
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

/**
 * Send welcome email when new user signs up
 * Triggers on new user document creation in Firestore
 */
exports.sendWelcomeEmail = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const userData = event.data.data();
    const userEmail = userData.email;
    const userName = userData.displayName || userEmail.split('@')[0];

    logger.info(`Sending welcome email to ${userEmail}`);

    const mailOptions = {
      from: `APIFlow Team <${EMAIL_CONFIG.auth.user}>`,
      to: userEmail,
      subject: '🎉 Welcome to APIFlow!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Welcome to APIFlow!</h1>
              </div>
              <div class="content">
                <h2>Hi ${userName}! 👋</h2>
                <p>Thank you for joining <strong>APIFlow</strong> - your go-to platform for turning databases into powerful REST APIs in minutes!</p>
                
                <h3>🎯 What you can do now:</h3>
                <ul>
                  <li>✅ Connect your databases (Firebase, MySQL, PostgreSQL, SQLite)</li>
                  <li>✅ Generate REST APIs automatically from your schema</li>
                  <li>✅ Test endpoints with our built-in API tester</li>
                  <li>✅ View auto-generated documentation</li>
                  <li>✅ Monitor analytics and usage</li>
                </ul>

                <p style="text-align: center;">
                  <a href="http://localhost:3000/dashboard" class="button">Go to Dashboard →</a>
                </p>

                <h3>💡 Getting Started Tips:</h3>
                <ol>
                  <li>Connect your first database from the Databases page</li>
                  <li>Explore your schema with Schema Explorer</li>
                  <li>Generate APIs with our Unified API Builder</li>
                  <li>Test your endpoints immediately</li>
                </ol>

                <p>Need help? Check out our <a href="#">documentation</a> or reach out to our support team.</p>
                
                <p>Happy building! 🎨</p>
                <p><strong>The APIFlow Team</strong></p>
              </div>
              <div class="footer">
                <p>This email was sent to ${userEmail}</p>
                <p>© 2025 APIFlow. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent successfully to ${userEmail}`);
      return {success: true};
    } catch (error) {
      logger.error(`Error sending welcome email to ${userEmail}:`, error);
      return {success: false, error: error.message};
    }
  }
);
