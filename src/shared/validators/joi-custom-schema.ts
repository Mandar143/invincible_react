// import * as Joi from 'joi';
import * as BaseJoi from 'joi';
import { htmlStrip } from './htmlStrip.custom';
const Joi = BaseJoi.extend(htmlStrip);

export const stringInput = Joi.string().trim().htmlStrip();//.unescape();
export const numberInput = Joi.number().positive().integer();

export const numberOptions = {
    language: {
        number: {
            base: 'is required'
        },
        any: {
            allowOnly: 'invalid'
        }
    }
};

const stringRequirdMessage = 'is required';
export const stringOptions = {
    language: {
        string: {
            regex: {
                base: stringRequirdMessage
            },
            base: stringRequirdMessage
        }
    }
};

export const emailOptions = {
    language: {
        string: {
            stringRequirdMessage
        },
        // email: ''
    }
};

const mobileLegth = 'must be number and maximum 10 digits only.'
export const mobileNumber = stringInput // Joi.string().
    .regex(/^([4-9][0-9]{9})$/).
    options(
        {
            language: {
                any: {
                    empty: 'is required.'
                },
                string: {
                    regex: {
                        base: 'Invalid'
                    },
                    min: mobileLegth,
                    base: stringRequirdMessage
                }
            }
        }).label('mobile number');

export const inputDate = stringInput
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

export const inputDateHype = stringInput
    .regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
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
export const usernameOptions = {
    language: {
        string: {
            regex: {
                base: 'Invalid username'
            },
            base: stringRequirdMessage
        }
    }
};

export const passwordOptions = {
    language: {
        string: {
            regex: {
                base: 'Invalid password'
            },
            base: stringRequirdMessage
        }
    }
};

export const requestType = Joi.number().options(numberOptions).required().valid([1, 2, 3]);

export const tableDefaultParams = {
    pageNumber: numberInput.options(numberOptions),
    pageSize: numberInput.options(numberOptions),
    sortField: stringInput.allow(''),
    sortOrder: stringInput.lowercase()
}

export const dateFilter = {
    from_date: inputDateHype.trim(),
    to_date: inputDateHype.trim()
}
const pinCodeLegth = 'must be number and maximum 6 digits only.'
export const pinCode = stringInput // Joi.string().
    .regex(/^[1-9][0-9]{5}$/).
    options(
        {
            language: {
                any: {
                    empty: 'is required.'
                },
                string: {
                    regex: {
                        base: 'Invalid'
                    },
                    min: pinCodeLegth,
                    base: stringRequirdMessage
                }
            }
        }).label('pin code');
