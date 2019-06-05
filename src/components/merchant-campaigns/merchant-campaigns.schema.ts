import * as Joi from 'joi';
import { dateFilter, tableDefaultParams } from '../../shared/validators/joi-custom-schema';

const campaignRoiSchema = Joi.object().keys({
    filter: Joi.object().keys({
        ...dateFilter
    }),
    ...tableDefaultParams
});


export const MerchantCampainsSchema = {
    '/campaign-roi': campaignRoiSchema
}