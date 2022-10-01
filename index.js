// importing dependencies
const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
const session = require("express-session");

// setting up expess validator
const { check, validationResult } = require("express-validator"); //destructuring an object

// connect to DB
mongoose.connect("mongodb://localhost:27017/connectCanada", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// define the model, for storing Data
const Concern = mongoose.model("Concern", {
  customerName: String,
  customerEmail: String,
  requestDescription: String,
  customerUploadName: String,
});

// define model for admin users login
const User = mongoose.model("User", {
  uName: String,
  uPass: String,
});

// set up variables to use packages
var myApp = express();

// set up the session middleware
myApp.use(
  session({
    secret: "connectcanadasecret",
    resave: false,
    saveUninitialized: true,
  })
);

myApp.use(express.urlencoded({ extended: false }));
myApp.use(fileUpload()); // set up the express file upload middleware to be used with Express

// set path to public folders and view folders
myApp.set("view engine", "ejs");
myApp.set("views", path.join(__dirname, "views"));
myApp.use(express.static(__dirname + "/public"));

var nameRegex = /^[a-zA-Z0-9]{1,}\s[a-zA-Z0-9]{1,}$/;

// set up different routes (pages) of the website
//render the raise a concern page
myApp.get("/", function (req, res) {
  res.render("request"); 
});

// render the login page
myApp.get("/login", function (req, res) {
  res.render("login");
});

// fetch the data entered in username and password
myApp.post("/login", function (req, res) {
  var uName = req.body.uname;
  var uPass = req.body.upass;

  // find it in the database
  User.findOne({ uName: uName, uPass: uPass }).exec(function (err, user) {
    // set up the session variables for logged in users
    console.log("Errors: " + err);
    if (user) {
      req.session.uName = user.uName;
      req.session.loggedIn = true;
      // redirect to dashboard
      res.redirect("/dashboard");
    } else {
      res.redirect("/login");
      //res.render('login', {error: 'Incorrect username/password'}); // complete the logic on login.ejs file to show the error only if error is undefined.
    }
  });
});

// show all concerns raised
myApp.get("/dashboard", function (req, res) {
  if (req.session.loggedIn) {
    Concern.find({}).exec(function (err, concerns) {
      console.log(err);
      console.log(concerns);
      res.render("dashboard", { concerns: concerns });
    });
  } else {
    res.redirect("/login");
  }
});

myApp.get("/logout", function (req, res) {
  req.session.uName = "";
  req.session.loggedIn = false;
  res.redirect("/login");
});

// show only one depending on the id
myApp.get("/print/:concernid", function (req, res) {
  if (req.session.loggedIn) {
    var concernId = req.params.concernid;
    Concern.findOne({ _id: concernId }).exec(function (err, concern) {
      res.render("concern", concern);
    });
  } else {
    res.redirect("/login");
  }
});

myApp.get("/concern/:concernid", function (req, res) {
  if (req.session.loggedIn) {
    var concernId = req.params.concernid;
    Concern.findOne({ _id: concernId }).exec(function (err, concern) {
      res.render("concern", concern);
    });
  } else {
    res.redirect("/login");
  }
});

// to delete from the database
myApp.get("/deletesuccess/:concernid", function (req, res) {
  if (req.session.loggedIn) {
    var concernId = req.params.concernid;
    Concern.findByIdAndDelete({ _id: concernId }).exec(function (err, concern) {
      res.render("deletesuccess");
    });
  } else {
    res.redirect("/login");
  }
});
// edit
myApp.get("/edit/:concernid", function (req, res) {
  if (req.session.loggedIn) {
    var concernId = req.params.concernid;
    Concern.findOne({ _id: concernId }).exec(function (err, concern) {
      res.render("edit", concern);
    });
  } else {
    res.redirect("/login");
  }
});

// process the edited form
myApp.post("/editprocess/:concernid", function (req, res) {
  if (!req.session.loggedIn) {
    res.redirect("/login");
  } else {
    var customerName = req.body.customerName;
    var customerEmail = req.body.customerEmail;
    var requestDescription = req.body.requestDescription;
    var customerUploadName = req.files.customerUpload.name;
    var customerUploadFile = req.files.customerUpload; // this is a temporary file in buffer.
    // check if the file already exists or employ some logic that each filename is unique.
    var customerUploadPath = "public/uploads/" + customerUploadName;
    // move the temp file to a permanent location mentioned above
    customerUploadFile.mv(customerUploadPath, function (err) {
      console.log(err);
    });
    // update the edited concern in data base and save
    var concernId = req.params.concernid;
    Concern.findOne({ _id: concernId }).exec(function (err, concern) {
      concern.customerName = customerName;
      concern.customerEmail = customerEmail;
      concern.requestDescription = requestDescription;
      concern.customerUploadName = customerUploadName;
      concern.save();
      res.render("editsuccess");
    });
  }
});

//when customer submits a form, process the data entered
myApp.post(
  "/process",
  [
    check("requestDescription", "Please enter a description.").not().isEmpty(),
    check("customerEmail", "Please enter a valid email").isEmail(),
    check("customerName", "Please enter firstname and lastname").matches(
      nameRegex
    ),
  ],
  function (req, res) {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.render("request", { er: errors.array() });
    } else {
      var customerName = req.body.customerName;
      var customerEmail = req.body.customerEmail;
      var requestDescription = req.body.requestDescription;
      var customerUploadName = req.files.customerUpload.name;
      var customerUploadFile = req.files.customerUpload;
      var customerUploadPath = "public/uploads/" + customerUploadName;
      customerUploadFile.mv(customerUploadPath, function (err) {
        console.log(err);
      });

      // create an object with the fetched data
      var pageData = {
        customerName: customerName,
        customerEmail: customerEmail,
        requestDescription: requestDescription,
        customerUploadName: customerUploadName,
      };

      // create an object from the model to save to DB
      var myConcern = new Concern(pageData);
      // save it to DB
      myConcern.save();

      // send the data to the view and render it
      res.render("requestsuccess");
    }
  }
);

// setup routes to save login info in DB
myApp.get("/setup", function (req, res) {
  let userData = [
    {
      uName: "admin",
      uPass: "admin",
    },
  ];
  User.collection.insertMany(userData);
  res.send("admin login credentials added");
});

// start the server and listen at a port
myApp.listen(8080);
console.log("Everything executed, open http://localhost:8080/ in the browser.");
