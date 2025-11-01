const { Pool } = require('pg');

// CORRECTED Database connection for middleware
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