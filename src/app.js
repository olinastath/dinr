// require('./db');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const yelp = require('yelp-fusion');
const allRestrictions = ['gluten-free', 'kosher', 'pescatarian', 'vegan', 'vegetarian'];
const clientId = process.env.CLIENTID || require('./config.js').clientId;
const clientSecret = process.env.CLIENTSECRET || require('./config.js').clientSecret;
const app = express();
const session = require('express-session');
const sessionOptions = {
	secret: 'secret cookie thang (store this elsewhere!)',
	resave: true,
	saveUninitialized: true
};
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

function getRating(r) {
	let rating = '';
	const len = r - r % 1;
	let count = 0;
	for (let i = 0; i < len; i++) {
		rating += '<i class="fa fa-star" aria-hidden="true"></i>';
		count += 1;
	}
	if (r % 1 !== 0) {
		rating += '<i class="fa fa-star-half-o" aria-hidden="true"></i>';
		count +=1;
	}
	for (let i = count; i < 5; i++) {
		rating += '<i class="fa fa-star-o" aria-hidden="true"></i>';
	}
	return rating;
}


function authenticated(req,res,next) {
	if(req.user) {
		return next();
	} else {
		const message = 'you are not authenticated to view this page<br><a href="/">please log in &rarr;</a>';
		res.render('error', {message: message});
	}
}

const User = require('./models/user');
const Event = require('./models/event');
const Restaurant = require('./models/restaurant');
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const db = process.env.MONGODB_URI || require('./config.js').mongoKey;
mongoose.connect(db);


// body parser setup
app.use(bodyParser.urlencoded({ extended: false }));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));
const logInMsg = '';

app.get('/', (req, res) => {
	if (req.user) {
		res.redirect('/user/' + req.user.username);
	} else {
		res.render('index', {message: logInMsg});
	}
});

app.post('/register', function(req, res, next) {
	console.log('registering user');
	User.findOne({username: req.body.username}, function(err, user) {
		if (err) {
			return next(err);
		} else if (user) {
			return res.render('index', {message: 'user already exists'});
		} else if (req.body.username === '' || req.body.password === '') {
			return res.render('index', {message: 'enter username and password'});
		} else {
			const user = new User({
				username: req.body.username,
				friends: [],
				events: [],
			});
			User.register(user, req.body.password, function(err) {
				if (err) {
					return next(err);
				}
				passport.authenticate('local')(req, res, function () {
					req.session.save(function (err) {
					if (err) {
						return next(err);
					}
					res.redirect('/edit-profile');
					});
				});
				console.log('user registered!');
			});
		}
	});
});

app.post('/login', function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) { return next(err); }
		if (!user) {
			if (info.name === 'IncorrectUsernameError') {
				return res.render('index', {message: 'username is incorrect' });
			} else if (info.name === 'IncorrectPasswordError') {
				return res.render('index', {message: 'password is incorrect' });
			}
		} 
		req.logIn(user, function(err) {
			if (!user) {
				return res.render('index', {message: 'please enter username & password' });
			} else {
				if (err) { return next(err); }
				return res.redirect('/user/' + user.username);	
			}
		});
	})(req, res, next);
});

app.get('/edit-profile', authenticated, function(req, res) {
	res.render('edit_profile', {user: req.user});
});

app.post('/edit-profile', authenticated, function(req, res) {
	let dob;
	if (req.body.dob) {
		dob = req.body.dob.split('-').reverse();
		dob = dob[1] + '/' + dob[0] + '/' + dob[2];
	} else {
		dob = "";
	}
	const restrictions = [];
	for (let i = 0; i < allRestrictions.length; i++) {
		if (req.body[allRestrictions[i]] === 'on') {
			restrictions.push(allRestrictions[i]);
		}
	}

	User.findOneAndUpdate({username: req.user.username}, {
		$set: {
			name: req.body.name,
			dob: dob,
			restrictions: restrictions
		}
	}, function() {
		res.redirect('/user/' + req.user.username);
	});
});

app.get('/make-event', authenticated, function(req, res) {
	User.findOne({username: req.user.username}).populate('friends').exec(function(err, user) {
		if(err) {
			throw err;
		}
		res.render('make_event', {user: user});
	});
});

app.post('/make-event', authenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(err, user) {
		const members = [user._id];
		if (user.friends.length > 0) {
			for (let i = 0; i < user.friends.length; i++) {
				if (req.body[user.friends[i]] === 'on') {
					members.push(user.friends[i]);
				}
			}
		}

		let restrictions = [];
		let promises = [];
		for (let i = 0; i < members.length; i++) {
			promises.push(new Promise(function(fulfill) {
				User.findOne({_id: members[i]}, function(err, member) {
					if (err) {
						throw err;
					} else if (member !== null) {
						fulfill(member.restrictions);
					}
				});
			}));
		}

		Promise.all(promises).then(function(cumulative) {
			cumulative.push(req.user.restrictions);
			restrictions = cumulative.reduce(function(a, b){
				return a.concat(b);
			}, []).filter((value, index, r) => r.indexOf(value) === index);

			const event = new Event({
				name: req.body.name,
				datetime: req.body.datetime,
				users: members,
				restrictions: restrictions
			});

			event.save(function(err, event) {
				if (err) {
					console.log(err);
				} else {
					promises = [];
					for (let i = 0; i < members.length; i++) {
						promises.push(new Promise(function(fulfill) {
							User.findOneAndUpdate({_id: members[i]}, {
								$push: { 
									events: event
								}
							}, function() {
								fulfill();
							});
						}));
					}

					Promise.all(promises).then(function() {
						res.redirect('/user/' + user.username);
					});
				}
			});
		});
	});
});

