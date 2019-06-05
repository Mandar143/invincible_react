import pool from '../../database/database-connection';


export default class MerchantdetailsRepository {

    //to get sub-merchant details by merchant id
    async findOneByMerchantId(merchant_id: number, callback: any) {
        try {
            let result = await pool.query('SELECT id, sub_merchant_name FROM sub_merchants WHERE status = 1 AND merchant_id = ?', [merchant_id]);
            return { merchant_list: result };
        } catch (error) {
            throw error;
        }
    }

    //to get sub-merchant locations by sub-merchant id
    async findOneBySubMerchantId(sub_merchant_id: number, callback: any) {
        try {
            let result = await pool.query('SELECT sml.id, sml.location_name, sml.store_code, sml.address_line1, sml.address_line2, sml.contact_name, sml.contact_telephone, sml.contact_mobile, sml.contact_email, sml.opening_date, cities.name as city_name, states.name as state_name FROM sub_merchant_locations sml LEFT JOIN states ON sml.state_id = states.id LEFT JOIN cities ON sml.city_id = cities.id WHERE sml.status = 1 AND sml.sub_merchant_id = ?', [sub_merchant_id]);
            return { merchant_location_list: result };
        } catch (error) {
            throw error;
        }
    }

    //to get locations by user entered string
    async findLocationSearchBy(search_keyword: string, search_by: number, callback: any) {
        try {
            let sql = `SELECT sml.id, sml.location_name, sml.address_line1, sml.contact_telephone, sml.contact_email, sml.contact_mobile, sml.store_code, sm.sub_merchant_name, sml.latitude, sml.longitude FROM sub_merchant_locations sml LEFT JOIN sub_merchants sm ON sml.sub_merchant_id = sm.id WHERE sml.status = 1 AND `;
            if (search_by == 3) {
                sql += `sml.state_name LIKE "${search_keyword}"`;
            } else if (search_by == 2) {
                sql += `sml.city_name LIKE "${search_keyword}"`;
            } else {
                sql += `sml.address_line1 LIKE "%${search_keyword}%"`;
            }
            let result = await pool.query(sql, null);
            return { location_list: result };
        } catch (error) {
            throw error;
        }
    }

    //get location by address or city_name or state_name
    async findLocation(search_keyword: string, search_by: number) {
        try {
            let aColumns = null;
            let aTable = null;
            let aSearchColumn = null;
            let sql = null;
            if (search_by == 3) {
                aColumns = ['id', 'state_name'];
                aTable = 'sub_merchant_locations';
                aSearchColumn = 'state_name';
            } else if (search_by == 2) {
                aColumns = ['id', 'city_name'];
                aTable = 'sub_merchant_locations';
                aSearchColumn = 'city_name';
            } else if (search_by == 1) {
                aColumns = ['id', 'address_line1'];
                aTable = 'sub_merchant_locations';
                aSearchColumn = 'address_line1';
            }

            if (!aColumns || !aTable || !aSearchColumn) {
                throw new Error('input data missing');
            }

            sql = `SELECT ?? FROM ?? WHERE status = 1 AND ?? LIKE ? Group by ??`

            let result = await pool.query(sql, [aColumns, aTable, aSearchColumn, `%${search_keyword}%`, aSearchColumn]);
            return { error: null, response: { location_list: result } };
        } catch (error) {
            throw error;
        }
    }

    async findSubMPosLocation(req) {
        try {
            const bodyParams = req.body;
            const sub_merchant_id = bodyParams.sub_merchant_id;
            const search_keyword = bodyParams.search_keyword;

            let aSearchColumn = null;
            let sql = null;
            aSearchColumn = 'location_name';

            sql = `SELECT id, location_name FROM sub_merchant_locations WHERE status = 1 AND sub_merchant_id = ? AND location_name LIKE ? Group by ??`
            let result = await pool.query(sql, [sub_merchant_id, `%${search_keyword}%`, aSearchColumn]);
            return { error: null, response: { location_list: result } };

        } catch (error) {
            throw error;
        }
    }
}