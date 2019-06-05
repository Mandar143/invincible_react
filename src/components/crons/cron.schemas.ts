import { stringOptions, numberOptions, mobileNumber, inputDate, stringInput } from "../../shared/validators/joi-custom-schema";

const Joi = require('joi');
const customDateFormat = stringInput.regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/).options({
    language: {
        string: {
            base: 'is required',
            regex: {
                base: "invalid date formate."
            }
        }
    }
});
const stringRequirdMessage = 'is required';
const mobileLegth = 'must be number and maximum 10 digits only.'
const customMobileNumber = stringInput.
    options(
        {
            language: {
                any: {
                    empty: 'is required.'
                },
                string: {
                    regex: {
                        base: 'Invalid.'
                    },
                    min: mobileLegth,
                    base: stringRequirdMessage
                }
            }
        }).label('mobile number');

const numberAllowOptional = Joi.number().optional().allow('');
const numberAllowEmpty = Joi.number().optional().allow('');
export const salePaymentSchema = Joi.object().keys({
    StoreCode: stringInput.options(stringOptions).required().trim(),
    ShrmDesc: stringInput.options(stringOptions).required().trim(),
    CreateDate: stringInput, //customDateFormat.required(),
    Time: Joi.number().options(numberOptions),
    CustomerNumber: stringInput.options(stringOptions).required().trim(),
    MobileNo: mobileNumber.required(),
    InvoiceNumber: Joi.number().options(numberOptions).required(),
    GrossAmt: Joi.number().options(numberOptions).required(),
    NetAmount: Joi.number().options(numberOptions).required(),
    Cash: numberAllowEmpty,
    Card: numberAllowEmpty,
    Cheque: numberAllowEmpty,
    GV: numberAllowOptional,
    CreditNote: numberAllowOptional,
    ExcessGV: numberAllowOptional,
    RoundOff: numberAllowOptional,
    NoRefound: numberAllowOptional,
    OtherPayments: numberAllowOptional,
    LegacyGiftVoucher: numberAllowOptional,
    LegacyAdvOrder: numberAllowOptional,
    AgentAccount: numberAllowOptional,
    MallGiftVoucher: numberAllowOptional,
    LineDisc: numberAllowOptional,
    HeaderDisc: numberAllowOptional
});

/* .when('MobileNo', {
    is: '' || null,
    then: Joi.optional(),
    otherwise: mobileNumber.required().regex(/^([4-9][0-9]{9})$/),
}) */
export const trancationSchema = Joi.object().keys({
    StoreCode: stringInput.options(stringOptions).required().trim(),
    Loc1: Joi.number().options(numberOptions).required(),
    ShrmDesc: stringInput.options(stringOptions).trim(),
    InvoiceDate: stringInput.options(stringOptions).required().trim(),
    SaleType: stringInput.options(stringOptions).required().trim(),
    InvoiceNumber: Joi.number().options(numberOptions).required(),
    RefInvoiceNumber: Joi.number().options(numberOptions),
    MobileNo: customMobileNumber.allow('').allow(null).regex(/^([4-9][0-9]{9})$/).options(
        {
            language: {
                any: {
                    empty: 'is required.'
                },
                string: {
                    regex: {
                        base: 'Invalid mobile number'
                    },
                    min: mobileLegth,
                    base: stringRequirdMessage
                }
            }
        }
    ),
    Product: stringInput.options(stringOptions).required().trim(),
    Mrp: Joi.number().options(numberOptions).required(),
    SalesQty: Joi.number().options(numberOptions).required(),
    SalesValue: Joi.number().options(numberOptions).required(),
    Discount: Joi.number().options(numberOptions),
    SalesMgr: stringInput.options(stringOptions).trim(),
    State: stringInput.options(stringOptions).required().trim(),
    RegMgr: stringInput.options(stringOptions).trim(),
});

export const voucherSchema = Joi.object().keys({
    Voucher_Code: stringInput.options(stringOptions).required().trim(),
    Redeem_Invoice_Number: Joi.number().options(numberOptions).required(),
    Redeem_Store: stringInput.options(stringOptions).required().trim(),
    Redeem_Date: stringInput.options(stringOptions).required().trim(),
    Redeem_Amount: Joi.number().options(numberOptions).required()
});

export const cronSchemas = {
    '/payment/': salePaymentSchema,
    '/transaction/': trancationSchema,
    '/voucher/': voucherSchema,
}