app.get('/user/:slug', authenticated, function(req, res) {
	let userCondition = true;
	if (req.user.username === req.params.slug) {
		userCondition = false;	// if the profile you're viewing is your own, then display "hi!"
	}

	User.findOne({username: req.params.slug}).populate('friends').populate({path: 'events', options: {sort: 'datetime'}}).exec(function(err, profile) {
		if (err) {
			throw err;
		} else if (profile !== null) {
			let addCondition = true;
			for (let i = 0; i < profile.friends.length; i++) {
				if (profile.friends[i].username === req.user.username) {
					addCondition = false;	// if already friends, then we don't want to add them
					break;
				}
			}
			const currentDate = new Date();
			const events = profile.events.filter(g => g.datetime > currentDate);
			profile.events = events;
			addCondition = addCondition && userCondition;

			res.render('user_profile', {user: req.user, profile: profile, userCondition: userCondition, addCondition: addCondition, slug: req.params.slug});
		} else {
			const message = 'user does not exist';
			res.render('error', {message: message});
		}
	});
});


app.get('/event/:slug', authenticated, function(req, res) {
	Event.findOne({_id: req.params.slug}).populate('users').exec(function(err, event) {
		if (err) {
			throw err;
		} else if (event !== null) {
			const numUsers = event.users.length > 0;
			const numRestr = event.restrictions.length > 0;
			res.render('event', {event: event, numUsers: numUsers, numRestr: numRestr, slug: req.params.slug, user: req.user});
		} else {
			const message = 'event does not exist';
			res.render('error', {message: message});
		}
	});
});

app.post('/add-friend/:slug', authenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(err, user) {
		if (err) {
			throw err;
		} 
		User.findOne({username: req.params.slug}, function(err, friend) {
			if (err) {
				throw err;
			} else if (friend !== null) {
				let add = true;
				for (let i = 0; i < user.friends.length; i++) {
					if (user.friends[i].toString() === friend._id.toString()) {
						add = false;
					}
				}
				if (add) {
					User.findOneAndUpdate({username: user.username}, {
						$push: {
							friends: friend._id
						}
					}, function(err, user) {
						User.findOneAndUpdate({username: friend.username}, {
							$push: {
								friends: user._id
							}
						}, function() {
							User.findOne({username: req.user.username}).populate({
								path: 'friends',
								populate: { path: 'friends' }
							}).exec(function(err, user) {
								if (err) {
									throw err;
								}
								console.log("Before relogin: ", req.user.friends);
								req.login(user, function(err) {
									if (err) {
										throw err;
									}
									console.log("After relogin: ", req.user.friends);
									res.redirect('/user/' + req.params.slug);
								});
							});
						});
					});
				}
			}
		});
	});	
});

app.get('/generate/:slug', authenticated, function(req, res) {
	Event.findOne({_id: req.params.slug}).populate('restaurants').exec(function(err, event) {
		if (err) {
			throw err;
		} 
		res.render('restaurants', {list: event.restaurants, user: req.user});
	});
});

app.post('/generate/:slug', authenticated, function(req, res) {
	Event.findOne({_id: req.params.slug}, function(err, event) {
		if (err) {
			throw err;
		} else if (event !== null) {
			yelp.accessToken(clientId, clientSecret).then(response => {
				const client = yelp.client(response.jsonBody.access_token);
				const promises = [];
				const newRestaurants = [];
				for (let i = 0; i < event.restrictions.length; i++) {
					promises.push(new Promise(function(fulfill) {
						client.search({
							term:'restaurant',
							categories: event.restrictions[i],
							location: 'new york, ny',
							// limit: 12
						}).then(response => {
							response.jsonBody.businesses.forEach((business) => {
								console.log(business.name);
								Restaurant.findOne({id: business.id}, function(err, restaurant) {
									if (restaurant === null) {
										const restaurant = new Restaurant({
											name: business.name,
											image: business.image_url,
											id: business.id,
											rating: business.rating,
											stars: getRating(business.rating),
											price: business.price,
											categories: business.categories.map((cat) => cat.alias),
											url: business.url,
											address: business.location.display_address.reduce((addr, curr) => addr + ' ' + curr, ''),
											cuisine: business.categories.map((cat) => cat.title).reduce((addr, curr) => addr + ', ' + curr, '').substring(2)
										});

										restaurant.save(function(err, restaurant) {
											if (err) {
												console.log(err);
											} else {
												newRestaurants.push(restaurant);
											}
										});
									} else {
										newRestaurants.push(restaurant);
									}
								});
							});
							fulfill();
						});	
					}));
				}

				Promise.all(promises).then(function() {
					const indices = [];
					newRestaurants.map((rest) => rest.id).filter((value, index, r) => {
						if (r.indexOf(value) === index) {
							indices.push(index);
						}
						return r.indexOf(value) === index;
					});
					const unique = indices.map((i) => newRestaurants[i]);
					Event.findOneAndUpdate({_id: req.params.slug}, {
						$set: {
							restaurants: unique
						}
					}, function(err) {
						if (err) {
							throw err;
						}
						res.redirect('/generate/' + req.params.slug);
					});
				});
			}).catch(e => {
				console.log(e);
			});
		} else {
			res.render('error', {message: 'you aren\'t authorized to view this page'});
		}
	});
});


app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

app.get('*', function(req, res) {
	res.render('error', {message: 'page doesn\'t exist'});
});

app.listen(process.env.PORT || 3000);