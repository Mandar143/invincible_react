import * as Joi from 'joi';
import { stringInput } from '../../shared/validators/joi-custom-schema';
const numberOptions = {
    language: {
        number: {
            base: 'is required.'
        }
    }
};

const stringOptions = {
    language: {
        string: {
            base: 'is required.'
        }
    }
};
const searchLocationBy = Joi.object().keys({
    search_by: Joi.number().options(numberOptions).required().label('Search by').allow(null),
    search_keyword: stringInput.options(stringOptions).required().trim().label('Search keyword').allow(null)
});

const getSubMerchantLocationsSchema = Joi.object().keys({
    sub_merchant_id: Joi.number().required().positive()
});

const getSubMerchantDetailsSchema = Joi.object().keys({
    merchant_id: Joi.number().required().positive()
});

const getSubMerchantPosLocations = Joi.object().keys({
    sub_merchant_id: Joi.number().required().positive(),
    search_keyword: Joi.string()
});

export const MerchantDetailsSchemas = {
    '/getSubMerchantLocations': getSubMerchantLocationsSchema,
    '/getSubMerchantDetails': getSubMerchantDetailsSchema,
    '/getSubMerchantPosLocations': getSubMerchantPosLocations
}