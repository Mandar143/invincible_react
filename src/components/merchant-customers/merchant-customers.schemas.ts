import * as Joi from 'joi';
import { inputDate, mobileNumber, numberOptions, stringOptions, requestType, inputDateHype, tableDefaultParams, dateFilter, stringInput, pinCode } from '../../shared/validators/joi-custom-schema';

const globalOptional = Joi.allow(null).optional();
// const stringInput = Joi.string().trim();
const dateInput = inputDateHype.trim();
const numberInput = Joi.number();
const emailAddress = stringInput.trim().lowercase().email({ minDomainAtoms: 2 });

const customerLoyaltyId = Joi.number().options(numberOptions).required().positive().label('Customer loyalty');
const customerSchema = Joi.object().keys({
    email_address: stringInput.lowercase().email({ minDomainAtoms: 2 }).allow('').allow(null).optional().label('Email address'),//Joi.alternatives().try(optional, emailAddress).label('Email address'),
    first_name: stringInput.regex(/^[a-zA-Z ]+$/).options(stringOptions).required().label('First Name'),
    last_name: stringInput.regex(/^[a-zA-Z ]+$/).allow('').allow(null).optional().label('Last name'),//Joi.alternatives().try(optional, stringOptional).label('Mobile number'),// Joi.string().optional().options(stringOptions).trim().label('Last Name'),
    mobile_number: mobileNumber.required().label('Mobile Number'),
    gender: Joi.number().options(numberOptions).required(),
    marital_status: numberInput.allow(null).optional().label('Marital status'),
    date_of_birth: inputDate.allow('').allow(null).optional().label('Date of birth'),
    anniversary_date: inputDate.allow('').allow(null).optional().label('Anniversary date'),
    spouse_dob: inputDate.allow('').allow(null).optional().label('Spouse dob'),
    request_source: Joi.number().optional().allow(null),
    otp: numberInput.allow(null).optional(),
    pin_code: pinCode.trim().min(6).label('Pin Code'),
    city_id: Joi.number().required().label('City')
});

const checkFRequestSchema = Joi.object().keys({
    request_type: requestType,
    customer_loyalty_id: customerLoyaltyId
});

const changeRequestFromCustomerSchema = Joi.object().keys({
    request_type: requestType.label('request type'),
    customer_loyalty_id: customerLoyaltyId,
    existing_mobile_number: mobileNumber.when(
        "request_type", {
            is: 2,
            then: mobileNumber.required().label('Existing mobile number'),
            otherwise: Joi.optional()
        }
    ),
    new_mobile_number: mobileNumber.when(
        "request_type", {
            is: 2,
            then: mobileNumber.required().label('New mobile number'),
            otherwise: Joi.optional().label('New mobile number')
        }
    ),
    existing_home_branch_id: Joi.number().when(
        "request_type", {
            is: 3,
            then: Joi.number().options(numberOptions).positive().label('Existing home branch').required(),
            otherwise: Joi.optional().label('Existing home branch')
        }
    ),
    new_home_branch_id: Joi.number().when(
        "request_type", {
            is: 3,
            then: Joi.number().options(numberOptions).positive().label('New home branch').required(),
            otherwise: Joi.optional().label('New home branch')
        }
    ),
});

const allowRequest = Joi.number().options(numberOptions).required().valid([2, 3]);

const cancelRequestSchema = Joi.object().keys({
    request_type: allowRequest.label('request type'),
    id: Joi.number().required().positive().label('request id'),
    customer_loyalty_id: Joi.number().positive(),
    status: allowRequest.label('status')
});

const mobileChangeLogSchemas = Joi.object().keys({
    filter: Joi.object().keys({
        existing_mobile_number: stringInput,
        customer_name: stringInput,
        ...dateFilter
    }),
    ...tableDefaultParams
});

const homeBranchRequestSchemas = Joi.object().keys({
    filter: Joi.object().keys({
        mobile_number: mobileNumber,
        existing_home_branch: stringInput,
        customer_name: stringInput,
        ...dateFilter
    }),
    ...tableDefaultParams
});

const searchCustomerTableSchema = {
    filter: Joi.object().keys({
        customer_loyalty_id: numberInput,
        mobile_number: stringInput,
        order_status: numberInput,
    }),
    ...tableDefaultParams
}

const getVouchersCouponsSchemas = Joi.object().keys(searchCustomerTableSchema);

export const MerchantCustomersSchemas = {
    '/add-customer': customerSchema,
    '/check-for-pending-request': checkFRequestSchema,
    '/change-request-from-customer': changeRequestFromCustomerSchema,
    '/changeRequestStatus': cancelRequestSchema,
    '/getMobileNumberChangeLog': mobileChangeLogSchemas,
    '/getHomeBranchChangeRequests': homeBranchRequestSchemas,
    '/get-vouchers-coupons': getVouchersCouponsSchemas,
    '/get-offer-coupons': getVouchersCouponsSchemas,
    '/getTransactions': getVouchersCouponsSchemas
}