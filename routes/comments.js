const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');

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

// POST /posts/:id/comments - Add a comment
router.post('/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        const { content } = req.body;
        const postId = req.params.id;
        const userId = req.session.userId;

        if (!content || content.trim().length === 0) {
            req.session.error = 'Comment content cannot be empty';
            return res.redirect(`/posts/${postId}`);
        }

        await pool.query(
            'INSERT INTO comments (content, user_id, post_id) VALUES ($1, $2, $3)',
            [content.trim(), userId, postId]
        );

        req.session.success = 'Comment added successfully!';
        res.redirect(`/posts/${postId}`);
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to add comment';
        res.redirect(`/posts/${req.params.id}`);
    }
});

// DELETE /comments/:id - Delete a comment
router.delete('/comments/:id', requireAuth, async (req, res) => {
    try {
        const commentId = req.params.id;

        // First get the comment to check ownership and get post_id for redirect
        const commentResult = await pool.query(
            'SELECT user_id, post_id FROM comments WHERE id = $1',
            [commentId]
        );

        if (commentResult.rows.length === 0) {
            req.session.error = 'Comment not found';
            return res.redirect('/');
        }

        const comment = commentResult.rows[0];

        // Check if user owns the comment or is the post author
        const postResult = await pool.query(
            'SELECT user_id FROM posts WHERE id = $1',
            [comment.post_id]
        );

        const isCommentOwner = comment.user_id === req.session.userId;
        const isPostAuthor = postResult.rows[0]?.user_id === req.session.userId;

        if (!isCommentOwner && !isPostAuthor) {
            req.session.error = 'You are not authorized to delete this comment';
            return res.redirect(`/posts/${comment.post_id}`);
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

        req.session.success = 'Comment deleted successfully!';
        res.redirect(`/posts/${comment.post_id}`);
    } catch (err) {
        console.error(err);
        req.session.error = 'Failed to delete comment';
        res.redirect('/');
    }
});

module.exports = router;