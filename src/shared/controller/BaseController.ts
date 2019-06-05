import * as fs from "fs";
import * as jwt from 'jsonwebtoken';
import * as shortUrl from 'node-url-shortener';
import Config from '../../config/config';
import Constants from '../../config/constants';
import { item } from "../../model/Menus";
import { User } from "../../model/User";
import SharedRepository from '../../repository/shared.repository';
import { DataTableQueryParam } from "../models/dataTablequeryParams.model";
import { queryParam } from "../models/queryParams";
import { ResultSetHeader } from "../models/ResultSetHeader.model";
import dateoperations from "./DateOperations";
const sharedRepository = new SharedRepository();
import pool from '../../database/database-connection';
var decode = require('unescape');

"use strict";
const nodemailer = require("nodemailer");
class BaseController extends dateoperations {
    sendResponse(httpResp, statusFlag: boolean, statusCode: number, data: any, message: any) {
        const response = {
            'status': statusFlag ? 'SUCCESS' : 'FAILURE',
            'statusCode': statusCode < 200 ? statusCode = 200 : statusCode,
            'data': data,
            'message': message
        };
        if (httpResp) {
            httpResp.status(statusCode).json(response);
        }
    }

    send = (to: string, message: string, type?: number) => new Promise((resolve, reject) => {
        try {
            var request = require("request");
            if (type == 1) {
                var options = {
                    method: 'GET',
                    url: Constants.promoSMS.url,
                    qs:
                    {
                        username: Constants.promoSMS.username,
                        password: Constants.promoSMS.password,
                        to: to,
                        from: Constants.promoSMS.from,
                        text: message,
                        'dlr-mask': Constants.promoSMS.drl_mask,
                        'dlr-url': ''
                    },
                    headers:
                        { 'cache-control': 'no-cache' }
                };
            }
            else {
                var options = {
                    method: 'GET',
                    url: Constants.transSMS.url,
                    qs:
                    {
                        username: Constants.transSMS.username,
                        password: Constants.transSMS.password,
                        to: to,
                        from: Constants.transSMS.from,
                        text: message,
                        'dlr-mask': Constants.transSMS.drl_mask,
                        'dlr-url': ''
                    },
                    headers:
                        { 'cache-control': 'no-cache' }
                };
            }
            request(options, function (error, response, body) {
               // console.log(response.caseless, body);
                if (error)
                    return reject(error);

                let result = { statusCode: 110, statusMessage: 'FAILURE' };
                if (response.statusCode == 200 && response.statusMessage == 'OK' && body == 'Sent.') {
                    result = { statusCode: 200, statusMessage: 'SUCCESS' };
                }
                return resolve(result);
            });
        }
        catch (error) {
            return error;
        }
    });

    async sendSMS(templateName: string, data: any) {
        try {
            data["loginLink"] = await this.shortURL(Constants.webURL);
            const name = { 'name': templateName }
            let result = await sharedRepository.getOtpTemplate(name);
            if (Object.keys(result.templateData).length) {
                const messageString = result.templateData[0].message;
                if (messageString) {
                    var new_str = messageString;
                    for (var key in data) {
                        if (!data.hasOwnProperty(key)) {
                            continue;
                        }
                        new_str = new_str.replace('${' + key + '}', data[key]);
                    }
                    const mobile_number = data["mobile_number"];
                    const type = data['sms_type'];//1 for promotional & 2 for transactional
                    if (mobile_number) {
                        let sendSMS: any = await this.send(mobile_number, new_str, type);
                        if (sendSMS.statusCode === 200) {
                            let countMessage = new_str.length / 160;
                            const smsCount = {
                                'no_of_sms': countMessage.toFixed(),
                                'mobile_number': mobile_number,
                                'name': templateName
                            }
                            sharedRepository.otpLogs(smsCount, (result: any) => {
                                //console.log(result);
                            });
                            return this.sendResponse('', true, sendSMS.statusCode, data, 'SMS sent Successfully');
                        }
                        else {
                            return this.sendResponse('', false, sendSMS.statusCode, data, 'SMS Failed');
                        }
                    }
                    else {
                        return this.sendResponse('', false, 110, data, 'Mobile number is required');
                    }
                    //return this.sendResponse('', true, 200,data, 'SMS sent Successfully');
                }
            }
        }
        catch (error) {
            throw error;
        }
    }

