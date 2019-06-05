import * as Joi from 'joi';
import { numberOptions } from '../../shared/validators/joi-custom-schema';

const stateSchema = Joi.object().keys({
    state_name: Joi.string().min(3).required()
});

const citySchema = Joi.object().keys({
    state_name: Joi.string().required(),
    city_name: Joi.string().min(3).required()
});

const storeLocationsSchema = Joi.object().keys({
    state_name: Joi.string().required(),
    city_name: Joi.string().required()
});

const checkForPendingRequestSchema = Joi.object().keys({
    type: Joi.number().options(numberOptions).required().valid([1, 2]),
    customer_loyalty_id: Joi.number().options(numberOptions).required().positive()
});
/* const homeBranchChangeSchema = Joi.object().keys({
    customer_loyalty_id: Joi.number().required().positive(),
    existing_home_branch_id: Joi.number().required().positive(),
    new_home_branch_id: Joi.number().required().positive(),
    requested_from: Joi.number().required().positive(),
    created_by: Joi.number().required().positive(),
});

const mobileNumberChangeSchema = Joi.object().keys({
    sub_merchant_id: Joi.number().required().positive(),
    customer_loyalty_id: Joi.number().required(),
    existing_mobile_number: Joi.number().required(),
    new_mobile_number: Joi.number().required().positive(),
    requested_from: Joi.number().required().positive(),
    created_by: Joi.number().required().positive(),
});

const changeRequestStatusSchema = Joi.object().keys({
    id: Joi.number().required().positive(),
    customer_loyalty_id: Joi.number().required().positive(),
    change_for: Joi.number().required().positive(),
    status: Joi.number().required().positive(),
    changed_from: Joi.number().required().positive(),
    updated_by: Joi.number().required().positive(),
}); */

export const MerchantCustomersSchemas = {
    '/getState': stateSchema,
    '/getCity': citySchema,
    '/getStoreLocations': storeLocationsSchema,
    '/checkForPendingRequest': checkForPendingRequestSchema
}