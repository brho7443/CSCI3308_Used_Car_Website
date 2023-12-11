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
  res.redirect('/home');
});

app.get('/home', (req, res) => {
  if(req.session.user) {
    res.render('pages/home');
  }
  else{
    res.render('pages/home',{
      error: false,
      message: `You must be signed in to view listings`,
    });
  }
});

// -------- LOGIN --------
app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const hash = await bcrypt
  .hash(req.body.password, 10)
  .catch(err => console.error(err.message).log('failed to encrypt pass'));

  const query = `SELECT * FROM user_table WHERE username = $1`;

  await db.one(query, [username])
    .then(async (data) =>{
      const match = await bcrypt.compare(req.body.password, data.password);

      if (match === false) {
        console.error("Incorrect username or password");
        res.status(401).render('pages/login',{
          error: true,
          message: `Incorrect username or password`,
        });
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
      res.status(401).render('pages/login',{
        error: true,
        message: `Incorrect username or password`,
      });
    })
});

app.get('/logout', (req, res) => {
  if(req.session.user) {
    req.session.destroy();
    res.render('pages/logout',{
      error: false,
      message: `Logged out successfully`,
    });
  }
  else {
    res.render('pages/logout',{
      error: true,
      message: `Not logged in. Failed to logout`,
    });
  }
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
    
    let result = await db.query(sql, [username, hash])
    .then(() =>{
      res.status(201).render('pages/register',{
        error: false,
        message: `Successfully registered user!`,
      })
    })
    .catch(err =>{
      console.log(err);
      // res.redirect(400,'/register/failed');
      res.status(400).render('pages/register',{
        error: true,
        message: `Username taken. Failed to register`,
      })
      //Alert user that username is already registered
    });

    // console.log('After DB Alteration:');
    // let entries = await db.query('SELECT * FROM user_table');
    // console.log(entries);

    // res.json({ message: 'Successfully created user!' });
    // res.redirect('/login');
  }
  else {
    // res.json({message: 'Invalid input, user not created.'});
    res.status(400).render('pages/register',{
      error: true,
      message: `User input must be string`,
    })
  }
});


// -------- PROFILE --------

