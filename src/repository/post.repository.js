// LAYER 1: Repository — data access only. No business logic, no caching, no decisions.

const { supabase } = require('../config/supabase');

class PostRepository {
  async findById(id) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async create({ title, content }) {
    const { data, error } = await supabase
      .from('posts')
      .insert({ title, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async incrementViewCount(id) {
    const { data, error } = await supabase
      .rpc('increment_view_count', { post_id: id });
    if (error) throw error;
    return data;
  }
}

module.exports = PostRepository;
