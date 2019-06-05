import BaseController from '../../shared/controller/BaseController';
import MerchantCampaignsRepository from './merchant-campaigns.repository';

const merchantCampaignsRepository = new MerchantCampaignsRepository();

class MerchantCampaignsController extends BaseController {

    async campaignReportROI(req, res, next) {
        try {
            let result = await merchantCampaignsRepository.campaignReportROI(req);
            if (result) {
                return this.sendResponse(res, true, 200, result, 'Campaign ROI.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (error) {
            return next(error);
        }
    }

    async birthdayCampaign(req, res, next) {
        try {
            let result = await merchantCampaignsRepository.birthdayCampaign();
            if (result) {
                return this.sendResponse(res, true, 200, result, 'Birthday Campaign.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (error) {
            return next(error);
        }
    }

}

export default MerchantCampaignsController;