import pool from '../../database/database-connection';
import SharedRepository from '../../repository/shared.repository';
import { DataTableQueryParam } from '../../shared/models/dataTablequeryParams.model';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';
import { Merchantusers } from './merchant-users.model';
import CacheService from '../../shared/services/cache.service';
const sharedRepository = new SharedRepository();

const cacheService = new CacheService(1000);
export default class MerchantusersRepository {

    userType: number;
    merchantId: any;
    subMerchantId: any;
    subMerchantLocationId: any;
    sql: any;
    filter(object: {}, ...keys) {
        return keys.reduce((result, key) => ({ ...result, [key]: object[key] }), {});
    };
    getRole(user) {
        this.userType = user.userType;
        this.merchantId = user.merchantId;
        this.subMerchantId = user.subMerchantId;
        this.subMerchantLocationId = user.subMerchantLocationId;
    }

    traditinalUserList() {
        let userFilter = '',
            alias = 'a', alias2 = 'ut', alias3 = 'm', alias4 = 'sm', alias5 = 'sml',
            tableName = 'admins', tableName2 = 'user_types', tableName3 = 'merchants', tableName4 = 'sub_merchants', tableName5 = 'sub_merchant_locations',
            sIndexColumn = `${alias}.id`,
            columns = ['id', 'first_name', 'last_name', 'user_type_id', 'merchant_id', 'sub_merchant_id', 'sub_merchant_location_id', 'username', 'email', 'contact', 'gender', 'status', 'created_at'],
            columns2 = ['name'],
            columns3 = ['merchant_name'],
            columns4 = ['sub_merchant_name'],
            columns5 = ['location_name'],
            sTable = `${tableName} ${alias}`;

        sTable += `  LEFT JOIN ${tableName2} ${alias2} ON ${alias2}.id = ${alias}.user_type_id`;
        sTable += `  LEFT JOIN ${tableName3} ${alias3} ON ${alias3}.id = ${alias}.merchant_id`;
        sTable += `  LEFT JOIN ${tableName4} ${alias4} ON ${alias4}.id = ${alias}.sub_merchant_id`;
        sTable += `  LEFT JOIN ${tableName5} ${alias5} ON ${alias5}.id = ${alias}.sub_merchant_location_id`;

        let aColumns = [];
        for (let column of columns) {
            aColumns.push(`${alias}.${column}`);
        }

        for (let column of columns2) {
            aColumns.push(`${alias2}.${column}`);
        }

        for (let column of columns3) {
            aColumns.push(`${alias3}.${column}`);
        }

        for (let column of columns4) {
            aColumns.push(`${alias4}.${column}`);
        }

        for (let column of columns5) {
            aColumns.push(`${alias5}.${column}`);
        }

        let sWhere = '';
        let sOrder = '';
        let sLimit = '';

        let strColumns = aColumns.join(", ").replace(" , ", " ");
        let sQuery = `SELECT SQL_CALC_FOUND_ROWS ${strColumns} `;
        sQuery += `FROM   ${sTable} `;
        sQuery += `${sWhere} `;
        sQuery += `${sOrder} `;
        sQuery += `${sLimit} `;

        let foundRowsQuery = "SELECT FOUND_ROWS() AS found_rows";
        let countQuery = `SELECT COUNT(${sIndexColumn}) AS total_count FROM ${sTable} ${sWhere}`;

    }
    async getUserList() {

        let pageSize: number,
            pageNumber: number,
            sortField: string,
            sortOrder: string,
            filters: {},
            userFilter = '',
            alias = 'a', alias2 = 'ut', alias3 = 'm', alias4 = 'sm', alias5 = 'sml',
            tAlias = ['a', 'ut', 'm', 'sm', 'sml'],
            sIndexColumn = `${tAlias[0]}.id`,
            tTableName = [
                'admins', 'user_types', 'merchants', 'sub_merchants', 'sub_merchant_locations'
            ],
            tColumns = [
                ['id', 'first_name', 'last_name', 'user_type_id', 'merchant_id', 'sub_merchant_id', 'sub_merchant_location_id', 'username', 'email', 'contact', 'gender', 'status', 'created_at'],
                ['name'],
                ['merchant_name'],
                ['sub_merchant_name'],
                ['location_name']
            ],
            tableJoins = [
                [],
                ['id', 'a.user_type_id'],
                ['id', 'a.merchant_id'],
                ['id', 'a.sub_merchant_id'],
                ['id', 'a.sub_merchant_location_id'],
            ],
            sTable = '';


        let aColumns = [];
        let jsonQueryColumns = [];
        /* for (let columnIndex in tColumns) {
            for (let rColums of tColumns[columnIndex]) {
                jsonQueryColumns.push(`'${rColums}', ${tAlias[columnIndex] + "." + rColums}`);
            }
        } */

        for (let tableIndex in tTableName) {
            for (let rColums of tColumns[tableIndex]) {
                jsonQueryColumns.push(`'${rColums}', ${tAlias[tableIndex] + "." + rColums}`);
            }

            if (tableIndex === '0') {
                sTable += `${tTableName[tableIndex]} ${tAlias[tableIndex]} `;
            } else {
                sTable += ` LEFT JOIN ${tTableName[tableIndex]} ${tAlias[tableIndex]} ON ${tAlias[tableIndex]}.${tableJoins[tableIndex].join(' = ')}`;
            }
        }
        // console.log(sTable);

        // return;
        // return strColumnss.replace(' , ', ' ');
        /*
         * userFilter
         */
        userFilter = `${alias}.status != 2 AND ${alias}.user_type_id >= ${this.userType} `;
        switch (this.userType) {
            case 3:
                //listing merchant
                userFilter += `AND a.merchant_id = ${this.merchantId} `;
                break;

            case 4:
                //listing  submerchant
                userFilter += `AND a.merchant_id = ${this.merchantId}  AND a.sub_merchant_id = ${this.subMerchantId} `;
                break;

            case 5:
                //listing POS
                userFilter = `a.user_type_id > ${this.userType} AND a.merchant_id = ${this.merchantId} AND a.sub_merchant_id = ${this.subMerchantId} AND a.sub_merchant_location_id = ${this.subMerchantLocationId} `;
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
        if (filters !== undefined) {
            Object.keys(filters).forEach(function (key) {
                if (typeof filters[key] == 'number') {
                    sWhere += ' AND ' + key + ' = ' + filters[key];
                } else {
                    sWhere += ' AND ' + key + ' LIKE "' + filters[key] + '%"';
                }
            });
        }
        sWhere += `${sWhere.length ? ' WHERE ' + sWhere + ' AND ' + userFilter : ' WHERE ' + userFilter}`;

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

        const { error, response } = await this.callDataTableProcedure(finalJsonQuery);
        console.log(error, response);

    }

    async callDataTableProcedure(param) {
        const spStatus = await pool.query('CALL dataTable(?);', [param]).then((result: ResultSetHeader) => result);

        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error dataTable');
        }

        const selectResut = <SpResponse>spStatus[0][0]['response'];

        return { error: null, response: selectResut };
    }

