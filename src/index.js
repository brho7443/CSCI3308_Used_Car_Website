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
  cart_id : undefined
}

// -------- HOME --------

app.get('/', (req, res) => {
  if (req.session.user) {
    res.render('pages/home');
  }
  else {res.redirect('/login/failed');}
});

app.get('/home', (req, res) => {
  if(req.session.user) {
    res.render('pages/home');
  }
  else {res.redirect('/login/failed');}
});

// -------- LOGIN --------
app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.get('/login/invalid_request', (req, res) => {
  res.render('pages/login',{
    error: true,
    message: `You must be signed in to view listings`,
  });
});

app.get('/login/failed', (req, res) => {
  res.render('pages/login',{
    error: true,
    message: `Incorrect username or password`,
  });
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const hash = await bcrypt
  .hash(req.body.password, 10)
  .catch(err => console.error(err.message).log('failed to encrypt pass'));

  const query = `SELECT * FROM user_table WHERE username = $1`;

  db.one(query, [username])
    .then(async (data) =>{
      const match = await bcrypt.compare(req.body.password, data.password);

      if (match === false) {
        console.error("Incorrect username or password");
        res.redirect(400, '/login/failed');
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
      console.error(err);
      res.redirect(400, '/login/failed');
    })
});

// -------- REGISTER --------

app.get('/register', (req, res) =>{
  res.render('pages/register');
});

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


// -------- PROFILE --------

app.get('/profile', (req, res) => {
  if(req.session.user) {
    const username = user.username;
    res.render('pages/profile', {username});
  }
  else {res.redirect('/login/invalid_request');}
});


app.post('/profile/delete', async (req, res) =>{
  if (req.session.user) {
    console.log('Before DB Alteration:');
    let entries = await db.query('SELECT * FROM user_table');
    console.log(entries);
    
    if(req.session.user) {
      const username = user.username;
      
      let sql = `DELETE FROM user_table WHERE username = $1`;
      
      const result = await db.query(sql, [username]);

      console.log('After DB Alteration:');
      entries = await db.query('SELECT * FROM user_table');
      console.log(entries);

      res.redirect(200,'/logout');
    }
    else {res.redirect(500,'/profile');}
  }
  else {res.redirect('/login/invalid_request');}
});

app.get('/logout', (req, res) => {
  if(req.session.user) {
    req.session.destroy();
    res.render('pages/logout');
  }
  else {res.redirect('/login/invalid_request');}
});

app.post('/profile/changePassword', async (req, res) => {
  if(req.session.user) {
    const username = user.username;
    let hash = await bcrypt.hash(req.body.password, 10);

    const sql = `UPDATE user_table SET password = $1 WHERE username = $2`;

    let result = db.query(sql, [hash, username])
    .catch(err =>{
      console.log(err);
      res.redirect(400,'/register');
    })

    res.render('pages/profile', {username});
  }
  else {res.redirect('/login/invalid_request');}
});

// *****************************************************
//:  Functionality API Routes
// *****************************************************

// -------- BUYING AND SEARCH --------
app.get('/buy', async (req, res) => {
  if(req.session.user) {
    try {
      let cars = await db.query('SELECT * FROM car_table ORDER BY RANDOM()');
      res.render('pages/buy', { cars });
    } catch (error) {
      console.error('Error fetching cars from the database:', error);
      res.status(500).send('Internal Server Error');
    }
  }
  else {res.redirect('/login/invalid_request');}
});

axios({
  url: 'https://carapi.app/api/exterior-colors?limit=100&verbose=yes&year=2016',
  method: 'GET'
})
  .then(async response => {
    const insertCarQuery = `INSERT INTO car_table (make, model, color, price, miles, car_description) VALUES ($1, $2, $3, $4, $5, $6);`;

    // Iterate over the properties of the object the API gives us
    Object.keys(response.data.data).forEach(carId => {
      const car = response.data.data[carId];
      const make = car.make_model_trim.make_model.make.name;
      const model = car.make_model_trim.make_model.name;
      const price = car.make_model_trim.invoice;
      const color = car.name;
      const car_description = car.make_model_trim.description;
      const miles = car.make_model_trim.id;
  
      db.query(insertCarQuery, [make, model, color, price, miles, car_description])
      .catch(err =>{
        console.log(err);
        res.redirect(400,'/register');
      });
    });

    // console.log('After DB Alteration:');
    // let entries = await db.query('SELECT * FROM car_table');
    // console.log(entries);
  })
  .catch(error => {
      console.error('Error:', error);
  });


// -------- ADD CAR TO CART --------
app.post('/add-to-cart', async (req, res) =>{
  if (req.session.user) {
    console.log('Before DB Alteration:');
    let entries = await db.query('SELECT * FROM cart_table');
    console.log(entries);
    
    if(req.session.user) {
      const car_id = req.body.car_id;
      const username = user.username;
      
      const sql = `INSERT INTO cart_table (car_id, username) VALUES ($1, $2)`;
      await db.query(sql, [car_id, username])

      console.log('After DB Alteration:');
      entries = await db.query('SELECT * FROM cart_table');
      console.log(entries);

      res.redirect('/buy');
    }
    else {res.redirect(500,'/profile');}
  }
  else {res.redirect('/login/invalid_request');}
});

// -------- SELLING --------
app.get('/sell', async (req, res) => {
  if(req.session.user) {

    const username = req.session.user.username;
    const query = `SELECT * FROM car_table WHERE username = $1`;

    let cars = await db.any(query, [username])
    .catch(err =>{
      console.error('Error fetching cars from the database:', err);
      console.log(cars.data);
      console.log(err);
      res.status(500).send('Internal Server Error');
    });

    console.log(cars.data);
    res.render('pages/sell', { cars });

  }
  else{
    res.redirect('/login/failed');
  }
});

app.get('/sell/new', (req, res) => {
  if(req.session.user) {
    res.render('pages/sell_new');
  }
  else {res.redirect('/login/invalid_request');}
});

app.post('/sell/new', (req, res) =>{
  if(req.session.user) {
    const make = req.body.make;
    const model = req.body.model;
    const color = req.body.color;
    const price = req.body.price;
    const miles = req.body.miles;
    const car_description = req.body.car_description;
    const username = user.username;

    const query = `INSERT INTO car_table(make, model, color, price, miles, car_description, username) VALUES ($1, $2, $3, $4, $5, $6, $7)`;

    const result = db.query(query, [make, model, color, price, miles, car_description, username])
    .catch(err =>{
      console.log(err);
      console.log(result);
    });
    res.redirect('/sell');
  }
  else {res.redirect('/login?invalid=1');}
});

app.get('/sell/remove-listing', (req, res) => {
  if(req.session.user) {
    res.redirect('/sell');
  }
  else {res.redirect('/login/invalid_request');}
});

app.post('/sell/remove-listing', (req, res) =>{
  if(!req.session.user) {
    res.redirect('/login');
  }

  const username = req.session.user.username;
  const car_id = req.body.car_id;
  const query = `DELETE FROM car_table WHERE username = $1 AND car_id = $2;`;

  db.query(query, [username, car_id])
    .catch(err =>{
      console.log(err);
      res.status(400).json({
        message: `failed to remove listing`
      });
    })
    res.redirect('/sell');
});

// -------- ACCESSORIES --------
app.get('/accessories', (req, res) => {
  if(req.session.user) {
    res.render('pages/accessories');
  }
  else {res.redirect('/login/invalid_request');}
});


// -------- TESTING --------
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// app.get('/discover', (req,res) => {
//   axios({
//     url: `https://app.ticketmaster.com/discovery/v2/events.json`,
//     method: 'GET',
//     dataType: 'json',
//     headers: {
//       'Accept-Encoding': 'application/json',
//     },
//     params: {
//       apikey: process.env.API_KEY,
//       size: 10 // you can choose the number of events you would like to return
//     },
//   })
//     .then(results => {
//       console.log(results.data); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
//     })
//     .catch(error => {
//       console.log(error);
//     });
    
//   res.render('pages/discover');
// });

// *****************************************************
//  Start Server for Dev
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');