    async sendEmail(templateName: string, data: any) {
        try {
            data["loginLink"] = await this.shortURL(Constants.webURL);
            let transporter;
            if (data.email_type == 1) {
                transporter = nodemailer.createTransport({
                    host: Constants.promoEmail.host,
                    endpoint: Constants.promoEmail.endpoint,
                    port: Constants.promoEmail.port,
                    secure: Constants.promoEmail.secure,
                    auth: {
                        user: Constants.promoEmail.user,
                        pass: Constants.promoEmail.pass,
                        apiKey: Constants.promoEmail.apiKey,
                        publicApiKey: Constants.promoEmail.apiKey,
                        domain: Constants.promoEmail.domain
                    },
                });
            }
            else {
                transporter = nodemailer.createTransport({
                    host: Constants.transEmail.host,
                    endpoint: Constants.transEmail.endpoint,
                    port: Constants.transEmail.port,
                    secure: Constants.transEmail.secure,
                    auth: {
                        user: Constants.transEmail.user,
                        pass: Constants.transEmail.pass,
                        apiKey: Constants.transEmail.apiKey,
                        publicApiKey: Constants.transEmail.apiKey,
                        domain: Constants.transEmail.domain
                    },
                });
            }
            const name = { 'name': templateName }
            let getTemp = await sharedRepository.getEmailTemplate(name);
            if (Object.keys(getTemp.emailTemplateData).length) {
                const htmlTemplate = getTemp.emailTemplateData[0].text1;
                let toEmail;
                let fromEmail;
                if (templateName == "FEEDBACK") {
                    toEmail = data.toEmail;
                    fromEmail = data.fromEmail;
                }
                else {
                    toEmail = data.toEmail;
                    fromEmail = "customercare@crocsindia.com";
                }
                let mailSubject = getTemp.emailTemplateData[0].subject;
                //for subject replacement
                for (var key in data) {
                    if (!data.hasOwnProperty(key)) {
                        continue;
                    }
                    mailSubject = mailSubject.replace('${' + key + '}', data[key]);
                }
                //for message replacement
                var new_str = htmlTemplate;
                for (var key in data) {
                    if (!data.hasOwnProperty(key)) {
                        continue;
                    }
                    new_str = new_str.replace('${' + key + '}', data[key]);
                }
                if (htmlTemplate) {
                    let info = await transporter.sendMail({
                        from: `"Crocs" <${fromEmail}>`, // sender address
                        to: toEmail, // list of receivers
                        subject: mailSubject, // Subject line
                        // text: "Hello world?", // plain text body
                        html: decode(new_str), // html body
                        headers: (data.email_tag) ? { "X-Mailgun-Tag": data.email_tag } : '',
                        /* attachments: [
                            {
                              filename: 'test.log',
                              path: '../backend/test.log',
                              cid: 'file'
                            }
                          ] */
                    });
                    if (info.messageId) {
                        const smsCount = {
                            'email_address': toEmail,
                            'name': templateName
                        }
                        sharedRepository.otpLogs(smsCount, (result: any) => {
                            // console.log(result);
                        });
                        let result = { statusCode: 200, statusMessage: 'SUCCESS' };
                        return result;
                        //return this.sendResponse('', true, 200, { message: "Mail Sent Sucessfully" }, '');
                    }
                    else {
                        return this.sendResponse(info, false, 110, { message: "Mail is Not Sent Sucessfully" }, '');
                    }
                }
            }
        }
        catch (error) {
            throw error;
        }
    }

