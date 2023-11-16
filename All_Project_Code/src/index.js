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

app.post('/login', async (req, res) => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const username = req.body.username;
  const values = [username];

  db.any(query, values)
      .then(async function (data) {
          if(data.length > 0){
              //const match = await bcrypt.compare(req.body.password, data[0].password);
              //console.log(match);
              console.log(req.body.password);
              console.log(data[0].password);
              console.log(req.body.password.trim() === data[0].password.trim());
              console.log(typeof req.body.password, typeof data[0].password);
              console.log([...req.body.password].map(c => c.charCodeAt(0)));
              console.log([...data[0].password].map(c => c.charCodeAt(0)));

              
              if(req.body.password.trim() === data[0].password.trim()){
                  req.session.user = username;
                  res.json({status: 'success', message: 'success'});
                  req.session.save();
                  //res.redirect('/discover');
              }
              else{
                  console.log('Login failed, please try again');
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


app.get('/user', (req, res) => {
  res.render('pages/user');
});

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });
// Start the server
module.exports = app.listen(3000);
//module.exports = app.listen(3000);
console.log('Server is listening on port 3000');

