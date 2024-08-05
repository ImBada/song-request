const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Song, sequelize } = require('./models/Song');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const ADMIN_PASSWORD = 'slide';

const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

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

// 관리 페이지 접근
app.get('/manage', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/manage/list');
    } else {
        res.render('manage_login');
    }
});

app.post('/manage', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isAuthenticated = true;
        res.redirect('/manage/list');
    } else {
        res.render('manage_login', { error: 'Invalid password' });
    }
});

// 관리 페이지 (로그인 후)
app.get('/manage/list', async (req, res) => {
    if (!req.session.isAuthenticated) {
        res.redirect('/manage');
    } else {
        const songs = await Song.findAll();
        res.render('manage', { songs });
    }
});

// 초기화 라우트
app.post('/manage/reset', async (req, res) => {
    if (!req.session.isAuthenticated) {
        res.redirect('/manage');
    } else {
        await Song.destroy({ where: {}, truncate: true });
        io.emit('reset');
        res.redirect('/manage/list');
    }
});

// 백업 라우트
app.get('/manage/backup', (req, res) => {
    if (!req.session.isAuthenticated) {
        res.redirect('/manage');
    } else {
        const file = path.join(__dirname, 'database.sqlite');
        res.download(file);
    }
});

// 복원 라우트
app.post('/manage/restore', upload.single('backup'), async (req, res) => {
    if (!req.session.isAuthenticated) {
        res.redirect('/manage');
    } else {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const tempPath = req.file.path;
        const targetPath = path.join(__dirname, 'database.sqlite');

        await Song.destroy({ where: {}, truncate: true });

        fs.copyFile(tempPath, targetPath, (err) => {
            if (err) {
                console.error(err);
                res.redirect('/manage/list');
            } else {
                fs.unlink(tempPath, () => {
                    io.emit('reset');
                    res.redirect('/manage/list');
                });
            }
        });
    }
});

app.post('/manage/complete/:id', async (req, res) => {
    await Song.update({ completed: true }, { where: { id: req.params.id } });
    io.emit('songComplete', req.params.id);
    res.redirect('/manage/list');
});

app.post('/manage/uncomplete/:id', async (req, res) => {
    await Song.update({ completed: false }, { where: { id: req.params.id } });
    io.emit('songUncomplete', req.params.id);
    res.redirect('/manage/list');
});

app.post('/manage/archive/:id', async (req, res) => {
    await Song.update({ archived: true }, { where: { id: req.params.id } });
    io.emit('songArchive', req.params.id);
    res.redirect('/manage/list');
});

app.post('/manage/unarchive/:id', async (req, res) => {
    await Song.update({ archived: false }, { where: { id: req.params.id } });
    io.emit('songUnarchive', req.params.id);
    res.redirect('/manage/list');
});

io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