    // regx formatter: Apply regx for search query
    regxFormatter(objParams) {
        let arrFilter = [];
        if (Object.keys(objParams).length) {
            Object.keys(objParams).forEach(key => {
                let objRegx = {};
                objRegx[key] = { $regex: new RegExp(objParams[key], 'i') }
                arrFilter.push(objRegx);
            });
        }
        return arrFilter;
    }

    // filterByFormatter
    filterByFormatter(objParams) {
        let arrFilter = [];
        if (Object.keys(objParams).length) {
            Object.keys(objParams).forEach(key => {
                let obj = {};
                obj[key] = objParams[key];
                arrFilter.push(obj);
            });
        }
        return arrFilter;
    }

    // Return total records/document count
    getTotalRecordsCount(thisModel, objFilter?) {
        return new Promise((resolve, reject) => {
            thisModel.countDocuments(objFilter).exec((err, totalCount) => {
                if (err) {
                    reject(err);
                }
                resolve(totalCount);
            });
        }).catch(err => err);
    }

    // Update and send response

    // Create directories based on path
    mkdirSyncRecursive(directory) {
        let path = directory.replace(/\/$/, '').split('/');
        let mode = parseInt('0777', 8);
        for (let i = 1; i <= path.length; i++) {
            let segment = path.slice(0, i).join('/');
            !fs.existsSync(segment) ? fs.mkdirSync(segment, mode) : null;
        }
    }

    uploadBase64Image(path, base64Data, imageCategory?) {
        return new Promise((resolve, reject) => {
            try {
                let matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                let imageBuffer = {
                    type: matches[1],
                    data: new Buffer(matches[2], 'base64')
                }
                // let imageTypeRegularExpression = /\/(.*?)$/;
                let uniqueRandomFileName = (imageCategory + '-' + Date.now() + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '.png');
                // let imageTypeDetected = imageBuffer['type'].match(imageTypeRegularExpression);
                let uploadedFilePath = path + uniqueRandomFileName;
                if (!fs.existsSync(path)) {
                    this.mkdirSyncRecursive(path);
                }
                require('fs').writeFile(uploadedFilePath, imageBuffer['data'],
                    (error) => {
                        if (error) {
                            resolve({
                                status: false,
                                data: error,
                                msg: 'failed to upload'
                            });
                        } else {
                            resolve({
                                status: true,
                                data: {
                                    fileName: uniqueRandomFileName,
                                    fullFileName: uploadedFilePath.replace('./dist', '')
                                },
                                msg: 'uploaded successfully'
                            });
                        }
                    });
            }
            catch (error) {
                resolve({
                    status: false,
                    data: error
                });
            }
        }).catch(err => err);
    }

