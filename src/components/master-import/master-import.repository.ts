import * as csv from 'csvtojson';
import * as fs from 'fs';
import * as NodeGeocoder from 'node-geocoder';
import pool from '../../database/database-connection';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';
// const csv = require('csvtojson');
const fileTypeSalesInvoice = 1;
const fileTypeSalesItems = 2;
const fileTypeVouchers = 3;
const fileTypeSku = 4;
const fileTypeStoreLocations = 5;
var options = {
    provider: 'google',
    // Optional depending on the providers
    httpAdapter: 'https',
    apiKey: 'AIzaSyDIe6CBuymf60DqeaqW54Ti4mNDPEiIq_U',
    formatter: null
};

var geocoder = NodeGeocoder(options);
export default class MasterimportRepository {
    // Store locations
    async storeLocations(req: any, callback: any) {
        let locationData = [];
        let subMerchantId = 1; //req.decoded.sub_merchant_id;
        let filePath = await this.getFilePath(fileTypeStoreLocations);
        await csv()
            .fromFile(filePath)
            .then((data) => {
                data.forEach(async (element) => {
                    let latLongs = await this.findLatLong(element.Address1);
                    element.Open_Date = (element.Open_Date == '') ? null : element.Open_Date;
                    locationData.push([subMerchantId, element.Store, element.Store_Name, element.Address1, element.Type, element.Manager_Name, element.Tel, element.Mobile, element.Email, element.Open_Date, element.City, element.State, latLongs.latitude, latLongs.longitude, 1]);
                });

                let sql = "INSERT INTO sub_merchant_locations (sub_merchant_id, store_code, location_name, address_line1, store_location_type, contact_name, contact_telephone, contact_mobile, contact_email, opening_date, city_name, state_name,latitude,longitude, created_by) VALUES ? ";
                // sql += "ON DUPLICATE KEY UPDATE location_name = VALUES(location_name), address_line1 = VALUES(address_line1), store_location_type = VALUES(store_location_type), contact_name = VALUES(contact_name), contact_telephone = VALUES(contact_telephone), contact_mobile = VALUES(contact_mobile), contact_email = VALUES(contact_email), opening_date = VALUES(opening_date), city_name = VALUES(city_name), state_name = VALUES(state_name),latitude = VALUES(latitude),longitude = VALUES(longitude), updated_by = 1";
                setTimeout(function () {
                    pool.query(sql, [locationData])
                        .then(
                            (result: any) => { console.log(result); callback({ result }) }
                        )
                        .catch(
                            (error) => callback(false)
                        );
                }, 2000);

            });
    }

    // sku master
    async skuMaster(data: any, callback: any) {

        let skuData = [];
        let filePath = await this.getFilePath(fileTypeSku);
        await csv()
            .fromFile(filePath)
            .then((data) => {
                data.forEach(function (element) {
                    skuData.push([1, element.Sku_Code, element.Item, element.Procurement_Group, element.Product_Group, element.Heel_Type, element.Item_Name, element.Dns, 1, element.Color_Code, element.Color_Code, element.Color_Name, element.Size, element.Sales_Price, 1]);
                });

                var sql = "INSERT INTO product_master(merchant_id, sku, old_material_number, procurement_group, gender,heel_type, material_description, ext_material_group, brand_id, color_code, color_number, color_name, size, condition_amount, created_by) VALUES ?";
                sql += "ON DUPLICATE KEY UPDATE old_material_number = VALUES(old_material_number), procurement_group = VALUES(procurement_group), gender = VALUES(gender), heel_type = VALUES(heel_type), material_description = VALUES(material_description), ext_material_group = VALUES(ext_material_group), brand_id = VALUES(brand_id), color_code = VALUES(color_code), color_number = VALUES(color_number), color_name = VALUES(color_name), size = VALUES(size), condition_amount  = VALUES(condition_amount), updated_by = 1, updated_at = CURRENT_TIMESTAMP";
                pool.query(sql, [skuData])
                    .then(
                        (result: any) => callback({ result })
                    )
                    .catch(
                        (error: any) => callback({ error })
                        // (error) => callback(false)
                    );
            });
    }

