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
                    const redirectUrl = req.body.redirectedFrom === 'user' ? '/user' : '/discover';
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
  let message = req.query.message || ''; // Initialize message, defaulting to an empty string if not present

  try {
    const response = await axios({
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
    });

    const product = response.data.find(item => item.id === productId);

    if (product) {
      // Render the detail_product page with the found product
      res.render('pages/detail_product', { results: product, message: message });
    } else {
      // Product with the given ID not found
      res.render('pages/detail_product', { error: 'Product not found', message: message });
    }
  } catch (error) {
    // Handle errors
    console.error('error message:', error.message);
    res.render('pages/detail_product', { results: [], error: 'API call failed', message: message });
  }
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
    return res.redirect('/login?redirectedFrom=user');
  }

  try {
    const userProfileData = await db.oneOrNone('SELECT user_desc, profile_pic FROM userPage WHERE user_id = $1', [req.session.users.id]);
    const bookmarks = await db.manyOrNone('SELECT * FROM bookmarks WHERE user_id = $1', [req.session.users.id]);

    // Extract product IDs from bookmarks
    const productIds = bookmarks.map(bookmark => bookmark.product_id);

    // Fetch product details for all bookmarked products
    const response = await axios.get(`https://www.steamwebapi.com/steam/api/items`, {
      params: {
        key: process.env.API_KEY,
        game: 'csgo',
        product_ids: productIds.join(',') // Assuming the API can accept multiple product IDs
      }
    });

    // Map product details to bookmarks
    const detailedBookmarks = bookmarks.map(bookmark => {
      const productDetail = response.data.find(product => product.id === bookmark.product_id);
      return { ...bookmark, ...productDetail };
    });

    res.render('pages/user', {
      username: req.session.users.username,
      userDescription: userProfileData ? userProfileData.user_desc : 'I like SkineeDipping',
      profilePic: userProfileData ? userProfileData.profile_pic : '/images/skinee-logo.png',
      bookmarks: detailedBookmarks
    });
  } catch (error) {
    console.error('Error:', error);
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


app.get('/discover', async (req, res) => {
  let error = null;
  let message = req.query.message || ''; // Initialize message, defaulting to an empty string if not present

  // Add bookmark message if it exists
  let bookmarkMessage = req.query.bookmarkMessage || '';
  if (bookmarkMessage) {
    message += (message ? ' ' : '') + bookmarkMessage; // Append the bookmark message to the existing message
  }

  let queryParams = {
      key: process.env.API_KEY,
      page: '1',
      game: 'csgo',
      max: 100,
      wear: req.query.wear || '', 
      item_group: req.query.item_group || '',
      search: req.query.search,
  };
  
  try {
    const response = await axios({
        url: `https://www.steamwebapi.com/steam/api/items`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'Accept-Encoding': 'application/json',
        },
        params: queryParams
    });

    let results = response.data;

    if (req.session.users && req.session.users.id) {
        for (let item of results) {
            const isBookmarked = await db.oneOrNone('SELECT * FROM bookmarks WHERE user_id = $1 AND product_id = $2', [req.session.users.id, item.id]);
            item.isBookmarked = !!isBookmarked;
        }
    }

    if (req.query.search) {
        results = results.filter(item => item.marketname.toLowerCase().includes(req.query.search.toLowerCase()));
    }

    if (Array.isArray(results)) {
        if (req.query.sort === 'High to Low') {
            results.sort((a, b) => parseFloat(b.priceavg) - parseFloat(a.priceavg));
        } else if (req.query.sort === 'Low to High') {
            results.sort((a, b) => parseFloat(a.priceavg) - parseFloat(b.priceavg));
        }
    }

    res.render('pages/discover', {
      results: results,
      error: error,
      message: message,
      selectedWear: req.query.wear,
      selectedSort: req.query.sort,
      selectedCategories: req.query.item_group,
      searchQuery: req.query.search
    });

  } catch (error) {
    console.error('error message:', error.message);
    res.render('pages/discover', {
        results: [],
        error: 'API call failed',
        message: message // Pass the message here as well
    });
  }
});


// Bookmark

app.post('/bookmark/:productId', async (req, res) => {
  if (!req.session.users || !req.session.users.id) {
    return res.redirect('/login');
  }

  const productId = req.params.productId;
  const userId = req.session.users.id;

  try {
    let product;
    try {
      const response = await axios.get(`https://www.steamwebapi.com/steam/api/items`, {
        params: {
          key: process.env.API_KEY,
          game: 'csgo'
        }
      });
      product = response.data.find(item => item.id === productId);
    } catch (apiError) {
      console.error('API Error:', apiError.message);
      return res.redirect('/discover?message=Error+fetching+product+details');
    }

    if (!product) {
      return res.redirect('/discover?message=Product+not+found');
    }

    let bookmarkMessage;
    const existingBookmark = await db.oneOrNone('SELECT * FROM bookmarks WHERE user_id = $1 AND product_id = $2', [userId, productId]);

    if (existingBookmark) {
      await db.none('DELETE FROM bookmarks WHERE id = $1', [existingBookmark.id]);
      bookmarkMessage = 'Item+removed+from+Database';
    } else {
      await db.none('INSERT INTO bookmarks (user_id, product_id) VALUES ($1, $2)', [userId, productId]);
      bookmarkMessage = 'Item+added+to+Database';
    }

    // Redirect to the previous page with the bookmark message
    const referer = req.get('Referer') || '/'; // Fallback to home if no referer is present
    res.redirect(`${referer}?bookmarkMessage=${bookmarkMessage}`);
  } catch (error) {
    console.error('Error handling bookmark:', error);
    res.redirect('/discover?message=Error+processing+your+request');
  }
});







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


