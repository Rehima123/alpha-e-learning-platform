# Alpha Freshman Tutorial - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to server directory**
```bash
cd server
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Configure .env file**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/alpha-freshman-tutorial
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
STRIPE_SECRET_KEY=sk_test_your_stripe_key
CLIENT_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (recommended for production)
# Get connection string from https://cloud.mongodb.com
```

6. **Run the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. **Update frontend to use API**

Create `config.js` in your frontend root:
```javascript
const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-api-domain.com/api'
    : 'http://localhost:5000/api';

export default API_URL;
```

2. **Update auth.js to use backend**
```javascript
import API_URL from './config.js';

// Register
async function register(userData) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    
    return data;
}

// Login
async function login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    
    return data;
}

// Get current user
async function getCurrentUser() {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    return await response.json();
}
```

## 📊 Database Setup

### MongoDB Atlas (Cloud - Recommended)

1. **Create account** at https://cloud.mongodb.com
2. **Create cluster** (Free tier available)
3. **Create database user**
4. **Whitelist IP** (0.0.0.0/0 for development)
5. **Get connection string**
6. **Update MONGODB_URI** in .env

### Local MongoDB

1. **Install MongoDB**
```bash
# macOS
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Windows
Download from https://www.mongodb.com/try/download/community
```

2. **Start MongoDB**
```bash
mongod
```

3. **Use local connection string**
```env
MONGODB_URI=mongodb://localhost:27017/alpha-freshman-tutorial
```

## 🔐 Security Setup

### JWT Secret
Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Email Setup (Gmail)
1. Enable 2-factor authentication
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use app password in EMAIL_PASSWORD

### Stripe Setup
1. Create account at https://stripe.com
2. Get API keys from Dashboard
3. Use test keys for development
4. Switch to live keys for production

## 🧪 Testing

### Test API with cURL

**Register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "student"
  }'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Courses**
```bash
curl http://localhost:5000/api/courses
```

### Test with Postman
1. Import API collection
2. Set environment variables
3. Test all endpoints

## 🚢 Deployment

### Heroku Deployment

1. **Install Heroku CLI**
```bash
npm install -g heroku
```

2. **Login to Heroku**
```bash
heroku login
```

3. **Create app**
```bash
cd server
heroku create alpha-freshman-api
```

4. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_atlas_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set CLIENT_URL=https://your-frontend-domain.com
```

5. **Deploy**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

6. **Open app**
```bash
heroku open
```

### DigitalOcean/AWS Deployment

1. **Create droplet/EC2 instance**
2. **Install Node.js and MongoDB**
3. **Clone repository**
4. **Install PM2**
```bash
npm install -g pm2
```

5. **Start application**
```bash
cd server
pm2 start server.js --name alpha-api
pm2 save
pm2 startup
```

6. **Configure Nginx**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **Setup SSL with Let's Encrypt**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

## 📝 Create Default Admin

Run in MongoDB shell or Compass:
```javascript
use alpha-freshman-tutorial

db.users.insertOne({
    fullName: "Admin User",
    email: "admin@alpha.com",
    password: "$2a$10$YourHashedPasswordHere",
    role: "admin",
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
})
```

To hash password:
```javascript
const bcrypt = require('bcryptjs');
const password = 'admin123';
const hash = await bcrypt.hash(password, 10);
console.log(hash);
```

## 🔧 Troubleshooting

### MongoDB Connection Error
- Check if MongoDB is running
- Verify connection string
- Check network/firewall settings
- Whitelist IP in MongoDB Atlas

### JWT Error
- Verify JWT_SECRET is set
- Check token expiration
- Ensure token format is correct

### CORS Error
- Update CLIENT_URL in .env
- Check CORS configuration in server.js
- Verify frontend origin

### Email Not Sending
- Check email credentials
- Enable "Less secure app access" or use app password
- Verify SMTP settings

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Documentation](https://jwt.io/)
- [Stripe API Documentation](https://stripe.com/docs/api)

## 🆘 Support

For help:
- Check server logs: `npm run dev`
- Check MongoDB logs: `mongod --logpath /var/log/mongodb.log`
- Review API documentation in server/README.md
- Contact: support@alphatutorial.com
