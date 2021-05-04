/*
CSC3916 Final Project
File: Server.js
Description: Web API scaffolding
 */

require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Item = require('./Items');
var Transaction = require('./Transactions');
var mongoose = require('mongoose');
var IPLookUp = require('ip-geolocation-api-javascript-sdk');
var ipgeolocationApi = new IPLookUp("983d75b3fb804764b2ed02e89f037c5b", false);
var GeolocationParams = require('ip-geolocation-api-javascript-sdk/GeolocationParams.js');



//const Users = require('./Users');



var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();


router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.send({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;


        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.send({ success: false, message: 'A user with that username already exists.'});
                else
                    console.log(err);
                return;
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    function handleResponse(json) {
        console.log(json.country_code2);
    }

    function getClientIp(req) {
        var ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.connection.remoteAddress;
        return ip;
    }

    var geolocationParams = new GeolocationParams();
    geolocationParams.setIPAddress(getClientIp(req));
    geolocationParams.setFields('country_code2');
    var ipdata = JSON.parse(ipgeolocationApi.getGeolocation(handleResponse, geolocationParams));

    console.log(userNew);

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            console.log(err);
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);

                User.findOneAndUpdate({username: req.body.username}, {countryCode: ipdata.country_code2}, function(err, user) {
                    if(err){
                        res.status(403).json({success:false, message: "Could not update ip"});
                    }else{
                        res.status(200).json({success: true, message: "Updated ip"});
                    }
                })

                res.json({success: true, token: 'JWT ' + token});

            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

//get and post for both items and transaction
router.route('/transaction')
    .post(authJwtController.isAuthenticated, function (req, res) {
        // post function
        var transaction = new Transaction();

        transaction.id = req.body.id;
        transaction.cart = req.body.cart;
        transaction.date = req.body.date;
        transaction.ip = req.body.ip;

        transaction.save(function (err) {
            if (err) {
                return res.json(err);
            }
            res.json({success: true, msg: 'Transaction saved.'});
        })

    })


    .get(authJwtController.isAuthenticated, function (req, res) {
        Transaction.find({}, function(err, transaction) {
            res.json({Transaction: transaction});
        })
    });


router.route('/item')
    .post(function (req, res) {
        // post function
        var item = new Item();

        item.item_name = req.body.item_name;
        item.price = req.body.price;
        item.country_blacklist = req.body.country_blacklist;
        item.item_id = req.body.item_id;
        item.imageUrl = req.body.imageUrl;

        item.save(function (err) {
            if (err) {
                return res.json(err);
            }
            res.json({success: true, msg: 'Item saved.'});
        })

    })


    .get(function (req, res) {

        Item.find(function (err, items) {
            if (err) {
                return res.json(err);
            } else {
                res.json(items);
            }
        })
        /*Item.findOne({item_id: req.params.item_id}, function (err, items){
            if (err)  throw err;
            else {
                Item.aggregate()
                    .lookup ()
                    .exec(function (err, items){
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            res.json(items);
                        }
                    })
            }
        })*/

    });


// // GET movies gets all the movies in the database
// router.get('/movies', (req, res) => {
//     Movie.find({}, function(err, movies) {
//         if (err) {
//             console.log(err);
//             res.send(err);
//         }

//         var movieMap = {};

//         movies.forEach(function(movie) {
//             movieMap[movie._id] = movie;
//         })

//         res.json({success: true, movies: movieMap});
//     })
// });

// // POST movies adds a movie to the database
// router.post('/movies', (req, res) => {

//     if (!req.body.Title || !req.body.YearReleased || !req.body.Genre || (req.body.Actors < 3)) {
//         res.send({success: false, msg: 'Please include a title, year, genre, and at least 3 actors.'})
//     }

//     const movie = new Movie();

//     movie.Title = req.body.Title;
//     movie.YearReleased = req.body.YearReleased;
//     movie.Genre = req.body.Genre;
//     movie.Actors = req.body.Actors;

//     movie.save(function(err) {
//         if (err) {
//             res.send(err);
//             console.log(err);
//         }

//         res.json({success: true, movie: movie});
//     })
// });

// router.put('/movies/:id', (req, res) => {

//     const movie = new Movie();

//     movie.Title = req.body.Title;
//     movie.YearReleased = req.body.YearReleased;
//     movie.Genre = req.body.Genre;
//     movie.Actors = req.body.Actors;

//     Movie.findByIdAndUpdate(req.params._id, movie, function (err) {
//         if (err) {
//             res.send(err);
//             console.log(err);
//         }

//         res.json({success:true, movieupdated: movie});
//     });

// });

// router.delete('/movies/:id', (req, res) => {

//     Movie.findByIdAndDelete(req.params._id, function (err) {
//         if (err) {
//             res.send(err);
//             console.log(err);
//         }

//         res.json({success: true, message: "movie deleted"});
//     });

// });

// // GET movies gets all the movies in the database
// router.get('/moviereviews', (req, res) => {

//     // should be a bool
//     var togglereviews = req.query.reviews;

//     console.log(togglereviews)

//     if (togglereviews) {
//         // show movies + reviews (join db's using $lookup)
//         // Movie.aggregate([{
//         //         $lookup: {
//         //             from: "Review",
//         //             localfield: "Title",
//         //             foreignField: "MovieName",
//         //             as: "MovieReviews"
//         //         }
//         //     }

//         // ])

//         // show movies, reviews should show as well
//         Movie.find({}, function (err, movies) {
//             if (err) {
//                 console.log(err);
//                 res.send(err);
//             }

//             var movieMap = {};

//             movies.forEach(function (movie) {
//                 movieMap[movie._id] = movie;
//             })

//             Review.find({}, function(err, reviews) {
//                 if (err) {
//                     console.log(err);
//                     res.send(err);
//                 }
//                 var reviewMap = {};

//                 reviews.forEach(function (review) {
//                     reviewMap[review._id] = review;
//                 })

//                 res.json({
//                     success: true,
//                     movies: movieMap,
//                     reviews: reviewMap
//                 });
//             })

//         })

//     } else {
//         // just show movies
//         Movie.find({}, function (err, movies) {
//             if (err) {
//                 console.log(err);
//                 res.send(err);
//             }

//             var movieMap = {};

//             movies.forEach(function (movie) {
//                 movieMap[movie._id] = movie;
//             })

//             res.json({
//                 success: true,
//                 movies: movieMap
//             });
//         })
//     }


// });


// // POST reviews adds a review to the database, given that the movie exists
// router.post('/movies/reviews', (req, res) => {

//     if (!req.body.ReviewerName || !req.body.Quote || !req.body.Rating || !req.body.MovieName) {
//         res.send({
//             success: false,
//             msg: 'Please include a ReviewerName, quote, rating, and a moviename.'
//         })
//     }

//     const review = new Review();

//     review.ReviewerName = req.body.ReviewerName;
//     review.Quote = req.body.Quote;
//     review.Rating = req.body.Rating;
//     review.MovieName = req.body.MovieName;

//     // make sure the movie is in the db, if so, save the review for that movie
//     Movie.findOne({
//         Title: review.MovieName
//     }).exec(function (err, mov) {
//         if (err) {
//             console.log(err);
//             res.send(err);
//         }

//         // make sure mov is not null aka it exists
//         if (mov === null) {
//             res.json({success: false, msg: "couldn't find movie, check that movie name is correct"})
//             return; // throw error, prevent node from continuing on with save, etc.
//         }

//         // if movie is in database, save review for this movie
//         review.save(function (err) {
//             if (err) {
//                 res.send(err);
//                 console.log(err);
//             }

//             res.send({
//                 success: true,
//                 review: review
//             })
//         })
//     })
// });


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only
