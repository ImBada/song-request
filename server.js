const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');
const { Song, sequelize } = require('./models/Song');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// 데이터베이스 초기화
sequelize.sync().then(() => console.log('Database synced'));

// 메인 페이지 (공개 리스트)
app.get('/', async (req, res) => {
    const songs = await Song.findAll({ where: { archived: false } });
    res.render('index', { songs });
});

// 신청 페이지
app.get('/request', (req, res) => {
    res.render('request');
});

app.post('/request', async (req, res) => {
    const { name, song } = req.body;
    const newSong = await Song.create({ name, song, completed: false });
    io.emit('songRequest', newSong);
    res.redirect('/');
});

// 관리 페이지
app.get('/manage', async (req, res) => {
    const songs = await Song.findAll();
    res.render('manage', { songs });
});

app.post('/manage/complete/:id', async (req, res) => {
    await Song.update({ completed: true }, { where: { id: req.params.id } });
    io.emit('songComplete', req.params.id);
    res.redirect('/manage');
});

app.post('/manage/uncomplete/:id', async (req, res) => {
    await Song.update({ completed: false }, { where: { id: req.params.id } });
    io.emit('songUncomplete', req.params.id);
    res.redirect('/manage');
});

app.post('/manage/archive/:id', async (req, res) => {
    await Song.update({ archived: true }, { where: { id: req.params.id } });
    io.emit('songArchive', req.params.id);
    res.redirect('/manage');
});

app.post('/manage/unarchive/:id', async (req, res) => {
    await Song.update({ archived: false }, { where: { id: req.params.id } });
    io.emit('songUnarchive', req.params.id);
    res.redirect('/manage');
});

io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