    JoiErrors(error) {
        let message = {};
        error.details.forEach(element => {
            if (!(element.path in message)) {
                message[element.path] = element.message.replace(/['"]/g, '');
            }
        });
        return message;
    }

    getAllActions() {
        return [{ requestSource: 0, action: 'insert' }, { requestSource: 201, action: 'update' }, { requestSource: 1, action: 'update' }];
    }

    getAction(key: string, value: any) {
        const actionKeys = ['requestSource', 'action'];
        if (actionKeys.indexOf(key) === -1) {
            return null;
        }
        return this.getAllActions().find(act => act[key] === value);
    }

    isOneRecordResult(result: ResultSetHeader, action: string): boolean {

        if (!action) {
            throw new Error('Please provide action');
        }

        if (!this.isValidAction(action)) {
            throw new Error('Invalid action');
        }

        if (action == 'update') {
            return result.affectedRows === 1 && (result.changedRows === 1 || result.changedRows == 0);
        } else {
            return result.affectedRows === 1 && result.insertId !== 0;
        }
    }

    isValidAction(action: string) {
        return this.getAction('action', action);
    }

    checkRequestSource(requestSource: number) {

        if (requestSource == null) {
            throw new Error('Please provide request source.');
        }

        if (!this.isNumber(requestSource)) {
            throw new Error('Invaid request source.');
        }

        return this.getAction('requestSource', requestSource) || null;
    }

    isNumber(n: any) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    async generateQuery(param: queryParam) {
        try {
            let pageSize = param.pageSize,
                pageNumber = param.pageNumber,
                sortField = param.sortField,
                sortOrder = param.sortOrder,
                filters = param.filter,
                userFilter = param.userFilter,
                tAlias = param.tablesAlias,
                sIndexColumn = param.tableIndexColumn,
                tTableName = param.tablesList,
                tColumns = param.tablesColumns,
                tableJoins = [[], ...param.tablesJoins],
                tablesColumnsAlias = param.tablesColumnsAlias,
                sTable = '',
                aColumns = [];
            const aWhere = [];
            const aWhereBind = [];
            for (let tableIndex in tTableName) {
                if (tColumns[tableIndex]) {
                    for (let rColums of tColumns[tableIndex]) {
                        const sanitizerColums = rColums.trim().replace(/[\\$'"]/g, "\\$&");
                        aColumns.push(`${tAlias[tableIndex]}.${sanitizerColums}`);
                        if (sortField && sanitizerColums == sortField) {
                            sortField = `${tAlias[tableIndex] + "." + sanitizerColums}`
                        }

                        if (filters !== undefined) {
                            if (filters[sanitizerColums]) {
                                if (typeof filters[sanitizerColums] === 'number') {
                                    // aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} = ${filters[sanitizerColums]}`);
                                    aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} = ?`);
                                    aWhereBind.push(`${filters[sanitizerColums]}`);
                                } else {
                                    // aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} LIKE '${filters[sanitizerColums]}%'`);
                                    aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} LIKE ?`);
                                    aWhereBind.push(`${filters[sanitizerColums]}%`);
                                }
                            }
                        }
                    }
                }
                if (tableIndex === '0') {
                    sTable += `${tTableName[tableIndex]} ${tAlias[tableIndex]} `;
                } else {
                    sTable += ` LEFT JOIN ${tTableName[tableIndex]} ${tAlias[tableIndex]} ON ${tAlias[tableIndex]}.${tableJoins[tableIndex].join(' = ')}`;
                }
            }

            if (tablesColumnsAlias && tablesColumnsAlias.length) {
                aColumns = [...aColumns, ...tablesColumnsAlias];
            }

            let sLimit = '';
            /*
             * Paging
             */
            sLimit = "LIMIT 10";
            if (pageSize && pageNumber !== -1) {
                const offset = (pageNumber - 1) * pageSize;
                sLimit = `LIMIT ${pageSize} OFFSET ${offset}`;
            }


            /*
             * Ordering
             */
            let sOrder = '';
            if (sortField) {
                sOrder = "ORDER BY ";
                sOrder += `${sortField} `;
                sOrder += ` ${sortOrder === 'asc' ? 'asc' : 'desc'}`
                if (sOrder == "ORDER BY ") {
                    sOrder = '';
                }
            }

            /*
             * Where
             */
            let sWhere = '';
            // const aWhere = [];
            /*  if (filters !== undefined) {
                 Object.keys(filters).forEach(function (key) {
                     if (typeof filters[key] == 'number') {
                         aWhere.push(` ${key} = ${filters[key]}`);
                     } else {
                         aWhere.push(` ${key} LIKE '${filters[key]}%'`);
                     }
                 });
             } */
            let sHaving = '';
            const aHaving = [];
            const aHavingBind = [];
            if (filters !== undefined && tablesColumnsAlias) {
                Object.keys(tablesColumnsAlias).forEach(function (key) {
                    const columWithAliase = tablesColumnsAlias[key];
                    const cAlias = columWithAliase.slice(columWithAliase.lastIndexOf(" AS ") + 4);
                    if (filters[cAlias]) {
                        const filtersAlias = filters[cAlias].trim().replace(/[\\$'"]/g, "\\$&");
                        if (typeof filters[cAlias] == 'number') {
                            aHaving.push(` ${cAlias} = ${filtersAlias}`);
                        } else {
                            aHaving.push(` ${cAlias} LIKE '%${filtersAlias}%'`);
                        }
                    }
                });
            }

            if (aHaving.length) {
                sHaving = `HAVING ${aHaving.join(" AND ")}`;
            }

            /*
            * user filter apnd to where condition
            */
            // sWhere += `${(aWhere.length && userFilter) ? ' WHERE ' + aWhere.join(" AND ") + ' AND ' + userFilter : userFilter ? ' WHERE ' + userFilter : ''}`;

            if (aWhere.length) {
                sWhere += 'WHERE ' + aWhere.join(" AND ");
            }

            if (userFilter) {
                if (aWhere.length) {
                    sWhere += ' AND ' + userFilter;
                } else {
                    sWhere += 'WHERE ' + userFilter;
                }
            }

            let strColumns = aColumns.join(", ").replace(" , ", " ");
            let sQuery = `SELECT ${strColumns} `;
            sQuery += `FROM   ${sTable} `;
            sQuery += `${sWhere} `;
            sQuery += `${sHaving} `;
            sQuery += `${sOrder} `;
            sQuery += `${sLimit}; `;
            let countQuery = '', havingCountQuery = '';
            if (sHaving == '') {
                countQuery = `SELECT COUNT(${sIndexColumn}) AS total FROM ${sTable} ${sWhere}`;
            } else {
                countQuery = `SELECT ${strColumns} `;
                countQuery += `FROM ${sTable} `;
                countQuery += `${sWhere} `;
                countQuery += `${sHaving};`;
                havingCountQuery = ` SELECT FOUND_ROWS() AS total;`;
            }

            const queryParam: DataTableQueryParam = {
                tableQuery: sQuery,
                countQuery: countQuery,
                havingCountQuery,
                bindingParams: aWhereBind
            };

            return await sharedRepository.dataTableQuery(queryParam);
        } catch (error) {
            throw error;
        }
    }

    async generateQuery2(param: queryParam) {
        try {
            let pageSize = param.pageSize,
                pageNumber = param.pageNumber,
                sortField = param.sortField,
                sortOrder = param.sortOrder,
                filters = param.filter,
                userFilter = param.userFilter,
                tAlias = param.tablesAlias,
                sIndexColumn = param.tableIndexColumn,
                tTableName = param.tablesList,
                tColumns = param.tablesColumns,
                tableJoins = [[], ...param.tablesJoins],
                tablesColumnsAlias = param.tablesColumnsAlias,
                sTable = '',
                aColumns = [];
            const aWhere = [];
            const aWhereBind = [];
            const jsonQueryColumns = [];
            for (let tableIndex in tTableName) {
                if (tColumns[tableIndex]) {
                    for (let rColums of tColumns[tableIndex]) {
                        const sanitizerColums = rColums.trim().replace(/[\\$'"]/g, "\\$&");
                        //  jsonQueryColumns.push(`'${rColums}', ${tAlias[tableIndex] + "." + rColums}`);
                        aColumns.push(`'${rColums}', ${tAlias[tableIndex]}.${sanitizerColums}`);
                        if (sortField && sanitizerColums == sortField) {
                            sortField = `${tAlias[tableIndex] + "." + sanitizerColums}`
                        }

                        if (filters !== undefined) {
                            if (filters[sanitizerColums]) {
                                if (typeof filters[sanitizerColums] === 'number') {
                                    // aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} = ${filters[sanitizerColums]}`);
                                    aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} = ?`);
                                    aWhereBind.push(`${filters[sanitizerColums]}`);
                                } else {
                                    // aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} LIKE '${filters[sanitizerColums]}%'`);
                                    aWhere.push(` ${tAlias[tableIndex] + "." + sanitizerColums} LIKE ?`);
                                    aWhereBind.push(`${filters[sanitizerColums]}%`);
                                }
                            }
                        }
                    }
                }
                if (tableIndex === '0') {
                    sTable += `${tTableName[tableIndex]} ${tAlias[tableIndex]} `;
                } else {
                    sTable += ` LEFT JOIN ${tTableName[tableIndex]} ${tAlias[tableIndex]} ON ${tAlias[tableIndex]}.${tableJoins[tableIndex].join(' = ')}`;
                }
            }