    findOneByUsername(username: string, callback: any): void {
        pool.query('SELECT * FROM admins WHERE username = ?', [username]).then(
            (result: any) => callback(result[0])
        );
    }

    createOne(item: Merchantusers, callback: any): void {
        pool.query('INSERT INTO admins SET ?', [item]).then(
            (result: any) => callback(null, { user_id: result.insertId })
        ).catch(
            (result: any) => callback(result)
        );
    }

    updateOne(item: Merchantusers, callback: any): void {
        let id = item.id;
        delete item.id;
        pool.query(`UPDATE admins SET ? WHERE id = ` + id, item).then(
            (result: any) => callback(null, result)
        ).catch(
            (result: any) => callback(result)
        );
    }

    //to get sub-merchant locations by sub-merchant id
    async getUserTypes(user_type_id: string) {
        try {
            let result = await pool.query('SELECT id, name FROM user_types WHERE status = 1 AND id > ? ORDER BY id', [user_type_id]);
            return { user_type_list: result };
        } catch (error) {
            throw error;
        }
    }

    //to get user profile details
    async getUserProfileDetails(user_id) {
        try {
            let result = await pool.query('SELECT a.id, a.merchant_id, a.first_name, a.last_name, a.gender, a.contact, a.email, a.merchant_id, a.sub_merchant_id, a.sub_merchant_location_id, a.user_type_id, a.username, ut.name, sml.location_name FROM admins AS a LEFT JOIN user_types AS ut ON a.user_type_id = ut.id LEFT JOIN sub_merchant_locations AS sml ON a.sub_merchant_location_id = sml.id WHERE a.id = ?', [user_id]);
            return { profile_details: result };
        } catch (error) {
            throw error;
        }
    }

