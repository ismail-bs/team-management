import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter, SentMessageInfo } from 'nodemailer';

export interface InviteEmailData {
  to: string;
  firstName: string;
  lastName: string;
  inviteToken: string;
  invitedByName?: string;
}

export interface WelcomeEmailData {
  to: string;
  firstName: string;
  lastName: string;
}

export interface ProjectAssignmentEmailData {
  to: string;
  firstName: string;
  lastName: string;
  projectName: string;
  projectDescription: string;
  projectManagerName: string;
  role: 'project_manager' | 'member';
  dueDate?: string;
  priority?: string;
}

export interface MeetingInvitationEmailData {
  to: string;
  firstName: string;
  lastName: string;
  meetingTitle: string;
  meetingDescription?: string;
  meetingType: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  organizerName: string;
}

export interface DocumentShareEmailData {
  to: string;
  firstName: string;
  lastName: string;
  documentName: string;
  documentDescription?: string;
  sharedByName: string;
  documentUrl: string;
}

/**
 * Email service for sending transactional emails
 * Uses Nodemailer with support for multiple providers (Gmail, SendGrid, AWS SES, etc.)
 *
 * Configuration via environment variables:
 * - EMAIL_HOST: SMTP host (e.g., smtp.gmail.com)
 * - EMAIL_PORT: SMTP port (e.g., 587)
 * - EMAIL_USER: SMTP username/email
 * - EMAIL_PASSWORD: SMTP password/app password
 * - EMAIL_FROM: Sender email address
 * - FRONTEND_URL: Frontend URL for generating invite links
 */
@Injectable()
export class EmailService {
  private transporter: Transporter;
  private logger: Logger = new Logger('EmailService');
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'noreply@teammanagement.com';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on configuration
   * Supports multiple providers through SMTP configuration
   */
  private initializeTransporter() {
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT');
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

    if (!emailHost || !emailUser || !emailPassword) {
      this.logger.warn('============================================');
      this.logger.warn('📧 EMAIL SERVICE - DEVELOPMENT MODE');
      this.logger.warn('============================================');
      this.logger.warn('Email service not configured properly.');
      this.logger.warn('Missing: EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD');
      this.logger.warn('Emails will be LOGGED TO CONSOLE only.');
      this.logger.warn('To enable email sending, add these to .env:');
      this.logger.warn('  EMAIL_HOST=smtp.gmail.com');
      this.logger.warn('  EMAIL_PORT=587');
      this.logger.warn('  EMAIL_USER=your-email@gmail.com');
      this.logger.warn('  EMAIL_PASSWORD=your-app-password');
      this.logger.warn('============================================');

      // Create a test transporter for development (logs only)
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return;
    }

    // Production SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort || 587,
      secure: emailPort === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    this.logger.log('============================================');
    this.logger.log('✅ EMAIL SERVICE - PRODUCTION MODE');
    this.logger.log('============================================');
    this.logger.log(`📧 SMTP Host: ${emailHost}`);
    this.logger.log(`📧 SMTP Port: ${emailPort || 587}`);
    this.logger.log(`📧 SMTP User: ${emailUser}`);
    this.logger.log(`📧 From Email: ${this.fromEmail}`);
    this.logger.log('============================================');
  }