            /*  if (tablesColumnsAlias && tablesColumnsAlias.length) {
                 aColumns = [...aColumns, ...tablesColumnsAlias];
             } */

            let sLimit = '';
            /*
             * Paging
             */
            sLimit = "LIMIT 10";
            if (pageSize && pageNumber !== -1) {
                const offset = (pageNumber - 1) * pageSize;
                sLimit = `LIMIT ${pageSize} OFFSET ${offset}`;
            }


            /*
             * Ordering
             */
            let sOrder = '';
            if (sortField) {
                sOrder = "ORDER BY ";
                sOrder += `${sortField} `;
                sOrder += ` ${sortOrder === 'asc' ? 'asc' : 'desc'}`
                if (sOrder == "ORDER BY ") {
                    sOrder = '';
                }
            }

            /*
             * Where
             */
            let sWhere = '';
            // const aWhere = [];
            /*  if (filters !== undefined) {
                 Object.keys(filters).forEach(function (key) {
                     if (typeof filters[key] == 'number') {
                         aWhere.push(` ${key} = ${filters[key]}`);
                     } else {
                         aWhere.push(` ${key} LIKE '${filters[key]}%'`);
                     }
                 });
             } */
            let sHaving = '';
            const aHaving = [];
            const aHavingBind = [];
            /* if (filters !== undefined && tablesColumnsAlias) {
                Object.keys(tablesColumnsAlias).forEach(function (key) {
                    const columWithAliase = tablesColumnsAlias[key];
                    const cAlias = columWithAliase.slice(columWithAliase.lastIndexOf(" AS ") + 4);
                    if (filters[cAlias]) {
                        const filtersAlias = filters[cAlias].trim().replace(/[\\$'"]/g, "\\$&");
                        if (typeof filters[cAlias] == 'number') {
                            aHaving.push(` ${cAlias} = ${filtersAlias}`);
                        } else {
                            aHaving.push(` ${cAlias} LIKE '%${filtersAlias}%'`);
                        }
                    }
                });
            } */

