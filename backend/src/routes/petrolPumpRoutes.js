'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/customerLinkController');

// GET /api/v1/petrol-pumps/public
// Publicly accessible list of approved petrol pumps for registration dropdown
router.get('/public', ctrl.getPublicPetrolPumps);

module.exports = router;
