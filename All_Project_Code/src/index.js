
// index.js

const express = require('express');
const { Pool } = require('pg');

// Initialize express app
const app = express();

// Set up PostgreSQL connection using environment variables directly
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'db', // This is the service name defined in docker-compose.yaml
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432, // Default port for PostgreSQL
});

// Set up API key and URL from environment variables
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Define the directory that contains the EJS templates
app.set('views', __dirname + '/views');

// Static files middleware for resources like CSS
app.use(express.static(__dirname + '/resource'));

// Routes
app.get('/', (req, res) => {
  res.render('pages/home');
});

app.get('/discover', (req, res) => {
  res.render('pages/discover');
});

app.get('/detail-product', (req, res) => {
  res.render('pages/detail_product');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.get('/user', (req, res) => {
  res.render('pages/user');
});

// Start the server
app.listen(3000);
console.log('Server is listening on port 3000');

