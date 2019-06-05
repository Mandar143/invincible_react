import * as express from 'express';
let router = express();
import MasterimportController from './master-import.controller';

// Import Sub Merchant Store Locations
router.get('/storeLocations', (req, res) => {
    MasterimportController.storeLocations(req, res);
});

//Import SKU master
router.get('/skuMaster', (req, res) => {
    MasterimportController.skuMaster(req, res);
});

//Import Sales master
router.get('/salesMaster', (req, res) => {
    MasterimportController.salesMaster(req, res);
});

//Import Sales Details master
router.get('/salesDetailsMaster', (req, res) => {
    MasterimportController.salesDetailsMaster(req, res);
});

//Validate vouchers
router.get('/validateVouchers', (req, res,next) => {
    MasterimportController.validateVouchers(req, res,next);
});


router.post('/upload', (req, res) => {
    MasterimportController.upload(req, res);
});

router.post('/getSampleFile', (req, res) => {
    MasterimportController.getSampleFile(req.body, res);
});

router.get('/calculateUserLoyalty', (req, res, next) => {
    MasterimportController.calculateUserLoyalty(req, res, next);
});

router.get('/checkURL', (req, res, next) => {
    MasterimportController.checkURL(req, res, next);
});
export default router;