  /**
   * Send invitation email to new team member
   * Includes personalized greeting and secure invite link
   */
  async sendInviteEmail(data: InviteEmailData): Promise<void> {
    const inviteLink = `${this.frontendUrl}/accept-invite?token=${data.inviteToken}`;

    const htmlContent = this.getInviteEmailTemplate({
      ...data,
      inviteLink,
    });

    const mailOptions = {
      from: `Team Management Platform <${this.fromEmail}>`,
      to: data.to,
      subject: "🎉 You're invited to join the team!",
      html: htmlContent,
      text: this.getInviteEmailTextVersion(data, inviteLink),
    };

    try {
      this.logger.log('============================================');
      this.logger.log('📧 SENDING INVITATION EMAIL');
      this.logger.log('============================================');
      this.logger.log(`To: ${data.to}`);
      this.logger.log(`Name: ${data.firstName} ${data.lastName}`);
      this.logger.log(`Invited By: ${data.invitedByName || 'Admin'}`);

      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);

      if (info && info.envelope) {
        // Production mode - email actually sent
        this.logger.log('✅ Email sent successfully via SMTP');
        this.logger.log(`Message ID: ${info.messageId}`);
        this.logger.log(`Accepted: ${info.accepted?.join(', ')}`);
        this.logger.log('============================================');
      } else {
        // Development mode - email logged only
        this.logger.warn('⚠️  DEVELOPMENT MODE - Email NOT sent via SMTP');
        this.logger.warn('📋 Email details logged below:');
        this.logger.warn('--------------------------------------------');
        this.logger.warn(`Subject: ${mailOptions.subject}`);
        this.logger.warn(`Invite Link: ${inviteLink}`);
        this.logger.warn('--------------------------------------------');
        this.logger.warn(
          '💡 To actually send emails, configure EMAIL_* in .env',
        );
        this.logger.warn('============================================');
      }
    } catch (error) {
      this.logger.error('============================================');
      this.logger.error('❌ FAILED TO SEND EMAIL');
      this.logger.error('============================================');
      this.logger.error(`To: ${data.to}`);
      this.logger.error(`Error: ${(error as Error).message}`);
      this.logger.error('============================================');
      this.logger.error('💡 Troubleshooting:');
      this.logger.error(
        '1. Check EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env',
      );
      this.logger.error(
        '2. For Gmail: Use App Password (not regular password)',
      );
      this.logger.error('3. Check if port 587 is blocked by firewall');
      this.logger.error('4. Verify SMTP credentials are correct');
      this.logger.error('============================================');
      throw new Error('Failed to send invitation email');
    }
  }

  /**
   * Send welcome email after user activates account
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const htmlContent = this.getWelcomeEmailTemplate(data);

    const mailOptions = {
      from: `Team Management Platform <${this.fromEmail}>`,
      to: data.to,
      subject: '🎊 Welcome to the Team!',
      html: htmlContent,
      text: `Welcome to the team, ${data.firstName}! We're excited to have you on board.`,
    };

    try {
      this.logger.log('📧 Sending welcome email to:', data.to);

      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);

      if (info && info.envelope) {
        this.logger.log(`✅ Welcome email sent successfully to ${data.to}`);
      } else {
        this.logger.warn(
          `⚠️  [DEV MODE] Welcome email logged (not sent) to ${data.to}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send welcome email to ${data.to}:`,
        (error as Error).message,
      );
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Send project assignment email to team member or project manager
   */
  async sendProjectAssignmentEmail(
    data: ProjectAssignmentEmailData,
  ): Promise<void> {
    const projectLink = `${this.frontendUrl}/progress-tracker`;
    const htmlContent = this.getProjectAssignmentEmailTemplate({
      ...data,
      projectLink,
    });

    const roleText =
      data.role === 'project_manager' ? 'Project Manager' : 'Team Member';
    const subject = `🚀 New Project Assignment: ${data.projectName}`;

    const mailOptions = {
      from: `Team Management Platform <${this.fromEmail}>`,
      to: data.to,
      subject,
      html: htmlContent,
      text: `You've been assigned to ${data.projectName} as ${roleText}. Visit ${projectLink} to view details.`,
    };

    try {
      this.logger.log('📧 Sending project assignment email to:', data.to);

      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);

      if (info && info.envelope) {
        this.logger.log(
          `✅ Project assignment email sent successfully to ${data.to}`,
        );
        this.logger.log(`📝 Message ID: ${info.messageId}`);
      } else {
        this.logger.warn(
          `⚠️  [DEV MODE] Project assignment email logged (not sent) to ${data.to}`,
        );
        this.logger.warn(`📝 Project: ${data.projectName}`);
        this.logger.warn(`👤 Role: ${roleText}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send project assignment email to ${data.to}:`,
        (error as Error).message,
      );
      // Don't throw - project assignment email is not critical
    }
  }

  /**
   * HTML template for invitation email
   */
  private getInviteEmailTemplate(
    data: InviteEmailData & { inviteLink: string },
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎉 You're Invited!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px;">
                Hello ${data.firstName} ${data.lastName},
              </h2>
              
              <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.6;">
                ${data.invitedByName ? `<strong>${data.invitedByName}</strong> has invited you to` : 'You have been invited to'} join the Team Management Platform. We're excited to have you on board!
              </p>
              
              <p style="margin: 0 0 25px; color: #666666; font-size: 16px; line-height: 1.6;">
                Click the button below to accept your invitation and set up your account:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.inviteLink}" 
                       style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 15px; color: #666666; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 25px; padding: 12px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea;">
                ${data.inviteLink}
              </p>
              
              <div style="margin: 30px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> This invitation will expire in 24 hours. Please accept it soon!
                </p>
              </div>
              
              <p style="margin: 25px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 12px;">
                Team Management Platform
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Plain text version of invitation email (for email clients that don't support HTML)
   */
  private getInviteEmailTextVersion(
    data: InviteEmailData,
    inviteLink: string,
  ): string {
    return `
Hello ${data.firstName} ${data.lastName},

${data.invitedByName ? `${data.invitedByName} has invited you to` : 'You have been invited to'} join the Team Management Platform. We're excited to have you on board!

To accept your invitation and set up your account, please visit:
${inviteLink}

⚠️ Important: This invitation will expire in 24 hours. Please accept it soon!

If you didn't expect this invitation, you can safely ignore this email.

---
Team Management Platform
This is an automated message. Please do not reply to this email.
    `.trim();
  }

  /**
   * HTML template for welcome email
   */
  private getWelcomeEmailTemplate(data: WelcomeEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Team!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎊 Welcome to the Team!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px;">
                Hi ${data.firstName},
              </h2>
              
              <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.6;">
                Welcome aboard! 🚀 We're thrilled to have you join our team.
              </p>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You can now access the platform and start collaborating with your team. Here's what you can do:
              </p>
              
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #666666; font-size: 15px; line-height: 1.8;">
                <li>View and manage your assigned projects</li>
                <li>Collaborate with team members in real-time chat</li>
                <li>Track tasks and progress</li>
                <li>Schedule and join meetings</li>
                <li>Share and manage documents</li>
              </ul>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${this.frontendUrl}" 
                       style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                Need help? Feel free to reach out to your team administrator.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Team Management Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send meeting invitation email to participants
   */
  async sendMeetingInvitationEmail(
    data: MeetingInvitationEmailData,
  ): Promise<void> {
    const htmlContent = this.getMeetingInvitationEmailTemplate(data);
    const subject = `📅 Meeting Invitation: ${data.meetingTitle}`;

    const mailOptions = {
      from: `Team Management Platform <${this.fromEmail}>`,
      to: data.to,
      subject,
      html: htmlContent,
      text: `You're invited to ${data.meetingTitle} on ${new Date(data.startTime).toLocaleString()}`,
    };

    try {
      this.logger.log('📧 Sending meeting invitation email to:', data.to);

      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);

      if (info && info.envelope) {
        this.logger.log(
          `✅ Meeting invitation email sent successfully to ${data.to}`,
        );
        this.logger.log(`📝 Message ID: ${info.messageId}`);
      } else {
        this.logger.warn(
          `⚠️  [DEV MODE] Meeting invitation email logged (not sent) to ${data.to}`,
        );
        this.logger.warn(`📝 Meeting: ${data.meetingTitle}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send meeting invitation email to ${data.to}:`,
        (error as Error).message,
      );
      // Don't throw - meeting invitation email is not critical
    }
  }

  /**
   * HTML template for project assignment email
   */
  private getProjectAssignmentEmailTemplate(
    data: ProjectAssignmentEmailData & { projectLink: string },
  ): string {
    const roleText =
      data.role === 'project_manager' ? 'Project Manager' : 'Team Member';
    const roleBadgeColor =
      data.role === 'project_manager' ? '#3b82f6' : '#10b981';
    const priorityColors: Record<string, string> = {
      urgent: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981',
    };
    const priorityColor = data.priority
      ? priorityColors[data.priority] || '#6b7280'
      : '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project Assignment</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🚀 New Project Assignment
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px;">
                Hi ${data.firstName},
              </h2>
              
              <p style="margin: 0 0 25px; color: #666666; font-size: 16px; line-height: 1.6;">
                You've been assigned to a new project as <strong style="color: ${roleBadgeColor};">${roleText}</strong>!
              </p>

              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 2px; margin: 0 0 25px;">
                <div style="background: #ffffff; border-radius: 6px; padding: 25px;">
                  <h3 style="margin: 0 0 15px; color: #667eea; font-size: 24px; font-weight: bold;">
                    ${data.projectName}
                  </h3>
                  
                  <p style="margin: 0 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">
                    ${data.projectDescription}
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 10px 0;">
                        <strong style="color: #333333; font-size: 14px;">👤 Project Manager:</strong>
                        <p style="margin: 5px 0 0; color: #666666; font-size: 14px;">${data.projectManagerName}</p>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${data.projectLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      View Project Details →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 0 0 20px; border-radius: 4px;">
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  💡 <strong>Next Steps:</strong><br>
                  • Review the project details and requirements<br>
                  • Check your assigned tasks<br>
                  • Join the project team chat for collaboration
                </p>
              </div>

              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If you have any questions about this project, please reach out to ${data.projectManagerName} or your team administrator.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; font-weight: 600;">
                Team Management Platform
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * HTML template for meeting invitation email
   */
  private getMeetingInvitationEmailTemplate(
    data: MeetingInvitationEmailData,
  ): string {
    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);
    const meetingDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTimeStr = endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📅 Meeting Invitation
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 20px;">
                Hi ${data.firstName},
              </h2>
              
              <p style="margin: 0 0 25px; color: #666666; font-size: 16px; line-height: 1.6;">
                You've been invited to join a ${data.meetingType.replace('-', ' ')}!
              </p>

              <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 8px; padding: 2px; margin: 0 0 25px;">
                <div style="background: #ffffff; border-radius: 6px; padding: 25px;">
                  <h3 style="margin: 0 0 15px; color: #3b82f6; font-size: 22px; font-weight: bold;">
                    ${data.meetingTitle}
                  </h3>
                  
                  ${data.meetingDescription ? `<p style="margin: 0 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">${data.meetingDescription}</p>` : ''}

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                    <tr>
                      <td style="padding: 10px 0;">
                        <div style="display: flex; align-items: center;">
                          <strong style="color: #333333; font-size: 14px;">📅 Date:</strong>
                          <p style="margin: 0 0 0 8px; color: #666666; font-size: 14px;">${meetingDate}</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;">
                        <div style="display: flex; align-items: center;">
                          <strong style="color: #333333; font-size: 14px;">🕐 Time:</strong>
                          <p style="margin: 0 0 0 8px; color: #666666; font-size: 14px;">${startTimeStr} - ${endTimeStr}</p>
                        </div>
                      </td>
                    </tr>
                    ${
                      data.location
                        ? `
                    <tr>
                      <td style="padding: 10px 0;">
                        <div style="display: flex; align-items: center;">
                          <strong style="color: #333333; font-size: 14px;">📍 Location:</strong>
                          <p style="margin: 0 0 0 8px; color: #666666; font-size: 14px;">${data.location}</p>
                        </div>
                      </td>
                    </tr>
                    `
                        : ''
                    }
                    <tr>
                      <td style="padding: 10px 0;">
                        <div style="display: flex; align-items: center;">
                          <strong style="color: #333333; font-size: 14px;">👤 Organizer:</strong>
                          <p style="margin: 0 0 0 8px; color: #666666; font-size: 14px;">${data.organizerName}</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  ${
                    data.agenda
                      ? `
                  <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
                    <strong style="color: #333333; font-size: 14px; display: block; margin-bottom: 8px;">📋 Agenda:</strong>
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">${data.agenda}</p>
                  </div>
                  `
                      : ''
                  }
                </div>
              </div>

              ${
                data.meetingLink
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${data.meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Join Meeting →
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  📌 <strong>Quick Tip:</strong> Add this meeting to your calendar and prepare any materials in advance for a productive discussion.
                </p>
              </div>

              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If you have any questions, please contact ${data.organizerName}.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; font-weight: 600;">
                Team Management Platform
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated meeting invitation. Please check your calendar for updates.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send document share notification email
   */
  async sendDocumentShareEmail(data: DocumentShareEmailData): Promise<void> {
    const htmlContent = this.getDocumentShareEmailTemplate(data);
    const subject = `📄 Document Shared: ${data.documentName}`;

    const mailOptions = {
      from: `Team Management Platform <${this.fromEmail}>`,
      to: data.to,
      subject,
      html: htmlContent,
      text: `${data.sharedByName} has shared "${data.documentName}" with you. Access it at: ${data.documentUrl}`,
    };

    try {
      this.logger.log('📧 Sending document share email to:', data.to);

      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);

      if (info && info.envelope) {
        this.logger.log(
          `✅ Document share email sent successfully to ${data.to}`,
        );
        this.logger.log(`📝 Message ID: ${info.messageId}`);
      } else {
        this.logger.warn(
          `⚠️  [DEV MODE] Document share email logged (not sent) to ${data.to}`,
        );
        this.logger.warn(`📝 Document: ${data.documentName}`);
        this.logger.warn(`👤 Shared By: ${data.sharedByName}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send document share email to ${data.to}:`,
        (error as Error).message,
      );
      // Don't throw - document share email is not critical
    }
  }

  /**
   * HTML template for document share email
   */
  private getDocumentShareEmailTemplate(data: DocumentShareEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Shared</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📄 Document Shared
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 20px;">
                Hi ${data.firstName},
              </h2>
              
              <p style="margin: 0 0 25px; color: #666666; font-size: 16px; line-height: 1.6;">
                <strong>${data.sharedByName}</strong> has shared a document with you!
              </p>

              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 2px; margin: 0 0 25px;">
                <div style="background: #ffffff; border-radius: 6px; padding: 25px;">
                  <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                      <span style="font-size: 24px;">📄</span>
                    </div>
                    <h3 style="margin: 0; color: #10b981; font-size: 20px; font-weight: bold;">
                      ${data.documentName}
                    </h3>
                  </div>
                  
                  ${data.documentDescription ? `<p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">${data.documentDescription}</p>` : ''}
                </div>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${data.documentUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      View Document →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                  💡 <strong>Quick Tip:</strong> You can access this document anytime from the Document Hub in your dashboard.
                </p>
              </div>

              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                This document has been shared with you by ${data.sharedByName}. If you have any questions, please reach out to them directly.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; font-weight: 600;">
                Team Management Platform
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Verify email configuration by sending a test email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(
        'Email service connection verification failed:',
        (error as Error).message,
      );
      return false;
    }
  }
}