    // sales master
    async salesMaster(data: any, callback: any) {
        let salesData = [];
        let filePath = await this.getFilePath(fileTypeSalesInvoice);

        await csv()
            .fromFile(filePath)
            .then((data) => {
                data.forEach(function (element) {
                    if (element.CreateDate != '' && element.InvoiceNumber != '' && element.StoreCode != '') {
                        const createDate = (element.CreateDate != '') ? (element.CreateDate.split(' '))[0] : null;
                        salesData.push([1, 1, createDate, element.InvoiceNumber, (parseInt(element.Cash) + parseInt(element.Card) + parseInt(element.Cheque)), (parseInt(element.Cash) + parseInt(element.Card) + parseInt(element.Cheque)), (parseInt(element.LineDisc) + parseInt(element.HeaderDisc)), element.StoreCode, element.MobileNo, element.Cash, element.Card, element.Cheque, element.GV, element.CreditNote, element.ExcessGV, element.RoundOff, element.NoRefound, element.OtherPayments, element.LegacyGiftVoucher, element.LegacyAdvOrder, element.AgentAccount, element.MallGiftVoucher, element.LineDisc, element.HeaderDisc, 1]);
                    }
                });

                var sql = 'INSERT INTO customer_orders(merchant_id, loyalty_id, order_date, order_number, order_amount, calculated_amount, discounted_amount, store_code, mobile_number, cash, card, cheque, gv, credit_note, excess_gv, round_off, no_refound, other_payments, legacy_gift_voucher, legacy_adv_order, agent_account, mall_gift_voucher, line_disc, header_disc, created_by) VALUES ? ';
                sql += 'ON DUPLICATE KEY UPDATE order_amount = VALUES(order_amount), calculated_amount = VALUES(calculated_amount), discounted_amount = VALUES(discounted_amount), cash = VALUES(cash), card = VALUES(card), cheque = VALUES(cheque), gv = VALUES(gv), credit_note = VALUES(credit_note), excess_gv = VALUES(excess_gv), round_off = VALUES(round_off), no_refound = VALUES(no_refound), other_payments = VALUES(other_payments), legacy_gift_voucher = VALUES(legacy_gift_voucher), legacy_adv_order = VALUES(legacy_adv_order), agent_account = VALUES(agent_account), mall_gift_voucher = VALUES(mall_gift_voucher), line_disc = VALUES(line_disc), header_disc = VALUES(header_disc), updated_by = 1, updated_at = CURRENT_TIMESTAMP';
                pool.query(sql, [salesData])
                    .then(
                        (result: any) => callback({ result })
                    )
                    .catch(
                        (error) => {
                            console.log(error);
                            callback(false)
                        }
                    );
            });
    }

    // sales details master
    async salesDetailsMaster(data: any, callback: any) {
        let salesData = [];
        let filePath = await this.getFilePath(fileTypeSalesItems);
        await csv()
            .fromFile(filePath)
            .then((data) => {
                data.forEach(function (element) {
                    if (element.InvoiceDate != '' && element.InvoiceNumber != '' && element.StoreCode != '') {
                        const invoiceDate = (element.InvoiceDate != '') ? (element.InvoiceDate.split(' '))[0] : null;
                        salesData.push([element.StoreCode, element.MobileNo, element.Product, element.InvoiceNumber, element.SalesQty, element.Mrp, element.salesvalue, element.Discount, invoiceDate, element.SaleType, 1]);
                    }
                });
                var sql = 'INSERT INTO customer_order_details(store_code, mobile_number, sku, invoice_number, product_quantity, product_mrp, product_price, discounted_amount, order_date, order_type, created_by) VALUES ? ';
                sql += 'ON DUPLICATE KEY UPDATE sku = VALUES(sku), product_quantity = VALUES(product_quantity), product_mrp = VALUES(product_mrp), product_price = VALUES(product_price), discounted_amount = VALUES(discounted_amount), order_type = VALUES(order_type), updated_by = 1, updated_at = CURRENT_TIMESTAMP'
                pool.query(sql, [salesData])
                    .then(
                        (result: any) => callback({ result })
                    )
                    .catch(
                        (error) => callback(false)
                    );
            });
    }
    // voucher validations
    async callValicateVouchers(inputData) {
        const spStatus = await pool.query(`CALL validateVouchers (?);`, [inputData]).then((result: ResultSetHeader) => result);
        if (Object.keys(spStatus).length < 1) {
            throw new Error('Procedure Error validateVouchers');
        }
        const selectResut = <SpResponse>JSON.parse(spStatus[0]['response']);
        return { error: null, response: selectResut };
    }
    // voucher validation
    async validateVouchers() {
        let filePath = await this.getFilePath(fileTypeVouchers);
        var failureData;
        await csv().fromFile(filePath).then((data) => {
            data.forEach(async function (element) {
                let inputData = { "voucher_code": element.Voucher_Code, "invoice_number": element.Redeem_Invoice_Number, "store_code": element.Redeem_Store, "order_date": element.Redeem_Date, "voucher_value": element.Redeem_Amount };
                let { error, response } = await this.callValicateVouchers(inputData);
                console.log(response);

                if (error) {
                    throw error;
                }
                if (response.statusCode != 200 && response.statusCode != 108) {

                }

            });

        });
        return { error: null, response: failureData };
    }

