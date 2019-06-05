import BaseController from "../../shared/controller/BaseController";
import MasterimportRepository from './master-import.repository';
import constants from "../../config/constants";
const csv = require('csvtojson')
const fs = require('fs')
const masterimportRepository = new MasterimportRepository();
const path = require("path");
const multer = require("multer");
const getFileUploadPath = [
    { id: 1, 'path': './assets/master_data/sales_master' },
    { id: 2, 'path': './assets/master_data/sales_master' },
    { id: 3, 'path': './assets/master_data/sku_master' },
    { id: 4, 'path': './assets/master_data/store_locations' },
]
var storage = multer.diskStorage({
    destination: async function (req, file, callback) {
        if (!req.body.fileType) {
            return callback("File type required.", false);
        }
        const fileType = req.body.fileType;
        const pathObject = await getFileUploadPath.find(item => item.id == fileType);
        callback(null, pathObject.path);
    },
    filename: function (req, file, callback) {
        let ext = path.extname(file.originalname);
        let fileNameArray = file.originalname.split(ext);
        let fileName = fileNameArray[0];

        callback(null, fileName + path.extname(file.originalname));
    }
});

// Using callback


class MasterimportController extends BaseController {
    // To import store locations
    async storeLocations(req, res) {
        /* var filePath = '/var/www/html/crocs_loyalty/backend/assets/master_data/store_locations/store_locations.csv';

        if (!fs.existsSync(filePath)) {
            return this.sendResponse(res, false, 404, {}, 'File not found.');
        }

        csv()
            .fromFile(filePath)
            .then((jsonObj) => {
                try {
                    masterimportRepository.storeLocations(jsonObj, (result: any) => {
                        let status = result ? true : false;
                        return this.sendResponse(res, true, 200, result, 'Store locations import successful.');
                    });
                } catch (err) {
                    return this.sendResponse(res, false, 400, {}, 'Failed to import store locations.');
                };
            }) */

        try {
            /* let result: any = await masterimportRepository.storeLocations(req);
            console.log("Check1: ", result);
            let status = result ? true : false;

            if (status) {
                return this.sendResponse(res, true, 200, result, 'Store locations import successful.');
            } else {
                return this.sendResponse(res, false, 402, {}, 'Failed to import store locations.');
            } */

            masterimportRepository.storeLocations(req, (result: any) => {
                let status = result ? true : false;
                if (status) {
                    return this.sendResponse(res, true, 200, result, 'Store locations import successful.');
                } else {
                    return this.sendResponse(res, false, 402, {}, 'Failed to import store locations.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 400, {}, 'Failed to import store locations.');
        };
    }

    //to import sku master data (products)
    skuMaster(req, res) {       
        try {
            masterimportRepository.skuMaster(req, (result: any) => {
                let status = result.error ? false : true;
                if (status) {
                    return this.sendResponse(res, true, 200, result, 'Products master import.');
                } else {
                    return this.sendResponse(res, false, 402, result, 'Failed to import SKU.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 400, {}, 'Failed to import SKU.');
        };
    }
    //to import sales data
    salesMaster(req, res) {
        try {
            masterimportRepository.salesMaster(req, (result: any) => {
                let status = result ? true : false;
                if (status) {
                    return this.sendResponse(res, true, 200, result, 'Sales import successful.');
                } else {
                    return this.sendResponse(res, false, 402, {}, 'Failed to import sales invoice.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 400, {}, 'Failed to import sales invoice.');
        };
    }
    //to import sales details data
    salesDetailsMaster(req, res) {
        try {
            masterimportRepository.salesDetailsMaster(req, (result: any) => {
                let status = result ? true : false;
                if (status) {
                    return this.sendResponse(res, true, 200, result, 'Sales item import successful.');
                } else {
                    return this.sendResponse(res, false, 402, {}, 'Failed to import sales item.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 400, {}, 'Failed to import sales item.');
        };
    }
    //validate vouchers
    async validateVouchers(req, res, next) {
        try {
            const { error, response } = await masterimportRepository.validateVouchers();
            if (error) {
                return next(error);
            }
            return this.sendResponse(res, true, 200, [], 'Sales item import successful.');
        } catch (err) {
            return next(err);
        }
    }

    // 
    async calculateUserLoyalty(req, res, next) {
        try {
            const { error, response } = await masterimportRepository.calculateUserLoyalty();
            if (error) {
                return next(error);
            }                       
            var customerDetails = response.data;            
            //TO DO for loop
            for (let customer of customerDetails) {
                if (customer.message_type == 0) {
                    const customerData = { "toEmail": customer.email_address, "mobile_number": customer.mobile_number, "voucherCode": customer.coupon_code, "voucherValue": customer.voucher_value, "voucherValidity": this.getCriteriaDate(new Date(customer.coupon_validity)), "customerName": customer.first_name };
                    // send sms
                    if (customer.mobile_number != '' && customer.mobile_verified == 1 && customer.opt_out_from_sms_status == 0) {
                        await this.sendSMS('MILESTONE_' + customer.milestoneNo, customerData);
                    }

                    //send email
                    if (customer.email_address != '' && customer.email_verified == 1 && customer.opt_out_from_email_status == 0) {
                        await this.sendEmail('MILESTONE_REACHED', customerData);
                    }
                } else {
                    // send sms
                    if (customer.mobile_number != '' && customer.mobile_verified == 1 && customer.opt_out_from_sms_status == 0) {
                        const smsData = { "sms_type": 1, "mobile_number": customer.mobile_number, "totalPurchase": customer.total_purchase, 'updateDate': this.getCriteriaDate(new Date(customer.update_date)) };
                        await this.sendSMS('WELCOME_NON_LOYALTY_USER', smsData);
                    }
                }
            }
            return this.sendResponse(res, true, 200, [], 'User loyalty calculations done successful.');
        } catch (err) {
            return next(err);
        }
    }
    upload(req, res) {

        const created_by = 1;//req.decoded.user_id || 1;
        let defaultMessage = "File uploaded sucessfully!";
        let response = { status: 102, message: defaultMessage, data: { message: 'test' } };
        const allowMimeTypes = this.allowMimeTypes();

        // req['masterUploadPath'] = this.getFileUploadPath(req.body.fileType);
        var upload = multer({
            storage: storage,
            fileFilter: function (req, file, callback) {
                if (!file["mimetype"] || allowMimeTypes.indexOf(file.mimetype) == -1) {
                    return callback("Invalid file mimetype.", false);
                }
                callback(null, true);
            }
        }).single("file");

        upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    console.log("Multer error", err);
                } else if (err) {
                    console.log("Unknown error", err);
                }
                let defaultError = "File upload failed!";
                if (typeof err == "string") {
                    defaultError = err;
                }
                return res.status(412).json({ message: defaultError });
            }
            let fileInfo = {};

            if (!req.file) {
                return res.status(412).json({ message: 'File required.' })
            }

            if (req["file"]) {
                fileInfo = {
                    file_type: +req.body.fileType,
                    mime_type: req.file.mimetype,
                    destination: req.file.destination,
                    file_name: req.file.filename,
                    path: req.file.path,
                    size: req.file.size,
                    created_by
                };

                try {
                    const insertLog = await masterimportRepository.insertMasterLog(fileInfo);
                    if ('affectedRows' in insertLog && insertLog['affectedRows'] === 1) {
                        response["status"] = 200;
                    } else {
                        response["message"] = `${defaultMessage} But File information not save.`;
                    }
                } catch (err) {
                    // console.log(err);
                    response["message"] = `${defaultMessage} But File information not save. ${err.message}`;
                }

            }

            res.status(200).json(response);
        });
    }

    allowMimeTypes() {
        return [
            "text/csv"
        ];
    }

    getSampleFile(req, res) {
        //console.log(__dirname);
        try {
            let absPath = __dirname + "/../../../assets/master_data/sample_master_data/store_locations.csv";
            //var filePath = "/var/www/html/crocs_loyalty/backend/assets/master_data/sample_master_data/"; // Or format the path using the `id` rest param
            var fileName = "store_locations.csv"; // The default name the browser will use

            res.download(absPath, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        } catch (err) {
            console.log("Catch Error: ", err);
        }
    }

    async checkURL(req, res, next) {
        try {
            let updateLink = await this.shortURL(constants.webURL);
            console.log(this.getCriteriaDate("2019-04-22"));

            console.log(updateLink);
        } catch (err) {
            next(err);
        }
    }
}

export default new MasterimportController();