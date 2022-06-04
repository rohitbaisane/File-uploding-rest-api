const User = require('../models/User');
const jwt = require('jsonwebtoken');
module.exports = async(req, res, next) => {
    if (!req.cookies.token)
        return res.status(403).send({ error: 'Unauthorized access' });
    const token = req.cookies.token;
    const user = await User.findOne({ token: token });
    if (!user)
        return res.status(403).send({ error: 'Unauthorized access' });
    req.user = user;
    next();
}