import pool from '../../database/database-connection';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';

export default class MobileNumberChangeCronRepository {


    //Mobile Number change Cron Job running

    async callMobileNumberChange() {
        const spStatus = await pool.query(`CALL customerMobileChange();`, '').then((result: ResultSetHeader) => result);
        // console.log(spStatus);
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error loq Quantity');
        }
        <SpResponse>spStatus[0][0]['response'];
        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        //console.log('in repo',selectResut);
        // const allowStatusCode = [200];
        return { error: null, response: selectResut };

    }

    async callVoucherLowQuantity() {
        const spStatus = await pool.query(`CALL lowQuantityCoupons();`, '').then((result: ResultSetHeader) => result);
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error loq Quantity');
        }
        <SpResponse>spStatus[0][0]['response'];
        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        // console.log('in repo',selectResut);
        // const allowStatusCode = [200];
        return { error: null, response: selectResut };
    }



}