app.get('/profile', (req, res) => {
  if(req.session.user) {
    const username = user.username;
    res.render('pages/profile', {username});
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});


app.post('/profile/delete', async (req, res) => {
  if (req.session.user) {
    // console.log('Before DB Alteration:');
    // let entries = await db.query('SELECT * FROM user_table');
    // console.log(entries);
    
    const username = user.username;

    // Delete user's data from cart_table
    await db.query('DELETE FROM cart_table WHERE username = $1', [username]);

    // Delete user's data from car_table
    await db.query('DELETE FROM car_table WHERE username = $1', [username]);

    // Delete user from user_table
    await db.query('DELETE FROM user_table WHERE username = $1', [username]);

    // console.log('After DB Alteration:');
    // entries = await db.query('SELECT * FROM user_table');
    // console.log(entries);

    res.redirect('/logout');
  }
  else {
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});


app.post('/profile/changePassword', async (req, res) => {
  if(req.session.user) {
    const username = user.username;
    let hash = await bcrypt.hash(req.body.password, 10);

    const sql = `UPDATE user_table SET password = $1 WHERE username = $2`;

    let result = await db.query(sql, [hash, username])
    .catch(err =>{
      console.log(err);
      res.redirect(400,'/register');
    })

    res.render('pages/profile', {username});
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
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
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

axios({
  url: 'https://carapi.app/api/exterior-colors?limit=100&verbose=yes&year=2016',
  method: 'GET'
})
  .then(async response => {
    const insertCarQuery = `INSERT INTO car_table (make, model, color, price, miles, car_description) VALUES ($1, $2, $3, $4, $5, $6);`;

    // Iterate over the properties of the object the API gives us
    Object.keys(response.data.data).forEach(async carId => {
      const car = response.data.data[carId];
      const make = car.make_model_trim.make_model.make.name;
      const model = car.make_model_trim.make_model.name;
      const price = car.make_model_trim.invoice;
      const color = car.name;
      const car_description = car.make_model_trim.description;
      const miles = car.make_model_trim.id;
  
      await db.query(insertCarQuery, [make, model, color, price, miles, car_description])
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
    // console.log('Before DB Alteration:');
    // let entries = await db.query('SELECT * FROM cart_table');
    // console.log(entries);
    
    if(req.session.user) {
      const car_id = req.body.car_id;
      const username = user.username;
      
      const sql = `INSERT INTO cart_table (car_id, username) VALUES ($1, $2)`;
      await db.query(sql, [car_id, username])

      // console.log('After DB Alteration:');
      // entries = await db.query('SELECT * FROM cart_table');
      // console.log(entries);

      res.redirect('/buy');
    }
    else {res.redirect(500,'/profile');}
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

app.get('/cart', async (req, res) => {
  if(req.session.user) {
    try {
      let username = user.username;
      let cars = await db.query('SELECT car_table.* FROM cart_table JOIN car_table ON cart_table.car_id = car_table.car_id WHERE cart_table.username = $1', username);
      res.render('pages/cart', { cars, username });
    } catch (error) {
      console.error('Error fetching cars from the database:', error);
      res.status(500).send('Internal Server Error');
    }
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

app.post('/remove-from-cart', async (req, res) =>{
  if (req.session.user) {
    // console.log('Before DB Alteration:');
    // let entries = await db.query('SELECT * FROM cart_table');
    // console.log(entries);
    
    if(req.session.user) {
      const car_id = req.body.car_id;
      const username = user.username;
      
      const sql = `DELETE FROM cart_table WHERE car_id = $1 AND username = $2`;
      await db.query(sql, [car_id, username])

      // console.log('After DB Alteration:');
      // entries = await db.query('SELECT * FROM cart_table');
      // console.log(entries);

      res.redirect('/cart');
    }
    else {res.redirect(500,'/profile');}
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

// -------- SELLING --------
app.get('/sell', async (req, res) => {
  if(req.session.user) {

    const username = req.session.user.username;
    const query = `SELECT * FROM car_table WHERE username = $1`;

    let cars = await db.any(query, [username])
    .catch(err =>{
      console.error('Error fetching cars from the database:', err);
      console.log(err);
      res.status(500).send('Internal Server Error');
    });

    res.render('pages/sell', { cars });

  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

app.get('/sell/new', (req, res) => {
  if(req.session.user) {
    res.render('pages/sell_new');
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

app.post('/sell/new', async (req, res) =>{
  if(req.session.user) {
    const make = req.body.make;
    const model = req.body.model;
    const color = req.body.color;
    const price = req.body.price;
    const miles = req.body.miles;
    const car_description = req.body.car_description;
    const username = user.username;

    const query = `INSERT INTO car_table(make, model, color, price, miles, car_description, username) VALUES ($1, $2, $3, $4, $5, $6, $7)`;

    const result = await db.query(query, [make, model, color, price, miles, car_description, username])
    .catch(err =>{
      console.log(err);
    });
    res.render('pages/sell_new',{
      error: false,
      message: `Successfully listed car`,
    })
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

app.get('/sell/remove-listing', (req, res) => {
  if(req.session.user) {
    res.redirect('/sell');
  }
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

app.post('/sell/remove-listing', async (req, res) =>{
  if(!req.session.user) {
    res.redirect('/login');
  }

  const username = req.session.user.username;
  const car_id = req.body.car_id;
  const query = `DELETE FROM car_table WHERE username = $1 AND car_id = $2;`;

  await db.query(query, [username, car_id])
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
  else{
    res.status(401).render('pages/login',{
      error: true,
      message: `You must be signed in to view listings`,
    });
  }
});

// -------- TESTING --------
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.post('/deleteProfileTest', async (req, res) => {
    const username = req.body.username;
    // Delete user's data from cart_table
    await db.query('DELETE FROM cart_table WHERE username = $1', [username]);

    // Delete user's data from car_table
    await db.query('DELETE FROM car_table WHERE username = $1', [username]);

    // Delete user from user_table
    await db.query('DELETE FROM user_table WHERE username = $1', [username]);

    res.redirect(200,'/logout');
});

// *****************************************************
//  Start Server for Dev
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000, at http://localhost:3000/');
