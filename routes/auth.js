const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { requireGuest } = require('../middleware/auth');

// CORRECTED Database connection
let poolConfig;

if (process.env.DATABASE_URL) {
    // Production - use DATABASE_URL directly
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
} else {
    // Development
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'minimal_blog',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    };
}

const pool = new Pool(poolConfig);

// GET /auth/register - Show registration form
router.get('/register', requireGuest, (req, res) => {
    res.render('auth/register', { 
        title: 'Register',
        errors: [],
        formData: {}
    });
});

// POST /auth/register - Process registration
router.post('/register', requireGuest, async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        const errors = [];

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            errors.push('All fields are required');
        }

        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        if (password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        if (username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        // Check if user already exists
        const userExists = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            errors.push('Username or email already exists');
        }

        if (errors.length > 0) {
            return res.render('auth/register', {
                title: 'Register',
                errors,
                formData: { username, email }
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
            [username, email, passwordHash]
        );

        const user = result.rows[0];

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Registration failed' });
    }
});

// GET /auth/login - Show login form
router.get('/login', requireGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        errors: [],
        formData: {}
    });
});

// POST /auth/login - Process login
router.post('/login', requireGuest, async (req, res) => {
    try {
        const { username, password } = req.body;
        const errors = [];

        if (!username || !password) {
            errors.push('Username and password are required');
        }

        if (errors.length > 0) {
            return res.render('auth/login', {
                title: 'Login',
                errors,
                formData: { username }
            });
        }

        // Find user by username or email
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            errors.push('Invalid credentials');
            return res.render('auth/login', {
                title: 'Login',
                errors,
                formData: { username }
            });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            errors.push('Invalid credentials');
            return res.render('auth/login', {
                title: 'Login',
                errors,
                formData: { username }
            });
        }

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;

        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        
        res.redirect(returnTo);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Login failed' });
    }
});

// POST /auth/logout - Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

module.exports = router;