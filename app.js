const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const methodOverride = require('method-override');
const session = require('express-session');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
// Security middleware
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
//             fontSrc: ["'self'", "https://fonts.gstatic.com"],
//             scriptSrc: ["'self'"],
//             imgSrc: ["'self'", "data:", "blob:"]
//         }
//     }
// }));

// Add this route before your other routes to test CSS
app.get('/test-css', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>CSS Test</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <div style="padding: 2rem;">
                <h1>CSS Test Page</h1>
                <div class="post-card" style="margin: 2rem 0;">
                    <h2 class="post-title">Test Post Title</h2>
                    <div class="post-meta">Test metadata</div>
                    <div class="post-content-preview">Test content...</div>
                    <a href="#" class="btn btn-primary">Test Button</a>
                </div>
                <p>If you see styled cards and buttons, CSS is working.</p>
                <p>If everything is plain, CSS is not loading.</p>
            </div>
        </body>
        </html>
    `);
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: process.env.NODE_ENV === 'production'
    }
};

app.use(session(sessionConfig));

// Make user data available to all templates
app.use((req, res, next) => {
    res.locals.currentUser = req.session.userId ? {
        id: req.session.userId,
        username: req.session.username
    } : null;
    next();
});

// Routes
const postRoutes = require('./routes/posts');
const authRoutes = require('./routes/auth');
app.use('/', postRoutes);
app.use('/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

app.listen(PORT, () => {
    console.log(`🚀 Minimal Blog running on http://localhost:${PORT}`);
});