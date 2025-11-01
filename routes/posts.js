const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const { requireAuth, requireOwnership } = require('../middleware/auth');

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

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// GET / - Show all posts with author information, comment counts, and like counts
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   u.username as author_username, 
                   COUNT(DISTINCT c.id) as comment_count,
                   COUNT(DISTINCT l.id) as like_count,
                   EXISTS(
                       SELECT 1 FROM likes 
                       WHERE user_id = $1 AND post_id = p.id
                   ) as user_liked
            FROM posts p 
            LEFT JOIN users u ON p.user_id = u.id 
            LEFT JOIN comments c ON p.id = c.post_id
            LEFT JOIN likes l ON p.id = l.post_id
            GROUP BY p.id, u.username
            ORDER BY p.created_at DESC
        `, [req.session.userId]);
        
        res.render('index', { 
            posts: result.rows,
            currentUser: res.locals.currentUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

// GET /posts/new - Show new post form (require auth)
router.get('/posts/new', requireAuth, (req, res) => {
    res.render('new-post', { 
        title: 'New Post'
    });
});

// POST /posts - Create new post (require auth)
router.post('/posts', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        await pool.query(
            'INSERT INTO posts (title, content, image_url, user_id) VALUES ($1, $2, $3, $4)',
            [title, content, imageUrl, req.session.userId]
        );
        
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

// GET /posts/:id - Show single post with author info, comments, and likes
router.get('/posts/:id', async (req, res) => {
    try {
        // Get post with author info
        const postResult = await pool.query(`
            SELECT p.*, u.username as author_username 
            FROM posts p 
            LEFT JOIN users u ON p.user_id = u.id 
            WHERE p.id = $1
        `, [req.params.id]);
        
        if (postResult.rows.length === 0) {
            return res.status(404).render('error', { error: 'Post not found' });
        }
        
        const post = postResult.rows[0];
        
        // Get comments for this post with author info
        const commentsResult = await pool.query(`
            SELECT c.*, u.username as author_username, u.avatar_url
            FROM comments c 
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE c.post_id = $1 
            ORDER BY c.created_at ASC
        `, [req.params.id]);
        
        // Get likes count and check if current user liked the post
        const likesResult = await pool.query(`
            SELECT COUNT(*) as like_count,
                   EXISTS(
                       SELECT 1 FROM likes 
                       WHERE user_id = $1 AND post_id = $2
                   ) as user_liked
            FROM likes 
            WHERE post_id = $2
        `, [req.session.userId, req.params.id]);
        
        // Check if current user is the author
        const isAuthor = req.session.userId === post.user_id;
        
        // Add comments and likes to post object
        post.comments = commentsResult.rows;
        post.comment_count = commentsResult.rows.length;
        post.like_count = parseInt(likesResult.rows[0]?.like_count) || 0;
        post.user_liked = likesResult.rows[0]?.user_liked || false;
        
        res.render('post', { 
            post: post,
            isAuthor: isAuthor,
            currentUser: res.locals.currentUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

// GET /posts/:id/edit - Show edit form (require auth + ownership)
router.get('/posts/:id/edit', requireAuth, requireOwnership('post'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).render('error', { error: 'Post not found' });
        }
        
        res.render('edit-post', { 
            post: result.rows[0],
            title: 'Edit Post'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

// PUT /posts/:id - Update post (require auth + ownership)
router.put('/posts/:id', requireAuth, requireOwnership('post'), upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        let imageUrl = req.body.existingImage;
        
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        
        await pool.query(
            'UPDATE posts SET title = $1, content = $2, image_url = $3 WHERE id = $4',
            [title, content, imageUrl, req.params.id]
        );
        
        res.redirect(`/posts/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

// DELETE /posts/:id - Delete post (require auth + ownership)
router.delete('/posts/:id', requireAuth, requireOwnership('post'), async (req, res) => {
    try {
        await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

// GET /about - About page
router.get('/about', (req, res) => {
    res.render('about', { title: 'About' });
});

// GET /my-posts - Show current user's posts with stats
router.get('/my-posts', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   COUNT(DISTINCT c.id) as comment_count,
                   COUNT(DISTINCT l.id) as like_count
            FROM posts p 
            LEFT JOIN comments c ON p.id = c.post_id
            LEFT JOIN likes l ON p.id = l.post_id
            WHERE p.user_id = $1 
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [req.session.userId]);
        
        res.render('my-posts', {
            posts: result.rows,
            title: 'My Posts'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

module.exports = router;