            if (filters !== undefined && tablesColumnsAlias) {
                for (const row of tablesColumnsAlias) {
                    let cAlias = row[1];
                    aColumns.push(`'${cAlias}', ${row[0]}`);
                    if (filters[cAlias]) {
                        const filtersAlias = filters[cAlias].trim().replace(/[\\$'"]/g, "\\$&");
                        if (typeof filters[cAlias] == 'number') {
                            aHaving.push(` ${cAlias} = ${filtersAlias}`);
                        } else {
                            aHaving.push(` ${cAlias} LIKE '%${filtersAlias}%'`);
                        }
                    }

                }

                console.log(aHaving);
                /*  Object.keys(tablesColumnsAlias).forEach(function (key) {
                     const columWithAliase = tablesColumnsAlias[key];
                     const cAlias = columWithAliase.slice(columWithAliase.lastIndexOf(" AS ") + 4);
                     if (filters[cAlias]) {
                         const filtersAlias = filters[cAlias].trim().replace(/[\\$'"]/g, "\\$&");
                         if (typeof filters[cAlias] == 'number') {
                             aHaving.push(` ${cAlias} = ${filtersAlias}`);
                         } else {
                             aHaving.push(` ${cAlias} LIKE '%${filtersAlias}%'`);
                         }
                     }
                 }); */
            }

            if (aHaving.length) {
                sHaving = `HAVING ${aHaving.join(" AND ")}`;
            }

            /*
            * user filter apnd to where condition
            */
            // sWhere += `${(aWhere.length && userFilter) ? ' WHERE ' + aWhere.join(" AND ") + ' AND ' + userFilter : userFilter ? ' WHERE ' + userFilter : ''}`;

            if (aWhere.length) {
                sWhere += 'WHERE ' + aWhere.join(" AND ");
            }

            if (userFilter) {
                if (aWhere.length) {
                    sWhere += ' AND ' + userFilter;
                } else {
                    sWhere += 'WHERE ' + userFilter;
                }
            }

            let jsonQueryColumnsString = '';
            let jsonQueryPrefix = `SELECT CONCAT('[',GROUP_CONCAT(JSON_OBJECT(`;
            let jsonQuerySuffix = `) ${sOrder} ),']') INTO @totalRecords`;

            jsonQueryColumnsString = aColumns.join(", ").replace(" , ", " ");
            jsonQueryColumnsString = jsonQueryPrefix + jsonQueryColumnsString + jsonQuerySuffix;


            jsonQueryColumnsString = `${jsonQueryColumnsString} FROM ${sTable} ${sWhere} ${sHaving} ${sLimit}`;
            let countQuery = `SELECT COUNT(${sIndexColumn}) INTO @totalCount FROM ${sTable} ${sWhere}`;

            const finalJsonQuery = JSON.stringify({
                tableQuery: jsonQueryColumnsString,
                countQuery: countQuery
            });
            console.log(jsonQueryColumnsString);
            const result = await pool.query(`CALL dataTable(?);`, [finalJsonQuery]);

            console.log(result[0][0]['response']['data']['totalRecords']);

            //   return finalJsonQuery;

            /* let strColumns = aColumns.join(", ").replace(" , ", " ");
            let sQuery = `SELECT ${strColumns} `;
            sQuery += `FROM   ${sTable} `;
            sQuery += `${sWhere} `;
            sQuery += `${sHaving} `;
            sQuery += `${sOrder} `;
            sQuery += `${sLimit}; `;
            let countQuery = '', havingCountQuery = '';
            if (sHaving == '') {
                countQuery = `SELECT COUNT(${sIndexColumn}) AS total FROM ${sTable} ${sWhere}`;
            } else {
                countQuery = `SELECT ${strColumns} `;
                countQuery += `FROM ${sTable} `;
                countQuery += `${sWhere} `;
                countQuery += `${sHaving};`;
                havingCountQuery = ` SELECT FOUND_ROWS() AS total;`;
            } 

            const queryParam: DataTableQueryParam = {
                tableQuery: sQuery,
                countQuery: countQuery,
                havingCountQuery,
                bindingParams: aWhereBind
            };

            return await sharedRepository.dataTableQuery(queryParam);
            */
        } catch (error) {
            throw error;
        }
    }

