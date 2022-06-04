const mongoose = require('mongoose');
const url = process.env.DB_URL;
mongoose.connect(url, {
        useNewUrlParser: true
    })
    .then(() => {
        console.log('Database is connected');
    });