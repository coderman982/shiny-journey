require('dotenv/config');
const express = require('express');
const postRoutes = require('./route/post.route');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use('/api/posts', postRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