    // 
    async callUserLoyaltyCalculationProcedure(lastId: number) {
        const spStatus = await pool.query(`CALL userLoyaltyCalculation (?,'',@outPutData);`, [lastId]).then((result: ResultSetHeader) => result);
        const selectResutArray = await pool.query(`SELECT @outPutData as response;`, null);
        if (Object.keys(selectResutArray).length < 1) {
            throw new Error('Procedure Error userLoyaltyCalculation');
        }
        const selectResut = <SpResponse>JSON.parse(selectResutArray[0]['response']);
        return { error: null, response: selectResut };
    }

    // sales details master
    async calculateUserLoyalty() {
        try {
            // let fileData;
            let lastId = 0;
            // let path = 'assets/master_data/orderId.json';
            // if (fs.existsSync(path)) {
            //     const fileResponse = await fs.readFileSync(path, 'utf8');
            //     if (fileResponse) {
            //         fileData = JSON.parse(fileResponse);
            //     }
            // }
            // if (fileData) {
            //     lastId = fileData.lastId;
            // }
            let { error, response } = await this.callUserLoyaltyCalculationProcedure(lastId);
            if (error) {
                throw error;
            }
            // if (response.lastId != 0) {
            //     await fs.writeFile(path, JSON.stringify({ "lastId": response.lastId }), function (err) {
            //         if (err) throw err;
            //     });
            // } else {
            //     if (fs.existsSync(path)) {
            //         await fs.unlink(path, function (err) {
            //             if (err) throw err;
            //         });
            //     }
            // }
            return { error: null, response: response };
        } catch (err) {
            throw err;
        }

    }

    //to format date
    formatDate(dateString) {
        // console.log(dateString);
        var date = new Date(dateString);
        // console.log(date);
        var yyyy = date.getFullYear().toString();
        var mm = (date.getMonth() + 1).toString();
        var dd = date.getDate().toString();

        var mmChars = mm.split('');
        var ddChars = dd.split('');

        return yyyy + '-' + (mmChars[1] ? mm : "0" + mmChars[0]) + '-' + (ddChars[1] ? dd : "0" + ddChars[0])
    }

    insertMasterLog(item: any) {
        return pool.query('INSERT INTO master_import_log SET ?', item);
    }

    getFilePath(fileTypeStoreLocations) {
        if (fileTypeStoreLocations == 1) {
            return "./assets/master_data/sales_master/CrocsLoyalty_Payment_20190529.csv";
        } else if (fileTypeStoreLocations == 2) {
            return "./assets/master_data/sales_master/CrocsLoyalty_Sales_20190529.csv";
        } else if (fileTypeStoreLocations == 3) {
            return "./assets/master_data/sales_master/Crocs Vouchers Data March-2019.csv";
        } else if (fileTypeStoreLocations == 4) {
            return "./assets/master_data/sku_master/Crocs_SKU_Master_Apr2019.csv";
        } else if (fileTypeStoreLocations == 5) {
            return "./assets/master_data/store_locations/Crocs Store Master Apr2019.csv";
        }

    }

    readAndInsert(req, sql, filePath, callback: any) {
        let insertData = [];
        let subMerchantId = 1; //req.decoded.sub_merchant_id;

        csv()
            .fromFile(filePath)
            .then((data) => {
                data.forEach(function (element) {
                    element.op_dt = (element.op_dt == '') ? null : element.op_dt;
                    insertData.push([subMerchantId, element.acnm, element.acname, element.del_add1, element.typenm, element.mgr_nm, element.tel, element.mob1, element.email, element.op_dt, element.city, element.state_nm, 1]);
                });
                pool.query(sql, [insertData])
                    .then(
                        (result: any) => callback({ result })
                    )
                    .catch(
                        //(error) => callback( error.sqlMessage )
                        (error) => callback(false)
                    );
            });
    }

    async findLatLong(address) {
        try {
            var latLong = { latitude: null, longitude: null };
            const result = await geocoder.geocode(address);
            return { latitude: result[0].latitude, longitude: result[0].longitude };;
        } catch (error) {
            throw error;
        }
    }
}