    //to get login logs for selected user
    async getLoginLogs(user_id: number) {
        try {
            let result = await pool.query('SELECT * FROM login_logs WHERE user_id = ? AND in_time >= DATE(NOW()) - INTERVAL 15 DAY ORDER BY id DESC', [user_id]);
            return { login_logs: result };
        } catch (error) {
            throw error;
        }
    }

    //to logout user
    logout(id: number, callback: any) {
        return pool.query('UPDATE login_logs SET last_access_time = timediff(now(),in_time) WHERE id =?', [id]).then(
            (result: any) => callback(null, result)
        ).catch(
            (result: any) => callback(result)
        );
    }

    //fetch data rerquired for customer dashboard
    async callgetPOSDashboardDetailsSp(input) {

        let cacheResponse: any;
        const objCacheReponse = await cacheService.getValue(input);

        if (objCacheReponse != null) {
            cacheResponse = objCacheReponse;
        } else {
            const spStatus = await pool.query(`CALL getPOSDashboardDetails(?);`, [JSON.stringify(input)]);//.then((result: ResultSetHeader) => result);
            // console.log(spStatus);

            if (Object.keys(spStatus).length !== 2) {
                throw new Error('Procedure Error registerCustomer');
            }
            <SpResponse>spStatus[0][0]['response'];
            //collect result
            const selectResut = <SpResponse>spStatus[0][0]['response'];
            const allowStatusCode = [200];
            cacheService.setValue(input, selectResut, 120000);// cache for 2 minuts 
            cacheResponse = selectResut;
        }
        return { error: null, response: cacheResponse };
    }

    // Voucher reports download
    async voucherReportsDownload() {
        try {
            let result = await pool.query('SELECT cm.id, cm.voucher_code, cm.coupon_used, cm.voucher_value, cl.first_name, cl.last_name FROM customer_milestones cm  LEFT JOIN customer_loyalty cl ON cl.loyalty_id = cm.loyalty_id', null);
            return { voucher_export: result };
        } catch (error) {
            throw error;
        }
    }

