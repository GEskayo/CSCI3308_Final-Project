// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************
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

// initialize session variables
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
app.get('/', (req, res) =>{
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('pages/login');
});

app.get('/register', (req, res) => {
    res.render('pages/register');
});
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');