    generateJsonQueryBackup(param: queryParam) {
        let pageSize = param.pageSize,
            pageNumber = param.pageNumber,
            sortField = param.sortField,
            sortOrder = param.sortOrder,
            filters = param.filter,
            userFilter = param.userFilter,
            tAlias = param.tablesAlias,
            sIndexColumn = param.tableIndexColumn,
            tTableName = param.tablesList,
            tColumns = param.tablesColumns,
            tableJoins = [[], ...param.tablesJoins],
            sTable = '',
            jsonQueryColumns = [];


        for (let tableIndex in tTableName) {
            for (let rColums of tColumns[tableIndex]) {
                jsonQueryColumns.push(`'${rColums}', ${tAlias[tableIndex] + "." + rColums}`);
                if (sortField && rColums == sortField) {
                    sortField = `${tAlias[tableIndex] + "." + rColums}`
                }
            }

            if (tableIndex === '0') {
                sTable += `${tTableName[tableIndex]} ${tAlias[tableIndex]} `;
            } else {
                sTable += ` LEFT JOIN ${tTableName[tableIndex]} ${tAlias[tableIndex]} ON ${tAlias[tableIndex]}.${tableJoins[tableIndex].join(' = ')}`;
            }
        }

        let sLimit = '';
        /*
         * Paging
         */
        sLimit = "LIMIT 10";
        if (pageSize && pageNumber !== -1) {
            sLimit = `LIMIT ${pageSize} OFFSET ${pageNumber}`;
        }


        /*
         * Ordering
         */
        let sOrder = '';
        if (sortField) {
            sOrder = "ORDER BY ";
            sOrder += `${sortField} `;
            sOrder += ` ${sortOrder === 'asc' ? 'asc' : 'desc'}`
            if (sOrder == "ORDER BY ") {
                sOrder = '';
            }
        }

        /*
         * Where
         */
        let sWhere = '';
        const aWhere = [];
        if (filters !== undefined) {
            Object.keys(filters).forEach(function (key) {
                if (typeof filters[key] == 'number') {
                    aWhere.push(` ${key} = ${filters[key]}`);
                } else {
                    aWhere.push(` ${key} LIKE '${filters[key]}%'`);
                }
            });
        }

        /*
        * user filter apnd to where condition
        */
        sWhere += `${aWhere.length ? ' WHERE ' + aWhere.join(" AND ") + ' AND ' + userFilter : userFilter ? ' WHERE ' + userFilter : ''}`;

        let jsonQueryColumnsString = '';
        let jsonQueryPrefix = `SELECT CONCAT('[',GROUP_CONCAT(JSON_OBJECT(`;
        let jsonQuerySuffix = `)),']') INTO @totalRecords`;

        jsonQueryColumnsString = jsonQueryColumns.join(", ");
        jsonQueryColumnsString = jsonQueryPrefix + jsonQueryColumnsString + jsonQuerySuffix;


        jsonQueryColumnsString = `${jsonQueryColumnsString} FROM ${sTable} ${sWhere} ${sOrder} ${sLimit}`;
        let countQuery = `SELECT COUNT(${sIndexColumn}) INTO @totalCount FROM ${sTable} ${sWhere}`;

        const finalJsonQuery = JSON.stringify({
            tableQuery: jsonQueryColumnsString,
            countQuery: countQuery
        });

        return finalJsonQuery;
    }

