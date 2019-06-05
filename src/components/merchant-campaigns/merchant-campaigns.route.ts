import * as express from 'express';
import MerchantCampaignsController from './merchant-campaigns.controller';
import SchemaValidator from '../../shared/middlewares/SchemaValidator';
import { MerchantCampainsSchema } from './merchant-campaigns.schema';
const validateRequest = SchemaValidator(true, MerchantCampainsSchema)

let router = express();
const merchantCampaignsCtrl = new MerchantCampaignsController();

//campaign roi's
router.post('/campaign-roi', validateRequest, (req, res, next) => {
    merchantCampaignsCtrl.campaignReportROI(req, res, next);
});

//birthday campaign
router.get('/birthday-campaign', validateRequest, (req, res, next) => {
    merchantCampaignsCtrl.birthdayCampaign(req, res, next);
});

export default router;