const express = require('express');
const router = express.Router();
const { getSchemaInfo } = require('../controllers/schemaController');

// GET /api/schema/relationships - live schema info & relationship concepts
router.get('/relationships', getSchemaInfo);

module.exports = router;
