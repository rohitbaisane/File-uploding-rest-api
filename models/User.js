const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const user = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    token: String
});

module.exports = mongoose.model('user', user);