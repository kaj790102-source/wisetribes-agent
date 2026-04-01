require('dotenv').config();
const axios = require('axios');

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const PAGE_ID = process.env.META_PAGE_ID;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function postToInstagram(content) {
  if (!IG_ACCOUNT_ID) {
    throw new Error('INSTAGRAM_ACCOUNT_ID not configured');
  }

  const { caption, imageUrl, videoUrl } = content;

  try {
    if (imageUrl) {
      return await postImageWithCaption(caption, imageUrl);
    } else if (videoUrl) {
      return await postVideoWithCaption(caption, videoUrl);
    } else {
      return await postTextOnly(caption);
    }
  } catch (err) {
    console.error('[Instagram] Error:', err.response?.data || err.message);
    throw err;
  }
}

async function postImageWithCaption(caption, imageUrl) {
  console.log('[Instagram] Posting image...');

  // Create container
  const containerRes = await axios.post(`${GRAPH_URL}/${IG_ACCOUNT_ID}/media`, null, {
    params: {
      image_url: imageUrl,
      caption: caption,
      access_token: META_TOKEN
    }
  });

  const containerId = containerRes.data.id;
  console.log('[Instagram] Container created:', containerId);

  // Publish
  const publishRes = await axios.post(`${GRAPH_URL}/${IG_ACCOUNT_ID}/media_publish`, null, {
    params: {
      creation_id: containerId,
      access_token: META_TOKEN
    }
  });

  const postId = publishRes.data.id;
  console.log('[Instagram] Posted! ID:', postId);
  
  return { success: true, postId, url: `https://www.instagram.com/p/${postId}/` };
}

async function postVideoWithCaption(caption, videoUrl) {
  console.log('[Instagram] Posting video...');

  // Create container
  const containerRes = await axios.post(`${GRAPH_URL}/${IG_ACCOUNT_ID}/media`, null, {
    params: {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      access_token: META_TOKEN
    }
  });

  const containerId = containerRes.data.id;
  console.log('[Instagram] Video container created:', containerId);

  // Poll for completion
  let status = 'IN_PROGRESS';
  while (status === 'IN_PROGRESS') {
    await sleep(5000);
    const statusRes = await axios.get(`${GRAPH_URL}/${containerId}`, {
      params: { fields: 'status_code', access_token: META_TOKEN }
    });
    status = statusRes.data.status_code;
    console.log('[Instagram] Status:', status);
  }

  if (status !== 'FINISHED') {
    throw new Error(`Video processing failed: ${status}`);
  }

  // Publish
  const publishRes = await axios.post(`${GRAPH_URL}/${IG_ACCOUNT_ID}/media_publish`, null, {
    params: {
      creation_id: containerId,
      access_token: META_TOKEN
    }
  });

  const postId = publishRes.data.id;
  console.log('[Instagram] Reel posted! ID:', postId);
  
  return { success: true, postId, url: `https://www.instagram.com/p/${postId}/` };
}

async function postTextOnly(caption) {
  console.log('[Instagram] Creating text post (via Page)...');

  const res = await axios.post(`${GRAPH_URL}/${PAGE_ID}/feed`, null, {
    params: {
      message: caption,
      access_token: META_TOKEN
    }
  });

  const postId = res.data.id;
  console.log('[Instagram] Posted! ID:', postId);
  
  return { success: true, postId };
}

async function getAccountInfo() {
  const res = await axios.get(`${GRAPH_URL}/${IG_ACCOUNT_ID}`, {
    params: {
      fields: 'id,username,name,followers_count,media_count,biography',
      access_token: META_TOKEN
    }
  });
  return res.data;
}

async function getRecentPosts(limit = 10) {
  const res = await axios.get(`${GRAPH_URL}/${IG_ACCOUNT_ID}/media`, {
    params: {
      fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count',
      limit,
      access_token: META_TOKEN
    }
  });
  return res.data.data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  postToInstagram,
  postImageWithCaption,
  postVideoWithCaption,
  getAccountInfo,
  getRecentPosts
};
