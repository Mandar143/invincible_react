import BaseController from '../../shared/controller/BaseController';
import MerchantdetailsRepository from './merchant-details.repository';
import { queryParam } from '../../shared/models/queryParams';

const Joi = require('joi');
const merchantDetailsRepository = new MerchantdetailsRepository();

class MerchantdetailsController extends BaseController {

    // Get sub merchant details by merchant id
    async getSubMerchantDetails(reqBody, res) {

        try {
            let result = await merchantDetailsRepository.findOneByMerchantId(reqBody.merchant_id, null);
            if (Object.keys(result.merchant_list).length) {
                return this.sendResponse(res, true, 200, result, 'Sub-Merchant details.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get sub-merchant details.');
        };
    }

    // Get merchant locations by sub merchant id
    async getSubMerchantLocations(reqBody, res) {
        try {
            let result = await merchantDetailsRepository.findOneBySubMerchantId(reqBody.sub_merchant_id, null);
            if (Object.keys(result.merchant_location_list).length) {
                return this.sendResponse(res, true, 200, result, 'Sub-Merchant locations.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get sub-merchant locations.');
        };
    }
    async getLocations(req, res, next) {
        try {
            let { error, response } = await merchantDetailsRepository.findLocation(req.body.search_keyword, req.body.search_by);
            if (error) {
                return next(error);
            }

            return this.sendResponse(res, true, 200, response, 'Locations List.');
        } catch (err) {
            return next(err);
        };
    }

    async getSubMerchantPosLocations(req, res, next) {
        try {
            let { error, response } = await merchantDetailsRepository.findSubMPosLocation(req);
            if (error) {
                return next(error);
            }
            return this.sendResponse(res, true, 200, response, 'Locations List.');
        } catch (err) {
            return next(err);
        };
    }
}

export default MerchantdetailsController;