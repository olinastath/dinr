const mongoose = require('mongoose');

const Restaurant = new mongoose.Schema({
	name: {type: String, required: true},
	image: {type: String},
	id: {type: String, required: true},
	rating: {type: Number, required: true},
	stars: {type: String, required: true},
	price: {type: String, required: true},
	categories: [{type: String, required: true}],
	url: {type: String, required: true},
	address: {type: String},
	cuisine: {type: String}
});

module.exports = mongoose.model('Restaurant', Restaurant);