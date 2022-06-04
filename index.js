require('dotenv').config();
require('./database');
const express = require('express');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const validator = require('email-validator');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');
const User = require('./models/User');
const File = require('./models/File');
const auth = require('./middlwares/auth');
const app = express();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json({ extended: true }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/temp/"
}));
app.use(cookieParser());

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});


function createJwtToken(user) {
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY);
    return token;
}
app.get('/', (req, res) => {
    res.send('<h1>Welcome to file uploading web service</h1>');
});

app.post('/users', async(req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findOne({ email });
        if (user)
            return res.status(400).send({ error: 'Already registered with this email id' });
        if (!password || !name || !email)
            return res.status(400).send({ error: 'name,email and password fields are required' });
        if (!validator.validate(email))
            return res.status(400).send({ error: 'invalid email' });
        if (name.length < 3 || name.length > 20)
            return res.status(400).send({ error: 'name should conatain minimum 3 and maximum 20 characters' });
        if (password.length < 6 || password.legnth > 20)
            return res.status(400).send({ error: 'password should contain minimum 3 and maximum 20 characters' });
        const hashedPassword = await bcrypt.hash(password, 8);
        const validUser = new User({ name, email, password: hashedPassword });
        const token = createJwtToken(validUser);
        validUser.token = token;
        await validUser.save();
        res.cookie('token', token, { expires: new Date(Date.now() + 8 * 3600000), httpOnly: true })
            .send(validUser);
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: 'internal server error' });
    }
});

app.post('/users/login', async(req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
        return res.status(400).send({ error: 'email or password is invalid' });
    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck)
        return res.status(400).send({ error: 'email or password is invalid' });
    const token = createJwtToken(user);
    user.token = token;
    await user.save();
    res.status(200)
        .cookie('token', token, { expires: new Date(Date.now() + 8 * 360000), httpOnly: true })
        .send(user);
});
app.get('/files', auth, async(req, res) => {
    const files = await File.find({ email: req.user.email });
    const responseFileData = [];
    for (let i = 0; i < files.length; i++) {
        responseFileData.push({
            name: files[i].name,
            url: files[i].url
        })
    }
    return res.status(200).send(responseFileData);
})
app.get('/files/:filename', auth, async(req, res) => {
    const fileName = req.params.filename;
    const file = await File.findOne({ name: fileName, email: req.user.email });
    if (!file)
        return res.status(400).send({ error: 'No file found' });
    return res.status(200).send({ name: fileName, url: file.url });
});

app.post('/files', auth, async(req, res) => {
    if (!req.files || !req.body.name)
        return res.status(400).send({ error: 'name and file fields are required' });
    let file = req.files.file;
    if (file.length)
        return res.status(400).send({ error: 'you can not upload multiple files' });
    const existedFile = await File.findOne({ name: req.body.name, email: req.user.email });
    if (existedFile)
        return res.status(400).send({ error: 'File with the same name already exist' });
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'User'
    });
    const myFile = new File({
        name: req.body.name,
        public_id: result.public_id,
        url: result.secure_url,
        email: req.user.email
    })
    await myFile.save();
    res.status(201).send({ name: req.body.name, url: result.secure_url });
});

app.delete('/files/:filename', auth, async(req, res) => {
    const fileName = req.params.filename;
    const file = await File.findOneAndDelete({ name: fileName, email: req.user.email });
    if (!file)
        return res.status(400).send({ error: 'file does not exist' });
    const result = await cloudinary.uploader.destroy(file.public_id);
    res.status(201).send({ name: fileName, success: 'file is deleted' });
});
app.get('/users/logout', auth, (req, res) => {
    return res.status(200).clearCookie('token').send({ success: 'loggedout successfully' });
})
app.listen(process.env.PORT, () => { console.log('Server is listening') });