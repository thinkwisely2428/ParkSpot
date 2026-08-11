const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { z } = require('zod');

const router = express.Router();

// Validation Schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    role: z.enum(['COMMUTER', 'OWNER', 'ADMIN']).optional(),
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
  })
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;
