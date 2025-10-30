const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const methodOverride = require('method-override');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Routes
const postRoutes = require('./routes/posts');
app.use('/', postRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

app.listen(PORT, () => {
    console.log(`🚀 Minimal Blog running on http://localhost:${PORT}`);
});