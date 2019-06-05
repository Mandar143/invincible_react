import * as Joi from 'joi';
import { stringInput } from '../../shared/validators/joi-custom-schema';

const changeRequestStatusSchema = Joi.object().keys({
    id: Joi.number().required().positive(),
    customer_loyalty_id: Joi.number().required().positive(),
    change_for: Joi.number().required().positive(),
    status: Joi.number().required().positive(),
    changed_from: Joi.number().required().positive(),
    updated_by: Joi.number().required().positive(),
});

const verifyEmailSchema = Joi.object().keys({
    email_verify_key: stringInput.required()
});


const statisPageSchema = Joi.object().keys({
    page_name: stringInput.required()
});

const optOutSchema = Joi.object().keys({
    mobile_number: stringInput,
    email_address: stringInput,
});

const optInSchema = Joi.object().keys({
    mobile_number: stringInput,
    email_address: stringInput,
});

export const AuthSchemas = {
    '/verifyEmailAddress': verifyEmailSchema,
    '/changeRequestStatus': changeRequestStatusSchema,
    '/getStaticPages': statisPageSchema,
    '/optOut': optOutSchema,
    '/optIn': optInSchema
}