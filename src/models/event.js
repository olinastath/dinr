const mongoose = require('mongoose');

// const User = require('./user');
// const Restaurant = require('./restaurant');


const Event = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: {type: String, required: true},
  datetime: {type: Date, required: true},
  restrictions: [{type: String}],
  restaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
});

module.exports = mongoose.model('Event', Event);