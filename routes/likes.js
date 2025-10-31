const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    },
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST /posts/:id/like - Like a post
router.post('/posts/:id/like', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.userId;

        // Check if user already liked this post
        const existingLike = await pool.query(
            'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        if (existingLike.rows.length > 0) {
            req.session.error = 'You already liked this post';
            return res.redirect(`/posts/${postId}`);
        }

        // Add like
        await pool.query(
            'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
            [userId, postId]
        );

        req.session.success = 'Post liked!';
        res.redirect(`/posts/${postId}`);
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to like post';
        res.redirect(`/posts/${req.params.id}`);
    }
});

// DELETE /posts/:id/like - Unlike a post
router.delete('/posts/:id/like', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.userId;

        // Remove like
        await pool.query(
            'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        req.session.success = 'Post unliked';
        res.redirect(`/posts/${postId}`);
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to unlike post';
        res.redirect(`/posts/${req.params.id}`);
    }
});

// GET /posts/:id/likes - Get likes count (API endpoint)
router.get('/posts/:id/likes', async (req, res) => {
    try {
        const postId = req.params.id;
        
        const likesResult = await pool.query(
            `SELECT COUNT(*) as like_count,
                    EXISTS(
                        SELECT 1 FROM likes 
                        WHERE user_id = $1 AND post_id = $2
                    ) as user_liked
             FROM likes 
             WHERE post_id = $2`,
            [req.session.userId, postId]
        );

        res.json(likesResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get likes' });
    }
});

module.exports = router;