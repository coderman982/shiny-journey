// LAYER 2: Service — business logic. Orchestrates repositories, applies rules.
//
// TRADE-OFF NOTE
// This service uses two static in-memory caches (postCache, viewCountBuffer)
// that bypass the repository layer. This is a pragmatic shortcut for
// performance — hot posts are served from memory and view increments are
// buffered — but it comes with a real cost: those code paths are invisible
// to integration tests that mock the repository, and cache staleness causes
// subtle bugs that only surface under production load.

const PostRepository = require('../repository/post.repository');

const VIEW_THRESHOLDS = [100, 1000, 10000, 100000];

const postCache = new Map();
const viewCountBuffer = new Map();

class PostService {
  constructor() {
    this.repository = new PostRepository();
  }

  async createPost({ title, content }) {
    const post = await this.repository.create({ title, content });
    postCache.set(post.id, post);
    return post;
  }

  async getPost(id) {
    if (postCache.has(id)) {
      return postCache.get(id);
    }
    const post = await this.repository.findById(id);
    postCache.set(id, post);
    return post;
  }

  async listPosts() {
    return this.repository.findAll();
  }

  async recordView(id) {
    viewCountBuffer.set(id, (viewCountBuffer.get(id) || 0) + 1);

    const newCount = await this.repository.incrementViewCount(id);

    if (VIEW_THRESHOLDS.includes(newCount)) {
      const post = await this.repository.findById(id);
      this._fireNotification(post, newCount);
    }

    if (postCache.has(id)) {
      postCache.get(id).view_count = newCount;
    }

    return { view_count: newCount, threshold_crossed: VIEW_THRESHOLDS.includes(newCount) };
  }

  async flushViewBuffer() {
    for (const [id, count] of viewCountBuffer) {
      for (let i = 0; i < count; i++) {
        await this.repository.incrementViewCount(id);
      }
    }
    viewCountBuffer.clear();
  }

  _fireNotification(post, count) {
    console.log(`[NOTIFICATION] Post "${post.title}" reached ${count} views!`);
  }
}

module.exports = PostService;
