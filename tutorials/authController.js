const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const sendEmail = require('../utils/email');
const { generateToken, generateRefreshToken } = require('../utils/token');

// Register new user
exports.register = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    user = await User.create({
      username,
      email,
      password_hash: password
    });

    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Save verification token
    user.verification_token = verificationToken;
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Verify Your Email',
      html: `
        <h2>Welcome to Alpha Freshman Tutorials!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>If you didn't create an account, please ignore this email.</p>
      `
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Verify user
    user.is_verified = true;
    user.verification_token = null;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};