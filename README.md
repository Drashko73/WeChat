# WeChat

<div align="center">
  <img src="frontend/wechat/public/favicons/favicon256.png" alt="WeChat Logo" width="150">
  <h3>A Real-time Messaging Platform</h3>
</div>

## 📝 Overview

WeChat is a real-time messaging application built with the MEAN stack (MongoDB, Express.js, Angular, Node.js). It provides a comprehensive platform for real-time communication, friend management, file sharing, and more.

### ✨ Key Features

- **Real-time Messaging**: Instant messaging with WebSocket support
- **User Authentication**: Secure registration, login, and email verification
- **Friend System**: Send/receive friend requests, manage friends list
- **File Sharing**: Share various file types in conversations
- **Profile Management**: Customize user profiles with pictures and personal information
- **Statistics Dashboard**: View usage statistics and activity metrics
- **Theme Support**: Toggle between light and dark themes
- **Responsive Design**: Works on both desktop and mobile devices

## 🛠️ Technologies

### Backend
- **Node.js** with **Express.js** - Server framework
- **MongoDB** - NoSQL database
- **WebSockets** - Real-time communication
- **JWT** - Authentication mechanism
- **Passport.js** - Authentication middleware
- **Multer** - File upload handling
- **Nodemailer** - Email service integration
- **Swagger** - API documentation

### Frontend
- **Angular 19** - Frontend framework
- **TailwindCSS** - Utility-first CSS framework
- **RxJS** - Reactive programming
- **Chart.js** - Data visualization
- **FontAwesome** - Icons library

## 🚀 Installation

### Prerequisites
- Node.js (v16+)
- MongoDB (v7+)
- npm or yarn

### Option 1: Manual Setup

#### Backend Setup
```bash
# Clone the repository
git clone https://github.com/Drashko73/WeChat.git
cd WeChat/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.development
# Edit .env.development with your configuration

# Start the server
npm start
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend/wechat

# Install dependencies
npm install

# Start development server
npm start
```

### Option 2: Docker Setup

The project includes Docker configuration for easy deployment:

```bash
# Clone the repository
git clone https://github.com/Drashko73/WeChat.git
cd WeChat

# Start the containers
docker-compose up -d
```

This will start:
- Backend API on port 3000
- Frontend application on port 4200
- MongoDB database on port 27017

## 📋 API Documentation

When running in development mode with `SWAGGER_ENABLED=true`, API documentation is available at:
```
http://localhost:3000/swagger
```

## 🔒 Environment Configuration

The application requires several environment variables to be configured. Examples are provided in `.env.example`:

- Database connection settings
- JWT secret and configuration
- SMTP settings for email functionality
- Frontend URLs
- CORS configuration
- Various timeouts and security settings

## 👨‍💻 Author

- **Radovan Draskovic**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
