import * as Joi from 'joi';
import { stringInput, dateFilter, tableDefaultParams } from '../../shared/validators/joi-custom-schema';


/* const schema = Joi.object().keys({
    mobile_number: stringInput.regex(/^([7-9][0-9]{9})$/).error(new Error('Mobile number must be number and maximim 10 digits only')),
    otp: Joi.number().allow(null)
});
 */

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
            base: 'is required.',
            regex: {
                base: "invalid input."
            }
        },
        any: {
            allowOnly: 'request invalid.',
            // empty: 'is required'
        }
    }
};
const mobileNumber = Joi.
    string().
    regex(/^([4-9][0-9]{9})$/).
    options(
        {
            language: {
                string: {
                    base: 'is required',
                    regex: {
                        base: 'Mobile number must be number and maximum 10 digits only.'
                    }
                }
            }
        }).label('mobile number');

const inputDate = Joi
    .string()
    .regex(/([12]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01]))/)
    .options({
        language: {
            string: {
                base: 'is required',
                regex: {
                    base: "invalid date formate."
                }
            }
        }
    });

const otp = Joi.number();
const requestType = Joi.number().options(numberOptions).required().valid([1, 2]);
const requestOtpSchema = Joi.object().keys({
    mobile_number: mobileNumber.required(),
    otp: otp.allow(null)
});

const verifyOtpSchema = Joi.object().keys({
    mobile_number: mobileNumber.required(),
    otp: otp.required()
});

const customerSchema = Joi.object().keys({
    email_address: stringInput.options(stringOptions).required().email({ minDomainAtoms: 2 }).label('eamil'),
    first_name: stringInput.options(stringOptions).trim().required().label('first name'),
    mobile_number: Joi.number().required().label('mobile'),
    last_name: stringInput.options(stringOptions).required().trim().label('last name'),
    gender: Joi.number().options(numberOptions).required(),
    marital_status: Joi.number().options(numberOptions).required().label('marital status'),
    date_of_birth: inputDate.required().label('date of birth'),
    anniversary_date: inputDate.optional().allow(null).trim().label('anniversary date'),
    spouse_dob: inputDate.optional().trim().allow(null).label('spouse dob'),
    request_source: Joi.number().optional().allow(null)
});

const checkMoobileSchema = Joi.object().keys({
    mobile_number: mobileNumber.required()
});

const searchCustomerSchema = Joi.object().keys({
    request_type: requestType,
    search_by_type: stringInput.options(stringOptions).required().trim().valid(['mobile_number', 'customer_name']).label('search by'),
    search_by_value: mobileNumber.required().trim().label('search by'),
    search_by_name: Joi.alternatives().when('search_by_type', {
        is: 'customer_name',
        then: stringInput.options(stringOptions).required().trim().label('search by name'),
        otherwise: Joi.optional().allow(null).label('search by name')
    }).label('search by name'),
    search_label: Joi.optional().allow('').allow(null),
});

const customerFeedbackSchema = Joi.object().keys({
    subject: stringInput.options(stringOptions).required().label('Subject'),
    message: stringInput.options(stringOptions).required().label('Message')
})

const getRegisteredCustomersSchema = Joi.object().keys({
    filter: Joi.object().keys({
        customer_name: stringInput,
        mobile_number: mobileNumber,
        ...dateFilter
    }),
    ...tableDefaultParams
});

const getSearchByLocationsSchema = Joi.object().keys({
    search_by: Joi.number().positive().required(),
    search_keyword: Joi.string().allow(null).trim()
});

export const CustomerSchemas = {
    '': customerSchema,
    '/requestOtp': requestOtpSchema,
    '/reSendOtp': requestOtpSchema,
    '/getOtp': requestOtpSchema,
    '/verifyOtp': verifyOtpSchema,
    '/check-mobile': checkMoobileSchema,
    '/search-customer': searchCustomerSchema,
    '/customer-feedback': customerFeedbackSchema,
    '/get-registered-customers': getRegisteredCustomersSchema,
    '/getManageCustomersList': getRegisteredCustomersSchema,
    '/getSearchByLocations': getSearchByLocationsSchema
}