const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/avatars/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for avatars!'));
        }
    }
});

// GET /profile - Show user's own profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT id, username, email, bio, avatar_url, created_at
            FROM users 
            WHERE id = $1
        `, [req.session.userId]);

        const userStats = await pool.query(`
            SELECT 
                COUNT(p.id) as post_count,
                COUNT(DISTINCT c.id) as comment_count,
                COUNT(DISTINCT l.id) as like_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN comments c ON u.id = c.user_id
            LEFT JOIN likes l ON u.id = l.user_id
            WHERE u.id = $1
            GROUP BY u.id
        `, [req.session.userId]);

        const user = userResult.rows[0];
        user.stats = userStats.rows[0] || { post_count: 0, comment_count: 0, like_count: 0 };

        res.render('profile', {
            user: user,
            title: 'My Profile'
        });
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to load profile';
        res.redirect('/');
    }
});

// GET /users/:username - Show public user profile
router.get('/users/:username', async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT id, username, bio, avatar_url, created_at
            FROM users 
            WHERE username = $1
        `, [req.params.username]);

        if (userResult.rows.length === 0) {
            req.session.error = 'User not found';
            return res.redirect('/');
        }

        const user = userResult.rows[0];

        const userStats = await pool.query(`
            SELECT 
                COUNT(p.id) as post_count,
                COUNT(DISTINCT c.id) as comment_count,
                COUNT(DISTINCT l.id) as like_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN comments c ON u.id = c.user_id
            LEFT JOIN likes l ON u.id = l.user_id
            WHERE u.id = $1
            GROUP BY u.id
        `, [user.id]);

        const userPosts = await pool.query(`
            SELECT p.*, 
                   COUNT(DISTINCT c.id) as comment_count,
                   COUNT(DISTINCT l.id) as like_count
            FROM posts p
            LEFT JOIN comments c ON p.id = c.post_id
            LEFT JOIN likes l ON p.id = l.post_id
            WHERE p.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 10
        `, [user.id]);

        user.stats = userStats.rows[0] || { post_count: 0, comment_count: 0, like_count: 0 };
        user.posts = userPosts.rows;

        res.render('user-profile', {
            user: user,
            title: `${user.username}'s Profile`,
            isOwnProfile: req.session.userId === user.id
        });
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to load user profile';
        res.redirect('/');
    }
});

// GET /profile/edit - Show profile edit form
router.get('/profile/edit', requireAuth, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT id, username, email, bio, avatar_url
            FROM users 
            WHERE id = $1
        `, [req.session.userId]);

        res.render('edit-profile', {
            user: userResult.rows[0],
            title: 'Edit Profile'
        });
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to load edit profile';
        res.redirect('/profile');
    }
});

// PUT /profile - Update user profile
router.put('/profile', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        const { bio } = req.body;
        let avatarUrl = req.body.existingAvatar;

        if (req.file) {
            avatarUrl = `/uploads/avatars/${req.file.filename}`;
        }

        await pool.query(
            'UPDATE users SET bio = $1, avatar_url = $2 WHERE id = $3',
            [bio, avatarUrl, req.session.userId]
        );

        req.session.success = 'Profile updated successfully!';
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to update profile';
        res.redirect('/profile/edit');
    }
});

// GET /users - Show all users (optional feature)
router.get('/users', async (req, res) => {
    try {
        const usersResult = await pool.query(`
            SELECT u.id, u.username, u.avatar_url, u.bio, u.created_at,
                   COUNT(DISTINCT p.id) as post_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN comments c ON u.id = c.user_id
            GROUP BY u.id
            ORDER BY u.username ASC
        `);

        res.render('users-list', {
            users: usersResult.rows,
            title: 'Community Members'
        });
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to load users list';
        res.redirect('/');
    }
});

module.exports = router;