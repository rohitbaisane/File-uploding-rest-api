const mongoose = require('mongoose');
const User = require('./User');
const Schema = mongoose.Schema;
const file = new Schema({
    name: {
        type: String,
        required: true
    },
    public_id: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('File', file);