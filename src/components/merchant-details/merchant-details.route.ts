import * as express from 'express';
import SchemaValidator from '../../shared/middlewares/SchemaValidator';
import MerchantdetailsController from './merchant-details.controller';
import { MerchantDetailsSchemas } from './merchant-details.schemas';
let router = express();

const validateRequest = SchemaValidator(true, MerchantDetailsSchemas);
const merchantDetailsCtrl = new MerchantdetailsController();

// Get sub merchant details by merchant id
router.post('/getSubMerchantDetails', validateRequest, (req, res) => {
    merchantDetailsCtrl.getSubMerchantDetails(req.body, res);
});

// Get merchant locations by sub merchant id
router.post('/getSubMerchantLocations', validateRequest, (req, res) => {
    merchantDetailsCtrl.getSubMerchantLocations(req.body, res);
});

// Get location list by location type
router.post('/getLocations', validateRequest, (req, res, next) => {
    merchantDetailsCtrl.getLocations(req, res, next);
});

// Location list for Sub-merchant and Booth(POS)
router.post('/getSubMerchantPosLocations', validateRequest, (req, res, next) => {
    merchantDetailsCtrl.getSubMerchantPosLocations(req, res, next);
});


export default router;