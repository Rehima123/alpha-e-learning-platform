# Alpha Freshman Tutorial - Backend API

Secure Node.js/Express backend for the Alpha Freshman Tutorial e-learning platform.

## Features

- ✅ **Authentication & Authorization** - JWT-based auth with role-based access control
- ✅ **User Management** - Student, Instructor, and Admin roles
- ✅ **Course Management** - CRUD operations with approval workflow
- ✅ **Enrollment System** - Track student progress and course access
- ✅ **Payment Integration** - Stripe payment processing
- ✅ **Security** - Helmet, rate limiting, input validation, password hashing
- ✅ **Email Service** - Password reset and notifications
- ✅ **MongoDB Database** - Mongoose ODM with schema validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, bcryptjs, express-rate-limit
- **Validation**: express-validator
- **Email**: Nodemailer
- **Payment**: Stripe

## Installation

1. **Install Dependencies**
```bash
cd server
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- JWT secret key
- Email credentials
- Stripe API keys

3. **Start MongoDB**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
```

4. **Run Server**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/logout` - Logout user

### Courses
- `GET /api/courses` - Get all approved courses
- `GET /api/courses/:id` - Get single course
- `POST /api/courses` - Create course (Instructor)
- `PUT /api/courses/:id` - Update course (Instructor/Admin)
- `DELETE /api/courses/:id` - Delete course (Instructor/Admin)
- `POST /api/courses/:id/review` - Add review
- `GET /api/courses/instructor/my-courses` - Get instructor courses

### Admin
- `GET /api/admin/courses/pending` - Get pending courses
- `PUT /api/admin/courses/:id/approve` - Approve course
- `PUT /api/admin/courses/:id/reject` - Reject course
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/deactivate` - Deactivate user
- `PUT /api/admin/users/:id/activate` - Activate user
- `GET /api/admin/stats` - Get platform statistics

## Security Features

1. **Password Hashing** - bcryptjs with salt rounds
2. **JWT Authentication** - Secure token-based auth
3. **Rate Limiting** - Prevent brute force attacks
4. **Helmet** - Security headers
5. **Input Validation** - express-validator
6. **CORS** - Configured for frontend origin
7. **MongoDB Injection Prevention** - Mongoose sanitization

## Database Models

### User
- fullName, email, password (hashed)
- role (student/instructor/admin)
- enrolledCourses with progress tracking
- subscription details
- timestamps

### Course
- title, description, category, level
- instructor reference
- lessons array
- reviews and ratings
- status (pending/approved/rejected)
- timestamps

## Default Admin Account

Create admin account via MongoDB:
```javascript
db.users.insertOne({
    fullName: "Admin User",
    email: "admin@alpha.com",
    password: "$2a$10$hashedpassword", // Hash "admin123"
    role: "admin",
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date()
})
```

## Testing

```bash
npm test
```

## Deployment

### Heroku
```bash
heroku create alpha-freshman-api
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
git push heroku main
```

### DigitalOcean/AWS
1. Set up Node.js server
2. Install PM2: `npm install -g pm2`
3. Start app: `pm2 start server.js`
4. Configure Nginx reverse proxy
5. Set up SSL with Let's Encrypt

## Environment Variables

Required variables in `.env`:
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT
- `JWT_EXPIRE` - Token expiration (e.g., 7d)
- `EMAIL_HOST` - SMTP host
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - Email username
- `EMAIL_PASSWORD` - Email password
- `STRIPE_SECRET_KEY` - Stripe secret key
- `CLIENT_URL` - Frontend URL

## Support

For issues or questions, contact: support@alphatutorial.com