    protected async  userLinks(data: User) {
        try {
            let userMenu: item[],
                hasHomeBranch: boolean,
                skipLinkIndex = -1,
                links: item[] = [];
            const userType = data.user_type_id,
                homeBranch = data.home_branch_id;
            hasHomeBranch = (userType === 0 && homeBranch !== null);
            userMenu = await sharedRepository.getMenu(userType);

            let skipLink = '/dashboard/change-home-branch';
            if (userMenu.length) {
                links = userMenu;
                if (skipLink) {
                    skipLinkIndex = links.findIndex(item => item.path === skipLink && !hasHomeBranch);
                    if (skipLinkIndex !== -1) {
                        links.splice(skipLinkIndex, 1);
                    }
                    return links;
                }
            }
            return [];
        } catch (error) {
            throw error;
        }
    }

    protected generateToken(data: any, forUser: boolean = false): Promise<string> {
        const options = {};
        if (forUser) {
            options['expiresIn'] = '1d';
        }
        return new Promise<string>((resolve, reject) => {
            jwt.sign(data, Config.AUTHORIZATION_KEY, options, (error, token) => {
                if (error) {
                    return reject(new Error('Token generation fail'));
                }
                return resolve(token);
            })
        });
    }

    protected async getUserData(data: any, forUser: boolean = false) {
        try {
            const token = await this.generateToken(data, forUser); // generate us
            const actions = await this.userLinks(data);//get menu list
            return { token, actions };
        } catch (error) {
            throw error;
        }
    }
    // To shorten long urls
    protected shortURL(url: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            shortUrl.short(url, function (err, shortUrl) {
                if (err) {
                    return reject(err);
                }
                return resolve(shortUrl);
            });
        });
    }
}
export default BaseController;