// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************


const express = require('express'); // To build an application server or API
const path = require('path');
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.


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


app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.
app.use(bodyParser.urlencoded({ extended: true }));
// initialize session variables
app.use(express.static(path.join(__dirname, 'init_data')));


// Serve static files from the 'resource' directory
app.use(express.static(path.join(__dirname, 'resource')));


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);


app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);



// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get("/", (req, res) => {
  res.render("pages/login");
});

app.get('/detail-product', (req, res) => {
  res.render('pages/detail_product');

});

// GET /login route
app.get('/login', (req, res) => {
  res.render('pages/login', { pageType: 'login', registered: req.query.registered });
});

app.post('/login', async (req, res) => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const username = req.body.username;
  const values = [username];

  db.any(query, values)
      .then(async function (data) {
          if(data.length > 0){
              //const match = await bcrypt.compare(req.body.password, data[0].password);
              //console.log(match);
              // console.log(req.body.password);
              // console.log(data[0].password);
              // console.log(req.body.password.trim() === data[0].password.trim());
              // console.log(typeof req.body.password, typeof data[0].password);
              // console.log([...req.body.password].map(c => c.charCodeAt(0)));
              // console.log([...data[0].password].map(c => c.charCodeAt(0)));

              
              if(req.body.password.trim() === data[0].password.trim()){
                  req.session.user = username;
                  //res.json({status: 'success', message: 'success'});
                  req.session.save();
                  res.redirect('/discover');
              }
              else{
                  console.log('Login failed, please try again');
                  //res.json({status: 'Invalid input', message: 'Invalid input'});
                  res.redirect('/login');
              }
          }
         else {
              console.log('no user data', err);
              res.redirect('/register');
          }
      
      })
      .catch((err) => {
          console.log('login failed', err);
          res.redirect('/login');
      })
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  try {
    // Check if the username already exists
    const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);
    console.log(req.body.username);
    
    console.log(existingUser);
    if (existingUser) {
      // Username already exists, render the register page with an error message
      //res.json({status: 'Invalid input', message: 'Invalid input'});
      res.render('pages/register', { message: 'Username already exists. Please choose a different one.' });

    } else {
      // Username is unique, proceed with hashing the password
      const hash = await bcrypt.hash(req.body.password, 10);

      // Insert username and hashed password into 'users' table
      await db.none('INSERT INTO users(username, password) VALUES($1, $2)', [req.body.username, hash]);

      // Redirect to GET /login route page after data has been inserted successfully
      // Pass a query parameter for successful registration
      //res.json({status: 'Success', message: 'Success'});
      res.redirect('/login?registered=true');
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.render('pages/register', { message: 'An error occurred during registration. Please try again.' });
  }
});


app.get('/user', (req, res) => {
  res.render('pages/user');
});

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
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
app.get('/discover', (req, res) => {
  res.render('pages/discover');
});
  
// } catch (error) {
//   console.error('Error fetching events:', error);
//   res.render('pages/discover', { results: [] });
// }



// app.get('/discover', async (req, res) =>{
//   axios({
//       url: `https://www.steamwebapi.com/steam/api/items`,
//       method: 'GET',
//       dataType: 'json',
//       headers: {
//         'Accept-Encoding': 'application/json',
//       },
//       params: {
//         key: process.env.API_KEY,
//         game: '1',
//         sort_by: 'priceAz',
//         item_type: 'null',
//       },
//     })
//   .then(results => {
//       console.log(results.data); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
      
//       res.render('views/pages/discover', {results: results.data});
//   })
//   .catch(error => {
//       // Handle errors
//       console.error(error);

//       res.render('views/pages/discover', {results: [], error: 'API call failed'});
//   });

//   //res.render('pages/discover');
// })

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

// Start the server
module.exports = app.listen(3000);
//module.exports = app.listen(3000);
console.log('Server is listening on port 3000');

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Use this middleware for any routes that require authentication
app.use('/discover', auth);
