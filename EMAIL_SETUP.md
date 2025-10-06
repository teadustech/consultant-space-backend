# Email Setup for Password Reset

## Gmail SMTP Configuration

To enable password reset functionality, you need to configure Gmail SMTP settings.

### 1. Create a `.env` file in the server directory

Create a file named `.env` in the `the-consultant/server/` directory with the following content:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/go-to-experts

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Client URL (for password reset links)
CLIENT_URL=http://localhost:3000

# Server Configuration
PORT=5000
NODE_ENV=development

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Navigate to Security
   - Under "2-Step Verification", click "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Name it "Go-to-Experts"
   - Copy the generated 16-character password

3. **Update your `.env` file**:
   - Replace `your-email@gmail.com` with your actual Gmail address
   - Replace `your-gmail-app-password` with the 16-character app password

### 3. Production Migration to AWS SES

When moving to production, replace the Gmail SMTP configuration with AWS SES:

```env
# AWS SES Configuration (for production)
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
EMAIL_FROM=noreply@yourdomain.com
```

### 4. Testing the Email Setup

1. Start the server: `npm start`
2. Navigate to `/forgot-password` on the frontend
3. Enter a valid email address
4. Check if the reset email is received

### 5. Troubleshooting

- **Authentication failed**: Check your Gmail app password
- **Connection timeout**: Verify your internet connection
- **Email not received**: Check spam folder
- **Invalid credentials**: Ensure 2FA is enabled and app password is correct

### Security Notes

- Never commit your `.env` file to version control
- Use different email credentials for development and production
- Regularly rotate your app passwords
- Consider using environment-specific email services 