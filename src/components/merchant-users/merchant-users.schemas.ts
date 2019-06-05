import * as Joi from 'joi';
import { dateFilter, tableDefaultParams, stringInput, mobileNumber } from '../../shared/validators/joi-custom-schema';
const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,15}$/;
const stringOptions = {
    language: {
        string: {
            base: 'is required.'
        }
    }
};

const numberOptions = {
    language: {
        number: {
            base: 'is required.'
        }
    }
};

const checkUsername = Joi.object().keys({
    username: stringInput.options(stringOptions).required().label('Username')
});

const addUser = Joi.object().keys({
    first_name: stringInput.options(stringOptions).required().label('First Name'),
    last_name: stringInput.options(stringOptions).required().label('Last Name'),
    merchant_id: Joi.number().positive().allow(null),
    sub_merchant_id: Joi.number().positive().allow(null),
    sub_merchant_location_id: Joi.number().positive().allow(null),
    username: stringInput.min(5).max(15).required().label('Username'),
    password: stringInput.regex(pattern).required().label('Password'),
    confirm_password: stringInput.regex(pattern).required().valid(Joi.ref('password')),
    email: stringInput.email({ minDomainAtoms: 2 }),
    contact: stringInput.options(stringOptions).min(8).max(20).required().label('Contact number'),
    // first_name: stringInput.required(),
    // last_name: stringInput.required(),
    gender: Joi.number().options(numberOptions).required().positive().label('Gender'),
    user_type_id: Joi.number().required().positive(),
    created_by: Joi.number().positive(),
});

const updateUser = Joi.object().keys({
    id: Joi.number().required().positive(),
    merchant_id: Joi.number().positive().allow(null),
    sub_merchant_id: Joi.number().positive().allow(null),
    sub_merchant_location_id: Joi.number().positive().allow(null),
    username: stringInput.min(5).max(15).required(),
    password: stringInput.regex(pattern).allow(""),
    confirm_password: stringInput.regex(pattern).valid(Joi.ref('password')),
    email: stringInput.email({ minDomainAtoms: 2 }),
    contact: stringInput.min(8).max(20).required(),
    first_name: stringInput.required(),
    last_name: stringInput.required(),
    gender: Joi.number().required().positive(),
    user_type_id: Joi.number().required().positive(),
    // updated_by: Joi.number().required().positive(),
});

const deleteUser = Joi.object().keys({
    id: Joi.number().required().positive()
});
const transactionsReport = Joi.object().keys({
    filter: Joi.object().keys({
        order_number: stringInput,
        customer_name: stringInput,
        ...dateFilter
    }),
    ...tableDefaultParams
});

const voucherReports = Joi.object().keys({
    filter: Joi.object().keys({
        order_number: stringInput,
        customer_name: stringInput,
        mobile_number: mobileNumber,
        voucher_name: stringInput,
        voucher_code: stringInput,
        ...dateFilter
    }),
    ...tableDefaultParams
});

const listSchema = Joi.object().keys({
    filter: Joi.object().keys({
        first_name: stringInput,
        last_name: stringInput,
        username: stringInput,
        contact: stringInput,
        location_name: stringInput,
        ...dateFilter
    }),
    ...tableDefaultParams
});

export const MerchantUsersSchemas = {
    '/checkUsername': checkUsername,
    '/addUser': addUser,
    '/updateUser': updateUser,
    '/deleteUser': deleteUser,
    '/getLoginLogs': deleteUser,
    '/get-transactions-report': transactionsReport,
    '/voucherReports': voucherReports,
    '/list': listSchema
}