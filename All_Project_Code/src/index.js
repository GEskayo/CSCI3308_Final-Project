// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');
const path = require('path'); // Import path module

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'resource' directory
app.use(express.static(path.join(__dirname, 'resource')));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here

app.get("/", (req, res) => {
  res.render("pages/login");
});

// GET /login route
app.get('/login', (req, res) => {
  res.render('pages/login', { pageType: 'login', registered: req.query.registered });
});

// POST /login route
app.post('/login', async (req, res) => {
  try {
    // Find user by username
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);

    if (user) {
      // Compare password
      const match = await bcrypt.compare(req.body.password, user.password);
      
      if (match) {
        // Passwords match
        req.session.user = user; // Save user in session
        res.redirect('/home'); // Redirect to /home route
      } else {
        // Passwords don't match
        res.status(401).render('pages/login', { message: 'Incorrect username or password.' });
      }
    } else {
      // User not found, redirect to GET /register
      res.redirect('/register');
    }
  } catch (error) {
    // Handle database errors or bcrypt errors
    console.error('Login error', error);
    res.status(500).render('pages/login', { message: 'An error occurred during login. Please try again.' });
  }
});

// GET /register route
app.get('/register', (req, res) => {
  res.render('pages/register', { pageType: 'register' });
});

// POST /register route
app.post('/register', async (req, res) => {
  try {
    // Check if the username already exists
    const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);

    if (existingUser) {
      // Username already exists, render the register page with an error message
      res.render('pages/register', { message: 'Username already exists. Please choose a different one.' });
    } else {
      // Username is unique, proceed with hashing the password
      const hash = await bcrypt.hash(req.body.password, 10);

      // Insert username and hashed password into 'users' table
      await db.none('INSERT INTO users(username, password) VALUES($1, $2)', [req.body.username, hash]);

      // Redirect to GET /login route page after data has been inserted successfully
      // Pass a query parameter for successful registration
      res.redirect('/login?registered=true');
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.render('pages/register', { message: 'An error occurred during registration. Please try again.' });
  }
});

// GET /home route
app.get('/home', (req, res) => {
  // Check if user is logged in
  if (req.session.user) {
    res.render('pages/home', { user: req.session.user }); // Render the home page
  } else {
    res.redirect('/login'); // Redirect to login if not logged in
  }
});

// Discover
app.get('/discover', async (req, res) => {
try {
  const response = await axios({
    url: `https://app.ticketmaster.com/discovery/v2/events.json`,
    method: 'GET',
    dataType: 'json',
    params: {
      apikey: process.env.API_KEY,
      keyword: 'Shane Smith and the Saints',
      size: 10
    },
  });
  
  const events = response.data._embedded.events.map(event => {
    return {
      name: event.name,
      image: (event.images && event.images[0].url) || '/views/pages/default.jpg',
      dateAndTime: event.dates.start.localDate + ' ' + event.dates.start.localTime,
      bookingUrl: event.url
    };
  });
  
  res.render('pages/discover', { results: events });
} catch (error) {
  console.error('Error fetching events:', error);
  res.render('pages/discover', { results: [] });
}
});

// GET /user route
app.get('/user', async (req, res) => {
    // Check if user is authenticated
    if (!req.session.user) {
        return res.status(401).send('User not authenticated');
    }

    try {
        // Retrieve user data from the database
        const userId = req.session.user.id; // Assuming the user's ID is stored in the session
        const userData = await db.one('SELECT * FROM users WHERE id = $1', userId);

        // Send the user data as a response
        res.json(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Logout
app.get('/logout', (req, res) => {
req.session.destroy(err => {
    if(err) {
        return res.redirect('/discover');
    }

    res.clearCookie('sid');
    res.render('pages/login', { message: 'Logged out Successfully' });
});
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});

// Authentication Middleware
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Use this middleware for any routes that require authentication
app.use('/discover', auth);
