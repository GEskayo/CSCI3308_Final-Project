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
const sessionSecret = process.env.SESSION_SECRET;
const multer = require('multer');
const upload = multer({ dest: 'src/uploads/' }); // This will save files to a folder named 'uploads'

// Serve static files from the 'resource' directory
app.use(express.static(path.join(__dirname, 'init_data')));
app.use(express.static(path.join(__dirname, 'init_data')));

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

/// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware setup - this should be before your route handlers
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if you are using HTTPS
}));

// Serve static files from the 'init_data', 'resource', and 'views/pages' directories
app.use(express.static(path.join(__dirname, 'init_data')));
app.use(express.static(path.join(__dirname, 'resource')));
app.use(express.static(path.join(__dirname, 'views/pages')));

// Authentication middleware for protected routes
const auth = (req, res, next) => {
  if (!req.session.users) {
    return res.redirect('/login');
  }
  next();
};

// Apply the authentication middleware to the '/discover' route
app.use('/discover', auth);




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
  const redirectedFrom = req.query.redirectedFrom;
  const message = registered ? 'Registration successful. Have fun SkineeDipping!' : '';
  
  // Pass the redirectedFrom parameter to the EJS template
  res.render('pages/login', { message: message, redirectedFrom: redirectedFrom });
});



app.post('/login', async (req, res) => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const username = req.body.username;
  const values = [username];

  db.any(query, values)
      .then(async function (data) {
          if (data.length > 0) {
              const match = await bcrypt.compare(req.body.password, data[0].password);
              
              if (match) {
                req.session.users = {
                    username: data[0].username,
                    id: data[0].id
                };
                req.session.save(() => {
                    // Redirect based on the redirectedFrom parameter
                    const redirectUrl = req.body.redirectedFrom === 'user' ? '/user' : '/home';
                    res.redirect(redirectUrl);
                });
            } else {
                  console.log('Login failed: Incorrect password');
                  res.redirect('/login');
              }
          } else {
              console.log('Login failed: User not found');
              res.redirect('/register');
          }
      })
      .catch((err) => {
          console.log('Login failed:', err);
          res.redirect('/login');
      });
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
      //res.json({status: 'Success', message: 'Success'});
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
      //res.json({object: ''});
      //res.json({id: '00706590-f442-441d-b653-ef683a0306bf'})
      res.render('pages/detail_product', { results: product });
    } else {
      // Product with the given ID not found
      res.status(404);
      //res.json({error: 'Product not Found'});
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

// POST route for profile picture upload
app.post('/uploadProfilePic', upload.single('profilePic'), async (req, res) => {
  if (!req.session.users || !req.session.users.id) {
    return res.redirect('/login'); // Redirect if not logged in
  }

  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  // Adjust the file path for web access
  const webPath = file.path.replace('src/', '');

  try {
    const userId = req.session.users.id; // Get the user's ID from the session

    // Check if the user already has an entry in userPage
    const existingProfile = await db.oneOrNone('SELECT * FROM userPage WHERE user_id = $1', [userId]);

    if (existingProfile) {
      // Update the existing profile picture path
      await db.none('UPDATE userPage SET profile_pic = $1 WHERE user_id = $2', [webPath, userId]);
    } else {
      // Insert a new profile picture entry
      await db.none('INSERT INTO userPage (user_id, profile_pic) VALUES ($1, $2)', [userId, webPath]);
    }

    res.redirect('/user'); // Redirect to the user profile page
  } catch (error) {
    console.error('Error saving file path:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('src/uploads'));


app.get('/user', async (req, res) => {
  if (!req.session.users || !req.session.users.id) {
      // Redirect to login if the user is not logged in
      return res.redirect('/login?redirectedFrom=user');
  }

  try {
      // Fetch user description and profile picture from the database
      const userProfileData = await db.oneOrNone('SELECT user_desc, profile_pic FROM userPage WHERE user_id = $1', [req.session.users.id]);

      res.render('pages/user', {
          username: req.session.users.username,
          userDescription: userProfileData && userProfileData.user_desc ? userProfileData.user_desc : 'I like SkineeDipping',
          profilePic: userProfileData && userProfileData.profile_pic ? userProfileData.profile_pic : '/images/skinee-logo.png'
      });
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.redirect('/login');
  }
});


app.post('/saveDescription', async (req, res) => {
  if (!req.session.users || !req.session.users.id) {
      return res.redirect('/login'); // redirect if not logged in
  }

  const userId = req.session.users.id;
  const description = req.body.description;

  try {
      // Check if the user already has a description
      const existingDesc = await db.oneOrNone('SELECT * FROM userPage WHERE user_id = $1', [userId]);

      if (existingDesc) {
          // Update the existing description
          await db.none('UPDATE userPage SET user_desc = $1 WHERE user_id = $2', [description, userId]);
      } else {
          // Insert a new description
          await db.none('INSERT INTO userPage (user_id, user_desc) VALUES ($1, $2)', [userId, description]);
      }

      res.redirect('/user'); // Redirect back to user page
  } catch (error) {
      console.error('Error saving description:', error);
      res.status(500).send('Internal Server Error');
  }
});


// app.get('/user-profile', async (req, res) => {
//   if (req.session.users && req.session.users.id) {
//       try {
//           const user = await db.one('SELECT username FROM users WHERE id = $1', req.session.users.id);
//           res.render('user-profile', { username: users.username });
//       } catch (error) {
//           console.error('Database error:', error);
//           res.redirect('/login');
//       }
//   } else {
//       res.redirect('/login');
//   }
// });

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });


// GET /home route
app.get('/home', (req, res) => {
  // Check if user is logged in
  if (req.session.users) {
    res.render('pages/home', { user: req.session.users }); // Render the 'home' view
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
      //res.json({results: []});
      res.render('pages/discover', {results: results.data, error , selectedWear: req.query.wear, selectedSort: req.query.sort, selectedCategories: req.query.item_group, searchQuery: req.query.search});
  })
  .catch(error => {
      // Handle errors
      console.error('error message: ', error.message);
      if(error.message){
        console.error('error results: ', error.results);
      };
      //res.json({error: "API call failed"});
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

const fs=require('fs')
//uploadPic POST
app.post('/uploadPic', async(req, res) => {

  console.log ("does it know thephoto?", req.body.userPhoto);
  const data = readImageFile(req.body.userPhoto);

  console.log("does it even know the user name?? ", req.session.users.username);

  // query = `SELECT * FROM users WHERE username = $1`;
  // username = req.session
  pool.query(`INSERT INTO users(userPhoto) VALUES(BINARY(:userPhoto)) WHERE username = $2`,[{data}, req.session.users.username], function(err, res){
    if(err) throw err
    console.log("blob inserted")
  })
});

//uploadPic GET
app.get('/uploadPic', (req, res)=> {
  const userPic = "userPic.png"
  pool.query(`SELECT * FROM users where username = $1`,[req.session.users.username], function(err, res){
    const row = res[0]
    const data = row.userPhoto
    console.log("blob data read")

    const buf = new Buffer(data, 'binary')
    fs.writeFileSync(output, buf) 

    console.log("new file created", userPic)
  })
});

//convert image to BLOB file
function readImageFile(file){ 
  const bitmap = fs.readFileSync(file)
  const buf = new Buffer(bitmap)
  return buf
}

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************

// Start the server
module.exports = app.listen(3000);
//module.exports = app.listen(3000);
console.log('Server is listening on port 3000');


