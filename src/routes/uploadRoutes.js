const express = require('express');
const router = express.Router();
const { uploadFile } = require('../controllers/uploadController');
const { optionalToken } = require('../middleware/auth');

router.post('/upload', optionalToken, uploadFile);

module.exports = router;

