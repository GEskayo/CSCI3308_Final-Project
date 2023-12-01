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


app.use(express.static(path.join(__dirname, 'views/pages')));

const users = {
  username: undefined,
  id: undefined,
}


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
  res.render("pages/login", { message: '' });
});

app.get('/detail-product', (req, res) => {
  res.render('pages/detail_product');

});

app.get('/login', (req, res) => {
  const registered = req.query.registered;
  const message = registered ? 'Registration successful. Have fun SkineeDipping!' : '';
  res.render('pages/home', { message : message });
});


app.post('/login', async (req, res) => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const username = req.body.username;
  const values = [username];
  console.log(query);
  console.log(username);
  console.log(values);

  db.any(query, values)
      .then(async function (data) {
          if(data.length > 0){
              const match = await bcrypt.compare(req.body.password, data[0].password);
              //console.log(match);
              // console.log(req.body.password);
              // console.log(data[0].password);
              // console.log(req.body.password.trim() === data[0].password.trim());
              // console.log(typeof req.body.password, typeof data[0].password);
              // console.log([...req.body.password].map(c => c.charCodeAt(0)));
              // console.log([...data[0].password].map(c => c.charCodeAt(0)));

              
              if(match){

                req.session.user = { id: data[0].id, username: data[0].username };

                  //res.json({status: 'success', message: 'success'});
                  req.session.save();
                  res.redirect('/home');
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
      // After successful registration
      res.redirect('/login?registered=true');
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.render('pages/register', { message: 'An error occurred during registration. Please try again.' });
  }
});

app.get('/detail_product/:id', async (req, res) => {
  const productId = req.params.id;
  // Fetch product details from the API using the productId
  //console.log(req.url)
  axios({
      url: `https://www.steamwebapi.com/steam/api/items`,
      method: 'GET',
      dataType: 'json',
      headers: {
        'Accept-Encoding': 'application/json',
      },
      params: {
        key: process.env.API_KEY,
        game: 'csgo',
      }
    })
  .then(results => {
    const product = results.data.find(item => item.id === productId);

    if (product) {
      // Render the detail_product page with the found product
      res.render('pages/detail_product', { results: product });
    } else {
      // Product with the given ID not found
      res.render('pages/detail_product', { error: 'Product not found' });
    }
  })
  .catch(error => {
      // Handle errors
      console.error('error message: ', error.message);
      if(error.message){
        console.error('error results: ', error.results);
      };

      res.render('pages/discover', {results: [], error: 'API call failed'});
  });

});



app.get('/user', async (req, res) => {
  if (!req.session.user) {
      return res.status(401).send('User not authenticated');
  }

  try {
      const userId = req.session.user.id;
      const userData = await db.one('SELECT * FROM users WHERE id = $1', userId);
      res.render('user', { username: userData.username }); // Assuming 'user' is your EJS template
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).send('Internal Server Error');
  }
});


app.get('/user-profile', async (req, res) => {
  if (req.session.user && req.session.user.id) {
      try {
          const user = await db.one('SELECT username FROM users WHERE id = $1', req.session.user.id);
          res.render('user-profile', { username: user.username });
      } catch (error) {
          console.error('Database error:', error);
          res.redirect('/login');
      }
  } else {
      res.redirect('/login');
  }
});

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });


// GET /home route
app.get('/home', (req, res) => {
  // Check if user is logged in
  if (req.session.users) {
    res.render('pages/home', { user: req.session.users }); // Render the home page
  } else {
    res.redirect('/login'); // Redirect to login if not logged in
  }
});

// Discover
// app.get('/discover', (req, res) => {
//   res.render('pages/discover');
// });
  //
// } catch (error) {
//   console.error('Error fetching events:', error);
//   res.render('pages/discover', { results: [] });
// }

// Mohammad did most of the work thank you 

app.get('/discover', async (req, res) =>{
  //console.log(results);
  let error = null;
  let queryParams = {
    key: process.env.API_KEY,
    page: '1',
    game: 'csgo',
    max: 100,
    wear: req.query.wear || '', // use the query parameter
    item_group: req.query.item_group || '',
    search: req.query.search,
  };
  axios({
      url: `https://www.steamwebapi.com/steam/api/items`,
      method: 'GET',
      dataType: 'json',
      headers: {
        'Accept-Encoding': 'application/json',
      },
      params: queryParams
    })
  .then(results => {
      //console.log(results.data); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
      //console.log(results);
      // if (req.query.itemgroups) {
      //   // Add itemgroups to queryParams
      //   queryParams.itemgroup; // Assuming the API expects an array
      // }
      //let results = response.data;
      //console.log(req.url);
    //console.log(req.query.search);
      if (req.query.search) {
        //console.log(item.marketname);
        //console.log(req.search.query);
        results.data = results.data.filter(item => req.query.search.toLowerCase().includes(req.query.search.toLowerCase()));
      }

      if (Array.isArray(results.data)) {
        // Apply sorting based on the 'sort' query parameter
        if (req.query.sort === 'High to Low') {
            results.data.sort((a, b) => parseFloat(b.priceavg) - parseFloat(a.priceavg));
        } else if (req.query.sort === 'Low to High') {
            results.data.sort((a, b) => parseFloat(a.priceavg) - parseFloat(b.priceavg));
        }
      }
      res.render('pages/discover', {results: results.data, error , selectedWear: req.query.wear, selectedSort: req.query.sort, selectedCategories: req.query.item_group, searchQuery: req.query.search});
  })
  .catch(error => {
      // Handle errors
      console.error('error message: ', error.message);
      if(error.message){
        console.error('error results: ', error.results);
      };

      res.render('pages/discover', {results: [], error: 'API call failed'});
  });

  //res.render('pages/discover');
})



// GET /user route
// app.get('/user', async (req, res) => {
//     // Check if user is authenticated
//     if (!req.session.user) {
//         return res.status(401).send('User not authenticated');
//     }

//     try {
//         // Retrieve user data from the database
//         const userId = req.session.user.id; // Assuming the user's ID is stored in the session
//         const userData = await db.one('SELECT * FROM users WHERE id = $1', userId);

//         // Send the user data as a response
//         res.json(userData);
//     } catch (error) {
//         console.error('Error fetching user data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });



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
  if (!req.session.users) {
    return res.redirect('/login');
  }
  next();
};

// Use this middleware for any routes that require authentication
app.use('/discover', auth);
