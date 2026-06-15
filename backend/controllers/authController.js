const { query } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const jwt = require('jsonwebtoken');

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return errorResponse(res, 'Email already in use', 400, 'EMAIL_EXISTS');
    }
    const hashedPwd = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (name, email, phone, password, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, status',
      [name, email, phone, hashedPwd, 'EMPLOYEE', 'PENDING']
    );
    return successResponse(res, result.rows[0], 'Registration successful. Pending admin approval.', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    const user = result.rows[0];
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    if (user.status === 'PENDING') {
      return errorResponse(res, 'Account pending approval', 403, 'PENDING_APPROVAL');
    }
    if (user.status === 'REJECTED') {
      return errorResponse(res, 'Account rejected', 403, 'ACCOUNT_REJECTED');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token in DB (30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const { password: _, ...userData } = user;
    return successResponse(res, { user: userData, accessToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies || req.body; // fallback to body if no cookie middleware
    if (!refreshToken) return errorResponse(res, 'No refresh token provided', 401, 'UNAUTHORIZED');

    const tokenRes = await query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (tokenRes.rows.length === 0) return errorResponse(res, 'Invalid refresh token', 403, 'FORBIDDEN');

    const tokenData = tokenRes.rows[0];
    if (new Date() > new Date(tokenData.expires_at)) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [tokenData.id]);
      return errorResponse(res, 'Refresh token expired', 403, 'FORBIDDEN');
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const userRes = await query('SELECT id, email, role FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) return errorResponse(res, 'User not found', 404, 'NOT_FOUND');
      
      // Slide session: update expiration date in DB and cookie
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await query('UPDATE refresh_tokens SET expires_at = $1 WHERE id = $2', [newExpiresAt, tokenData.id]);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      const newAccessToken = generateAccessToken(userRes.rows[0]);
      return successResponse(res, { accessToken: newAccessToken }, 'Token refreshed');
    } catch (err) {
      return errorResponse(res, 'Invalid refresh token', 403, 'FORBIDDEN');
    }
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies || req.body;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.clearCookie('refreshToken');
    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, phone, role, status FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return errorResponse(res, 'User not found', 404, 'NOT_FOUND');
    return successResponse(res, result.rows[0], 'User data fetched');
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'SUPER_ADMIN') {
      let sql = 'UPDATE users SET name = $1, phone = $2';
      let params = [name, phone];
      let paramIndex = 3;

      if (email) {
        const existingUser = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
        if (existingUser.rows.length > 0) return errorResponse(res, 'Email already in use', 400);
        sql += `, email = $${paramIndex++}`;
        params.push(email);
      }

      sql += ` WHERE id = $${paramIndex} RETURNING id, name, email, phone, role, status`;
      params.push(userId);

      const result = await query(sql, params);
      return successResponse(res, result.rows[0], 'Profile updated successfully');
    } else {
      const result = await query(
        'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING id, name, email, phone, role, status',
        [name, phone, userId]
      );
      return successResponse(res, result.rows[0], 'Profile updated successfully');
    }
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const userRes = await query('SELECT password FROM users WHERE id = $1', [userId]);
    const isMatch = await comparePassword(currentPassword, userRes.rows[0].password);
    if (!isMatch) return errorResponse(res, 'Current password incorrect', 401);

    const hashedPwd = await hashPassword(newPassword);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPwd, userId]);
    
    return successResponse(res, null, 'Password changed successfully');
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, me, updateProfile, changePassword };
