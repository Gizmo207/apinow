// Production Email Service using Resend
import { Resend } from 'resend';

// Initialize Resend (API key from environment variable)
const resend = new Resend(process.env.RESEND_API_KEY);

export interface WeeklyReportData {
  userName: string;
  userEmail: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
  period: string;
}

/**
 * Send weekly report email
 */
export async function sendWeeklyReport(data: WeeklyReportData) {
  try {
    const emailHtml = generateWeeklyReportHTML(data);
    
    const result = await resend.emails.send({
      from: 'APIFlow <notifications@apinow.dev>',
      to: data.userEmail,
      subject: `📊 Your Weekly API Report - ${data.period}`,
      html: emailHtml,
    });

    console.log('[Email] Weekly report sent to:', data.userEmail);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send weekly report:', error);
    return { success: false, error };
  }
}

/**
 * Send API usage alert
 */
export async function sendApiUsageAlert(userEmail: string, userName: string, percentage: number) {
  try {
    const result = await resend.emails.send({
      from: 'APIFlow <alerts@apinow.dev>',
      to: userEmail,
      subject: `⚠️ API Usage Alert - ${percentage}% of Rate Limit`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⚠️ API Usage Alert</h2>
          <p>Hi ${userName},</p>
          <p>Your API usage has reached <strong>${percentage}%</strong> of your rate limit.</p>
          <p>Consider upgrading your plan or optimizing your API calls to avoid service interruption.</p>
          <a href="https://yourdomain.com/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a>
        </div>
      `,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send usage alert:', error);
    return { success: false, error };
  }
}

/**
 * Send downtime alert
 */
export async function sendDowntimeAlert(userEmail: string, userName: string, endpoint: string) {
  try {
    const result = await resend.emails.send({
      from: 'APIFlow <alerts@apinow.dev>',
      to: userEmail,
      subject: `🔴 API Downtime Alert - ${endpoint}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">🔴 API Downtime Detected</h2>
          <p>Hi ${userName},</p>
          <p>Your API endpoint is currently experiencing issues:</p>
          <p><strong>${endpoint}</strong></p>
          <p>We'll notify you when service is restored.</p>
          <a href="https://yourdomain.com/analytics" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Analytics</a>
        </div>
      `,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send downtime alert:', error);
    return { success: false, error };
  }
}

/**
 * Send security alert
 */
export async function sendSecurityAlert(userEmail: string, userName: string, details: string) {
  try {
    const result = await resend.emails.send({
      from: 'APIFlow <security@apinow.dev>',
      to: userEmail,
      subject: `🔒 Security Alert - Suspicious Activity Detected`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🔒 Security Alert</h2>
          <p>Hi ${userName},</p>
          <p>We detected suspicious activity on your account:</p>
          <p><strong>${details}</strong></p>
          <p>If this wasn't you, please secure your account immediately.</p>
          <a href="https://yourdomain.com/settings" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review Security Settings</a>
        </div>
      `,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send security alert:', error);
    return { success: false, error };
  }
}

/**
 * Generate HTML for weekly report email
 */
function generateWeeklyReportHTML(data: WeeklyReportData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly API Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">📊 Weekly API Report</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">${data.period}</p>
        </div>

        <!-- Greeting -->
        <p style="color: #374151; font-size: 16px;">Hi ${data.userName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Here's your weekly API performance summary. Great work this week!
        </p>

        <!-- Stats Cards -->
        <div style="margin: 30px 0;">
          <!-- Total Requests -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
            <div style="color: #1e40af; font-size: 14px; font-weight: 600; margin-bottom: 5px;">TOTAL REQUESTS</div>
            <div style="color: #1f2937; font-size: 32px; font-weight: bold;">${data.totalRequests.toLocaleString()}</div>
          </div>

          <!-- Success Rate -->
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
            <div style="color: #065f46; font-size: 14px; font-weight: 600; margin-bottom: 5px;">SUCCESS RATE</div>
            <div style="color: #1f2937; font-size: 32px; font-weight: bold;">${data.successRate}%</div>
          </div>

          <!-- Avg Response Time -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
            <div style="color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 5px;">AVG RESPONSE TIME</div>
            <div style="color: #1f2937; font-size: 32px; font-weight: bold;">${data.avgResponseTime}ms</div>
          </div>
        </div>

        <!-- Top Endpoints -->
        ${data.topEndpoints.length > 0 ? `
        <div style="margin: 30px 0;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px;">🔥 Top Endpoints</h2>
          ${data.topEndpoints.map((ep, index) => `
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-radius: 4px; margin-bottom: 8px;">
              <span style="color: #374151; font-size: 14px;">${ep.endpoint}</span>
              <span style="color: #6b7280; font-weight: 600; font-size: 14px;">${ep.count} calls</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://yourdomain.com/analytics" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Full Analytics</a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            You're receiving this because you subscribed to weekly reports.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            <a href="https://yourdomain.com/settings" style="color: #3b82f6; text-decoration: none;">Manage notification preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
