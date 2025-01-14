const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const axios = require('axios');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint for Koyeb
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// Rapid API configuration
const rapidApiConfig = {
  headers: {
    'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'amazon-product-data8.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY
  }
};

// Search products by text
app.get('/products', async (req, res) => {
  try {
    const { keyword, page = 1, country = 'US', sort_by = 'featured' } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const cacheKey = `products-${keyword}-${page}-${country}-${sort_by}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const response = await axios.get(
      `https://amazon-product-data8.p.rapidapi.com/product-by-text?keyword=${keyword}&page=${page}&country=${country}&sort_by=${sort_by}`,
      rapidApiConfig
    );

    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product details
app.get('/product-details/:asin', async (req, res) => {
  try {
    const { asin } = req.params;
    const { country = 'US' } = req.query;

    const cacheKey = `details-${asin}-${country}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const response = await axios.get(
      `https://amazon-product-data8.p.rapidapi.com/product-detail?asin=${asin}&country=${country}`,
      rapidApiConfig
    );

    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product reviews
app.get('/product-reviews/:asin', async (req, res) => {
  try {
    const { asin } = req.params;
    const { page = 1, country = 'US' } = req.query;

    const cacheKey = `reviews-${asin}-${page}-${country}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const response = await axios.get(
      `https://amazon-product-data8.p.rapidapi.com/product-review?asin=${asin}&page=${page}&country=${country}`,
      rapidApiConfig
    );

    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});