    async voucherRedemptionReport(param) {
        let paramBody = param.body;
        let currentUser = param.decoded;
        let pageSize = paramBody.pageSize,
            pageNumber = paramBody.pageNumber,
            sortField = paramBody.sortField,
            sortOrder = paramBody.sortOrder,
            sLimit = '',
            sWhere = '',
            sWhereMcoup = '';

        let userFilter = `cl.merchant_id = ${currentUser.merchant_id} AND (cl.sub_merchant_id = ${currentUser.sub_merchant_id} OR cl.sub_merchant_id IS NULL) AND cl.is_loyalty_user = 1 AND co.processed = 1 `;

        // filters
        if (Object.keys(paramBody.filter).length > 0) {
            let filters = paramBody.filter;

            Object.keys(filters).forEach(function (key) {
                if (key == 'mobile_number') {
                    sWhere += ` AND cl.mobile_number LIKE '${filters[key]}%' `;
                } else if (key == 'customer_name') {
                    sWhere += ` AND (cl.first_name LIKE '${filters[key]}%' OR cl.last_name LIKE '${filters[key]}%') `;
                } else if (key == 'from_date') {
                    sWhere += ` AND co.order_date >= '${filters[key]}' `;
                } else if (key == 'to_date') {
                    sWhere += ` AND co.order_date <= '${filters[key]}' `;
                } else if (typeof filters[key] == 'number') {
                    sWhere += ' AND ' + key + ' = ' + filters[key];
                } else {
                    sWhere += ' AND ' + key + ' LIKE "' + filters[key] + '%"';
                }
            });
            sWhere = sWhere.replace("voucher_name", "mlpm.milestone_name");
            sWhereMcoup = sWhere.replace("mlpm.milestone_name", "mcamp.campaign_title");
            sWhereMcoup = sWhereMcoup.replace("voucher_code", "mcou.coupon_code");
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
        * Paging
        */
        sLimit = "LIMIT 10";
        if (pageSize && pageNumber !== -1) {
            const offset = (pageNumber - 1) * pageSize;
            sLimit = `LIMIT ${pageSize} OFFSET ${offset}`;
        }

        let sQuery = `(SELECT
            cm.voucher_code,
            cm.coupon_used,
            cm.voucher_value,
            cl.first_name,
            cl.last_name,
            CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name,
            cl.mobile_number,
            co.order_number,
            co.calculated_amount,
            co.location_id,
            co.order_date,
            sml.location_name,
            mlpm.milestone_name AS voucher_name
        FROM
            customer_milestones cm
                LEFT JOIN
            merchant_loyalty_program_milestones mlpm ON mlpm.id = cm.milestone_id
                LEFT JOIN
            customer_loyalty cl ON cl.id = cm.customer_loyalty_id
                LEFT JOIN
            customer_orders co ON co.voucher_applied = cm.voucher_code
                LEFT JOIN
            sub_merchant_locations sml ON sml.id = co.location_id
        WHERE ${userFilter} AND cm.coupon_used = 1 sWhere
        )
        UNION
        (SELECT
            mcou.coupon_code AS voucher_code,
            mcou.coupon_used,
            0,
            cl.first_name,
            cl.last_name,
            CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name,
            cl.mobile_number,
            co.order_number,
            co.calculated_amount,
            co.location_id,
            co.order_date,
            sml.location_name,
            mcamp.campaign_title AS voucher_name
        FROM
            merchant_coupons mcou
                LEFT JOIN
            merchant_campaigns mcamp ON mcamp.id = mcou.merchant_campaigns_id
                LEFT JOIN
            customer_loyalty cl ON cl.id = mcou.customer_loyalty_id
                LEFT JOIN
            customer_orders co ON co.voucher_applied = mcou.coupon_code
                LEFT JOIN
            sub_merchant_locations sml ON sml.id = co.location_id
        WHERE ${userFilter} AND mcou.coupon_used = 1 sWhereMcoup
        ) `;

        //query to get snapshot
        let sQueryCheck = sQuery;
        sQueryCheck = sQueryCheck.replace("sWhere", '');
        sQueryCheck = sQueryCheck.replace("sWhereMcoup", '');
        const snapshotQuery = `SELECT COUNT(*) AS total, IFNULL(ROUND(SUM(calculated_amount), 2), 0) AS total_amount, IFNULL(ROUND(AVG(calculated_amount), 2), 0) AS avg_amount, MAX(calculated_amount) AS max_amount FROM (${sQueryCheck}) AS test`;

        sQuery = sQuery.replace("sWhere", sWhere);
        sQuery = sQuery.replace("sWhereMcoup", sWhereMcoup);

        //query to get total count without order and limit
        const countQuery = `SELECT COUNT(*) AS total FROM (${sQuery}) AS test`;
        sQuery += `${sOrder} `;
        sQuery += `${sLimit} `;

        let havingCountQuery = '';
        const queryParam: DataTableQueryParam = {
            tableQuery: sQuery,
            countQuery: countQuery,
            havingCountQuery: havingCountQuery,
            bindingParams: []
        };

        const data = await sharedRepository.dataTableQuery(queryParam);

        // Get voucher redemption report snapshot or summary
        /* if (data.total > 0) {
            let result = await pool.query(snapshotQuery, []);
            if (result) {
                data['report_snapshot'] = result[0];
            } else {
                data['report_snapshot'] = '';
            }
        } */
        return data;
    }

    // Get transaction report snapshot or summary
    async getTransactionSnapshot(currentUser) {
        try {
            const result = await pool.query(`SELECT COUNT(co.id) AS total, IFNULL(ROUND(SUM(co.calculated_amount), 2), 0) AS total_amount, IFNULL(ROUND(AVG(co.calculated_amount), 2), 0) AS avg_amount, IFNULL(ROUND(MAX(co.calculated_amount), 2), 0) AS max_amount
            FROM customer_orders co
            LEFT JOIN customer_loyalty cl ON co.customer_loyalty_id = cl.id
            WHERE cl.merchant_id = ? AND (cl.sub_merchant_id = ? OR cl.sub_merchant_id IS NULL) AND cl.is_loyalty_user = ? AND co.processed = ?`, [currentUser.merchant_id, currentUser.sub_merchant_id, 1, 1]);
            if (result) {
                return result[0];
            } else {
                return '';
            }
        } catch (error) {
            throw error;
        }
    }

    // Get voucher redemption report snapshot or summary
    async getVoucherRedemptionSnapshot(currentUser) {
        try {
            const userFilter = `cl.merchant_id = ${currentUser.merchant_id} AND (cl.sub_merchant_id = ${currentUser.sub_merchant_id} OR cl.sub_merchant_id IS NULL) AND cl.is_loyalty_user = 1 AND co.processed = 1 `;
            let sQuery = `(SELECT
                cm.voucher_code,
                cm.coupon_used,
                cm.voucher_value,
                cl.first_name,
                cl.last_name,
                CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name,
                cl.mobile_number,
                co.order_number,
                co.calculated_amount,
                co.location_id,
                co.order_date,
                sml.location_name,
                mlpm.milestone_name AS voucher_name
            FROM
                customer_milestones cm
                    LEFT JOIN
                merchant_loyalty_program_milestones mlpm ON mlpm.id = cm.milestone_id
                    LEFT JOIN
                customer_loyalty cl ON cl.id = cm.customer_loyalty_id
                    LEFT JOIN
                customer_orders co ON co.voucher_applied = cm.voucher_code
                    LEFT JOIN
                sub_merchant_locations sml ON sml.id = co.location_id
            WHERE ${userFilter} AND cm.coupon_used = 1
            )
            UNION
            (SELECT
                mcou.coupon_code AS voucher_code,
                mcou.coupon_used,
                0,
                cl.first_name,
                cl.last_name,
                CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name,
                cl.mobile_number,
                co.order_number,
                co.calculated_amount,
                co.location_id,
                co.order_date,
                sml.location_name,
                mcamp.campaign_title AS voucher_name
            FROM
                merchant_coupons mcou
                    LEFT JOIN
                merchant_campaigns mcamp ON mcamp.id = mcou.merchant_campaigns_id
                    LEFT JOIN
                customer_loyalty cl ON cl.id = mcou.customer_loyalty_id
                    LEFT JOIN
                customer_orders co ON co.voucher_applied = mcou.coupon_code
                    LEFT JOIN
                sub_merchant_locations sml ON sml.id = co.location_id
            WHERE ${userFilter} AND mcou.coupon_used = 1
            ) `;

            const snapshotQuery = `SELECT COUNT(*) AS total, IFNULL(ROUND(SUM(calculated_amount), 2), 0) AS total_amount, IFNULL(ROUND(AVG(calculated_amount), 2), 0) AS avg_amount, IFNULL(ROUND(MAX(calculated_amount), 2), 0) AS max_amount FROM (${sQuery}) AS test`;
            const result = await pool.query(snapshotQuery, []);
            if (result) {
                return result[0];
            } else {
                return '';
            }
        } catch (error) {
            throw error;
        }
    }
}