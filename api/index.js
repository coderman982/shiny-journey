require('dotenv/config');
const express = require('express');
const postRoutes = require('../src/route/post.route');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use('/api/posts', postRoutes);

module.exports = app;
