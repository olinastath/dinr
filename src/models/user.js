const mongoose = require('mongoose');
const URLSlugs = require('mongoose-url-slugs');
const passportLocalMongoose = require('passport-local-mongoose');

// const Event = require('./event');
// const Restaurant = require('./restaurant');

const User = new mongoose.Schema({
	username: {type: String, required: true},
	name: {type: String},
	dob: {type: String},
	friends:  [{type: mongoose.Schema.Types.ObjectId}],
	events:  [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
	restrictions: [{type: String}]
});

User.plugin(passportLocalMongoose);
User.plugin(URLSlugs('username'));

module.exports = mongoose.model('User', User);