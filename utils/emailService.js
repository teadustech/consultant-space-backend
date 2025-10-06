const nodemailer = require('nodemailer');

// Create transporter for Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASSWORD // Your Gmail app password
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userType, userName) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&userType=${userType}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Go-to-Experts',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #ef4444); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Go-to-Experts</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Hello ${userName},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Go-to-Experts account. 
              If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #0ea5e9, #ef4444); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
              <strong>Important:</strong> This link will expire in 30 minutes for security reasons.
            </p>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            
            <p style="color: #0ea5e9; font-size: 14px; word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply to this message.
              If you have any questions, contact our support team.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmation = async (email, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Successful - Go-to-Experts',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Go-to-Experts</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Successful</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Hello ${userName},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Your password has been successfully reset. You can now log in to your Go-to-Experts account using your new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" 
                 style="background: linear-gradient(135deg, #10b981, #059669); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
              <strong>Security Tip:</strong> If you didn't request this password reset, please contact our support team immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply to this message.
              If you have any questions, contact our support team.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send meeting confirmation email with Google Meet link
const sendMeetingConfirmation = async ({ to, consultantName, seekerName, meetingLink, sessionDate, startTime, sessionDuration, sessionType }) => {
  try {
    const transporter = createTransporter();
    
    // Format date and time
    const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: `Meeting Confirmed - ${sessionType} Session with ${consultantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Go-to-Experts</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Meeting Confirmation</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Hello ${seekerName},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Your ${sessionType} session with <strong>${consultantName}</strong> has been confirmed! 
              Here are the details for your upcoming meeting:
            </p>
            
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-bottom: 15px;">📅 Meeting Details</h3>
              <div style="color: #475569; line-height: 1.8;">
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Duration:</strong> ${sessionDuration} minutes</p>
                <p><strong>Consultant:</strong> ${consultantName}</p>
                <p><strong>Session Type:</strong> ${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingLink}" 
                 style="background: linear-gradient(135deg, #10b981, #059669); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                🎥 Join Google Meet
              </a>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin: 0 0 10px 0;">📋 Important Notes:</h4>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>Please join the meeting 5 minutes before the scheduled time</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Test your microphone and camera before joining</li>
                <li>If you need to reschedule, please contact your consultant at least 24 hours in advance</li>
              </ul>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
              <strong>Meeting Link:</strong> 
              <a href="${meetingLink}" style="color: #0ea5e9; text-decoration: none;">${meetingLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply to this message.
              If you have any questions, contact our support team or your consultant directly.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Meeting confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending meeting confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmation,
  sendMeetingConfirmation
}; 