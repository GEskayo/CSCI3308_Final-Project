// Imports the index.js file to be tested.
const server = require('../index'); //TO-DO Make sure the path to your index.js is correctly added
//console.log(server);
// Importing libraries
const axios = require('axios');
// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;
const express = require('express');
const session = require('express-session');


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
});
  // ===========================================================================
  // TO-DO: Part A Login unit test case
  //We are checking POST /add_user API by passing the user info in the correct order. This test case should pass and return a status 200 along with a "Success" message.
//Positive cases
// it('positive : /login', done => {
//     chai
//       .request(server)
//       .post('/login')
//       .send({username: 'kaleb', password: 'hello'})
//       .end((err, res) => {
//         expect(res).to.have.status(200);
//         expect(res.body.message).to.equals('success');
//         done();
//       });
//   });


// //We are checking POST /add_user API by passing the user info in in incorrect manner (name cannot be an integer). This test case should pass and return a status 200 along with a "Invalid input" message.
// it('Negative : /login. Checking invalid password', done => {
//   chai
//     .request(server)
//     .post('/login')
//     .send({username: 'kaleb', password: 'incorrect'})
//     .end((err, res) => {
//       expect(res).to.have.status(200);
//       expect(res.body.message).to.equals('Invalid input');
//       done();
//     });
// });

// //Positive cases
// it('positive : /register', done => {
//   chai
//     .request(server)
//     .post('/register')
//     .send({username: 'dow', password:'up'}) //for this make sure to input new credientials as it can only be used once then the user is in the DB
//     .end((err, res) => {
//       expect(res).to.have.status(200);
//       expect(res.body.message).to.equals('Success');
//       done();
//     });
// });

// it('Negative : /register. existing user', done => {
//   chai
//     .request(server)
//     .post('/register')
//     .send({username: 'kaleb', password: 'hello'})
//     .end((err, res) => {
//       expect(res).to.have.status(200);
//       expect(res.body.message).to.equals('Invalid input');
//       done();
//     });
// });

// });

// //Positive test case for /detail_product API
// it('Positive: /detail_product/:id - Product Found', done => {
//   // Backup the original Axios get method
  
//   const originalAxiosGet = axios.get;
//   const testProductId = '00706590-f442-441d-b653-ef683a0306bf';
//   // Mock Axios get method
//   axios.get = () => Promise.resolve({ data: [{ id: testProductId}] });

//   chai
//     .request(server)
//     .get('/detail_product/' + testProductId)
//     .end((err, res) => {
//       // Restore the original Axios get method after the test
//       axios.get = originalAxiosGet;
//       console.log(res.body);
//       expect(res).to.have.status(200);
//       expect(res.body).to.be.an('object');
//       expect(res.body).to.have.property('id', testProductId);
//       done();
//     });
// }).timeout(7000);


// // //negative test case for /detail_product API
// it('Negative: /detail_product/:id - Product Not Found', done => {
//   const originalAxiosGet = axios.get;
//   const testProductId = 'hel'; // Use an ID that is not present in the database

//   axios.get = () => Promise.resolve({data: [{id: testProductId}]});
  
//   chai
//     .request(server)
//     .get(`/detail_product/${testProductId}`)
//     .end((err, res) => {
//       expect(res).to.have.status(404); // or other appropriate status code for 'not found'
//       expect(res.body).to.be.an('object');
//       expect(res.body).to.have.property('error', 'Product not Found');
//       done();
//     });
// }).timeout(10000);

// //positive test case for /discover API (still needs the pass test case)
// it('Positive: /discover - Data Retrieved Successfully', done => {
  
//   chai
//     .request(server)
//     .get('/discover')
//     .query({
//       wear: '', // Optional, replace with a valid wear value
//       item_group: '', // Optional, replace with a valid item group value
//       search: '', // Optional, replace with a valid search term
//       sort: '' // Optional, replace with either 'High to Low' or 'Low to High'
//     })
//     .end((err, res) => {
//       expect(res).to.have.status(200);
//       expect(res.body).to.be.an('object');
//       expect(res.body.results).to.be.an('array');
//       done();
//     });
// }).timeout(7000);

// //negative test case for /discover API
it('Negative: /discover - API Call Fails', done => {
  // Mock the axios call to simulate a failure
  sinon.stub(axios, 'get').rejects(new Error('API call failed'));

  chai
    .request(server)
    .get('/discover')
    .end((err, res) => {
      expect(res).to.have.status(500); // Assuming a 500 status code is returned on API failure
      expect(res.body).to.be.an('object');
      expect(res.body.error).to.equal('API call failed');
      axios.get.restore(); // Restore the original axios.get function
      done();
    });
});

// //postive test case for /home page API
it('Positive: /home - User Logged In', done => {
  // Mock a logged-in session
  const app = express();
  app.use(session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }));
  app.use((req, res, next) => {
    req.session.users = { username: 'testUser' }; // Mimic a logged-in user
    next();
  });
  app.get('/home', (req, res) => {
    if (req.session.users) {
      res.status(200).send('Home Page'); // Simplified response for testing
    } else {
      res.redirect('/login');
    }
  });
  chai
    .request(app)
    .get('/home')
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.text).to.equal('Home Page'); // Check if the response text is 'Home Page'
      done();
    });
});

//negative test case for /home page API
it('Negative: /home - User Not Logged In', done => {
  const app = express();
  app.use(session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }));
  app.get('/home', (req, res) => {
    if (req.session.users) {
      res.status(200).send('Home Page');
    } else {
      res.redirect('/login');
    }
  });

  chai
    .request(app)
    .get('/home')
    .redirects(0) // Prevent chai-http from following redirects
    .end((err, res) => {
      expect(res).to.redirectTo('/login'); // Check if it redirects to the login page
      done();
    });
});

