import * as Joi from 'joi';
import { stringOptions, numberOptions, inputDate, mobileNumber, usernameOptions, passwordOptions, stringInput,pinCode } from '../../shared/validators/joi-custom-schema';

const number = Joi.number().integer().positive().required();

const stringNumber = stringInput.regex(/^\d+$/).required();

let pattern = /^(?=.*[a-z])(?=.*[A-Z-9])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,15}$/;
let usernameRegex = /^[a-zA-Z0-9]+$/;

const loginSchema = Joi.object().keys({
    username: stringInput.required().regex(usernameRegex).options(usernameOptions),
    password: stringInput.required().regex(pattern).options(passwordOptions)
});

const customerSchema = Joi.object().keys({
    email_address: stringInput.options(stringOptions).required().trim().email({ minDomainAtoms: 2 }).label('Email address'),
    first_name: stringInput.options(stringOptions).trim().required().label('First Name'),
    mobile_number: mobileNumber.required().min(10).label('Mobile Number'),
    last_name: stringInput.options(stringOptions).required().trim().label('Last Name'),
    gender: Joi.number().options(numberOptions).required(),
    marital_status: Joi.number().options(numberOptions).label('Marital status'),
    date_of_birth: inputDate.required().label('Date of birth'),
    pin_code: pinCode.required().trim().min(6).label('Pin Code'),
    anniversary_date: inputDate.optional().allow(null).trim().label('Anniversary date'),
    spouse_dob: inputDate.optional().trim().allow(null).label('Spouse dob'),
    request_source: Joi.number().optional().allow(null),
    otp: Joi.number().optional(),
    city_id: Joi.number().required().label('City')
});

const otp = Joi.number();

const requestOtpSchema = Joi.object().keys({
    mobile_number: mobileNumber.required(),
    otp: otp.allow(null),
    type: stringInput.allow(null).valid([202,203]).options({
        language:{
            any:{
                allowOnly: 'Invalid'
            }
        }
    })
});

const verifyOtpSchema = Joi.object().keys({
    mobile_number: mobileNumber.required(),
    otp: otp.required()
});

export const AuthSchemas = {
    '/login': loginSchema,
    '/register': customerSchema,
    '/requestOtp': requestOtpSchema,
    '/reSendOtp': requestOtpSchema,
    '/getOtp': requestOtpSchema,
    '/verifyOtp': verifyOtpSchema,
}