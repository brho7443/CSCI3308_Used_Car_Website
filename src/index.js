// *****************************************************
// Import Dependencies
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.

// *****************************************************
// Connect to DB 
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
// App Settings
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
//: Login/Logout User API Routes
// *****************************************************

const user = {
  username : undefined,
  password : undefined,
  is_buyer : undefined,
  favorites_id : undefined
}

// // Authentication middleware.
// const auth = (req, res, next) => {
//   if (!req.session.user) {
//     return res.redirect("/login");
//   }
//   next();
// };

// app.use(auth);

app.get('/', (req, res) => {
  res.render("pages/home");
});

//app.post login
app.post('/login', async (req, res) => {
  const username = req.body.username;
  const hash = await bcrypt
  .hash(req.body.password, 10)
  .catch(err => console.error(err.message).log("failed to encrypt pass"));

  // const query = `SELECT * FROM users WHERE username = '${username}'`;
  const query = `SELECT * FROM user_table WHERE username = $1`;

  db.one(query, [username])
    .then((data) =>{
      if(data.password = hash){
        user.username = username;
        user.password = hash;
        req.session.user = user;
        req.session.save();

        res.redirect("/");
      }
      else{
        // send message to user
        res.redirect("/login");
      }
    })
    .catch(err =>{
      console.log(err);
      res.redirect("/register");
    })
});

app.get('/register', (req, res) =>{
  res.render('pages/register');
});

//app.post register
app.post('/register', async (req, res) =>{
  try {
    // Hash the password using bcrypt library
    const username = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);

    const sql = `INSERT INTO user_table(username, password) VALUES ($1, $2)`;
    
    const result = await db.query(sql, [username, hash]);

    console.log(result);
    // res.json({ status: 'Successfully created user!' });
    res.redirect('/login');
  } 
  catch (err) {
    console.error(err);
    // res.status(500).json({ status: 'ERROR, user not created.' });
    //send a error msg saying user already created
    res.redirect('/register');
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/logout");
});

// *****************************************************
//:  Functionality API Routes
// *****************************************************

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// *****************************************************
//  Start Server for Dev
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');