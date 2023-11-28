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

app.get('/', (req, res) => {
  if (req.session.user) {
    res.render('pages/home');
  }
  else {res.redirect('/login');}
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

//app.post login
app.post('/login', async (req, res) => {
  const username = req.body.username;
  const hash = await bcrypt
  .hash(req.body.password, 10)
  .catch(err => console.error(err.message).log('failed to encrypt pass'));

  // const query = `SELECT * FROM users WHERE username = '${username}'`;
  const query = `SELECT * FROM user_table WHERE username = $1`;

  db.one(query, [username])
    .then(async (data) =>{
      const match = await bcrypt.compare(req.body.password, data.password);

      if (match === false) {
        console.error("Incorrect username or password");
        res.redirect(400, '/register');
      }
      else {
        user.username = username;
        user.password = await bcrypt.hash(req.body.password, 10);

        req.session.user = user;
        req.session.save();
        res.redirect('/');
      }
    })
    .catch(err =>{
      console.log(err);
      res.redirect(400,'/register');
    })
});

app.get('/register', (req, res) =>{
  res.render('pages/register');
});

axios({
  url: 'https://carapi.app',
  method: 'GET',
  dataType:'json',
  params: {
  // "apikey": req.session.user.api_key,
  // "keyword": "Taylor Swift", 
  // "size": 10,
  }
  })
  .then(results => {
  console.log(results.data); // display the results
  res.render("pages/buy", {
  results: results.data._embedded.events
  });
  })
  .catch(error => {
  // Handle errors
  res.render("pages/home", {
  results: [],
  error: true,
  });
})

//app.post register
app.post('/register', async (req, res) => {
  // console.log('Before DB Alteration:');
  // let entries = await db.query('SELECT * FROM user_table');
  // console.log(entries);
  
  const username = req.body.username;

  if (typeof username === 'string' && typeof req.body.password === 'string') {
    const hash = await bcrypt.hash(req.body.password, 10);

    const sql = `INSERT INTO user_table(username, password) VALUES ($1, $2)`;
    
    const result = db.query(sql, [username, hash])
    .then(() =>{
      console.log(result);
    })
    .catch(err =>{
      console.log(err);
      res.redirect(400,'/register');
      //Alert user that username is already registered
    });

    // console.log('After DB Alteration:');
    // let entries = await db.query('SELECT * FROM user_table');
    // console.log(entries);

    // res.json({ message: 'Successfully created user!' });
    res.redirect('/login');
  }
  else {
    // res.json({message: 'Invalid input, user not created.'});
    res.redirect(400,'/register');
  }
});

//app.post delete user
app.post('/profile/delete', async (req, res) =>{
  if (req.session.user) {
    console.log('Before DB Alteration:');
    let entries = await db.query('SELECT * FROM user_table');
    console.log(entries);
    
    console.log(req.session.user);
    if(req.session.user) {
      let entries = await db.query('SELECT * FROM user_table');
      console.log(entries);

      const username = user.username;
      
      const sql = `DELETE FROM favorites_table WHERE username = $1`;
      
      const result = await db.query(sql, [username]);

      console.log('After DB Alteration:');
      entries = await db.query('SELECT * FROM user_table');
      console.log(entries);

      console.log(result);
      res.redirect(200,'/logout');
    }
    else {res.redirect(500,'/profile');}
  }
  else {res.redirect('/login');}
});

app.get('/logout', (req, res) => {
  if(req.session.user) {
    req.session.destroy();
    res.render('pages/logout');
  }
  else {res.redirect('/login');}
});

app.get('/profile', (req, res) => {
  if(req.session.user) {
    res.render('pages/profile');
  }
  else {res.redirect('/login');}
});

app.get('/home', (req, res) => {
  if(req.session.user) {
    res.render('pages/home');
  }
  else {res.redirect('/login');}
});


// *****************************************************
//:  Functionality API Routes
// *****************************************************

//Buy and search
app.get('/buy', (req, res) => {
  if(req.session.user) {
    res.render('pages/buy');
  }
  else {res.redirect('/login');}
});


//Sell
app.get('/sell', (req, res) => {
  if(req.session.user) {
    res.render('pages/sell');
  }
  else {res.redirect('/login');}
});

app.get('/sell/new', (req, res) => {
  if(req.session.user) {
    res.render('pages/sell_new');
  }
  else {res.redirect('/login');}
});

app.post('/sell/new', (req, res) =>{
  const make = req.body.make;
  const model = req.body.model;
  const color = req.body.color;
  const price = req.body.price;
  let miles = req.body.miles;
  let mpg = req.body.mpg;
  const username = user.username;

  if(!make | !model | !price){
    //Send message 
    res.status(400);
    return; 
  }

  if(!miles){
    miles = '-1';
  }

  if(!mpg){
    mpg = '-1';
  }

  const sql = `INSERT INTO car_table(make, model, color, price, miles, mpg, username) VALUES ($1, $2, $3, $4, $5, $6, $7)`;

  const result = db.query(sql, [make, model, color, price, miles, mpg, username])
  .then(() =>{
    console.log(result);
    res.json({
      status: 'success', 
      make: make, 
      model: model
    });
  })
  .catch(err =>{
    console.log(err);
    console.log(result);
    res.redirect(400,'/sell/view');
    //Alert user that username is already registered
  });
});

app.get('/sell/view', (req, res) => {
  if(req.session.user) {
    res.render('pages/sell_view');
  }
  else {res.redirect('/login');}
});

//Accessories
app.get('/accessories', (req, res) => {
  if(req.session.user) {
    res.render('pages/accessories');
  }
  else {res.redirect('/login');}
});

//Messaging
app.get('/messages', (req, res) => {
  if(req.session.user) {
    res.render('pages/messages');
  }
  else {res.redirect('/login');}
});


//Legacy
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.get('/discover', (req,res) => {
  axios({
    url: `https://app.ticketmaster.com/discovery/v2/events.json`,
    method: 'GET',
    dataType: 'json',
    headers: {
      'Accept-Encoding': 'application/json',
    },
    params: {
      apikey: process.env.API_KEY,
      size: 10 // you can choose the number of events you would like to return
    },
  })
    .then(results => {
      console.log(results.data); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
    })
    .catch(error => {
      console.log(error);
    });
    
  res.render('pages/discover');
});

// *****************************************************
//  Start Server for Dev
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');