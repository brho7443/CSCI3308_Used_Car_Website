// Imports the index.js file to be tested.
const server = require('../index'); //TO-DO Make sure the path to your index.js is correctly added
// Importing libraries

// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });

  // ===========================================================================
  // TO-DO: Part A Login unit test case
  // ===========================================================================

  // Test to check if user can be created in database
  it('Positive : /register successfully adds user to database', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 'user', password: '1234'})
      .end((err, res) => {
        expect(res).to.have.status(201);
        // expect(res.body.message).to.equals('Successfully created user!');
        done();
      });
  });

  // Test to check if invalid variable type was passed
  it('Negative : /register invalid variable type was passed', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 420, password: 1234})
      .end((err, res) => {
        expect(res).to.have.status(400);
        // expect(res.body.message).to.equals('Invalid input, user not created.');
        done();
      });
  });

  // Test what will happen if wrong fields are passed into API
  it('Negative : /register wrong fields were passed into API', done => {
    chai
      .request(server)
      .post('/register')
      .send({wrong_input: 'user', wrong_input: '1234'})
      .end((err, res) => {
        expect(res).to.have.status(400);
        // expect(res.body.message).to.equals('Invalid input.');
        done();
      });
  });

  // Test to check if user can be successfully logged in
  it('Positive : /login successfully logs in the user', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: 'user', password: '1234'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        // expect(res.body.message).to.equals('Successfully deleted user!');
        done();
      });
  });

  // Test to check if user will be rejected log in if username is wrong
  it('Negative : /login denies log in if username is wrong', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: 'user1', password: '1234'})
      .end((err, res) => {
        expect(res).to.have.status(401);
        // expect(res.body.message).to.equals('Successfully deleted user!');
        done();
      });
  });

  // Test to check if user will be rejected log in if password is wrong
  it('Negative : /login denies log in if password is wrong', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: 'user', password: 'wrong_password'})
      .end((err, res) => {
        expect(res).to.have.status(401);
        // expect(res.body.message).to.equals('Successfully deleted user!');
        done();
      });
  });

  // Test to check if you can delete already registered user
  it('Positive : /deleteProfileTest successfully deletes user from database', done => {
    chai
      .request(server)
      .post('/deleteProfileTest')
      .send({username: 'user'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });

});