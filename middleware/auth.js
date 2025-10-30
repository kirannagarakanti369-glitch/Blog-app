// Check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }
    next();
};

// Check if user is guest (not authenticated)
const requireGuest = (req, res, next) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    next();
};

// Check if user owns the resource
const requireOwnership = (model) => {
    return async (req, res, next) => {
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            let result;
            if (model === 'post') {
                result = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
            } else if (model === 'comment') {
                result = await pool.query('SELECT user_id FROM comments WHERE id = $1', [req.params.id]);
            }

            if (result.rows.length === 0) {
                return res.status(404).render('error', { error: 'Resource not found' });
            }

            const resource = result.rows[0];
            if (resource.user_id !== req.session.userId) {
                return res.status(403).render('error', { error: 'You are not authorized to perform this action' });
            }

            next();
        } catch (err) {
            console.error(err);
            res.status(500).render('error', { error: 'Server error' });
        }
    };
};

module.exports = {
    requireAuth,
    requireGuest,
    requireOwnership
};