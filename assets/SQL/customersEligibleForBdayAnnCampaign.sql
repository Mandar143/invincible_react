DELIMITER $$
DROP PROCEDURE IF EXISTS `customersEligibleForBdayAnnCampaign`$$
CREATE PROCEDURE `customersEligibleForBdayAnnCampaign`(IN inputData JSON)
customersEligibleForBdayAnnCampaign:BEGIN

DECLARE customerIdsControl,customerIdsTest VARCHAR (255) DEFAULT NULL;
DECLARE campaignId,customerCount,setLimit,merCampaignId INTEGER DEFAULT 0;
DECLARE isTestControl,notFound TINYINT (1) DEFAULT 0;
DECLARE campaignTest,campaignControl,rewardTypeYValue FLOAT (14,2) DEFAULT 0;
DECLARE campaignData,customerData JSON DEFAULT JSON_OBJECT();
DECLARE customerDataJsonArray JSON DEFAULT JSON_ARRAY();

    SET campaignId = JSON_EXTRACT(inputData,'$.campaign_id');

    -- check input data is valid or not
    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SELECT JSON_OBJECT('status','FAILURE','message','Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) as response;
        LEAVE customersEligibleForBdayAnnCampaign;
    ELSE
        -- Get campaign details
        SELECT
        JSON_OBJECT('id',mcamp.id,'campaign_title',mcamp.campaign_title,'campaign_start_date',mcamp.campaign_start_date,
        'campaign_end_date',mcamp.campaign_end_date,'is_test_control',mcamp.is_test_control,'campaign_test',mcamp.campaign_test,
        'campaign_control',mcamp.campaign_control,'reward_type_y_value',mcrv.reward_type_y_value)
        INTO campaignData
        FROM merchant_campaigns mcamp
        JOIN merchant_campaign_reward_values mcrv
        ON mcamp.id = mcrv.merchant_campaigns_id
        WHERE mcamp.campaign_id = campaignId AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1;

        -- Campaign is not present then leave
        IF JSON_LENGTH(campaignData) = 0 THEN
            SELECT JSON_OBJECT('status','FAILURE','message','No record found.','data',JSON_OBJECT(),'statusCode',104) as response;
            LEAVE customersEligibleForBdayAnnCampaign;
        END IF;

        SET merCampaignId = JSON_EXTRACT(campaignData,'$.id');
        SET rewardTypeYValue = JSON_EXTRACT(campaignData,'$.reward_type_y_value');
        SET isTestControl = JSON_EXTRACT(campaignData,'$.is_test_control');
        SET campaignControl = JSON_EXTRACT(campaignData,'$.campaign_control');
        SET campaignTest = JSON_EXTRACT(campaignData,'$.campaign_test');

        -- Get customer count
        SELECT COUNT(*) INTO customerCount
        FROM customer_loyalty cl
        WHERE cl.status = 1 AND cl.sub_merchant_id IS NOT NULL
        AND MONTH(cl.date_of_birth) = MONTH(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY))
        AND IF(rewardTypeYValue > 0,DAY(cl.date_of_birth) = DAY(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY)), 1=1);

        IF customerCount = 0 THEN
            SELECT JSON_OBJECT('status','FAILURE','message','No record found.','data',JSON_OBJECT(),'statusCode',104) as response;
            LEAVE customersEligibleForBdayAnnCampaign;
        END IF;

        IF isTestControl = 1 THEN

            -- SET LIMIT for test-control
            SET setLimit = ROUND((campaignControl * customerCount) / 100);
            SET setLimit = IF(setLimit = 0, 1, IF(setLimit = customerCount, setLimit - 1, setLimit));

            block1:BEGIN
                DECLARE customerDataCursor CURSOR FOR
                SELECT
                JSON_OBJECT('cl_id',cl.id,'cl_merchant_id',cl.merchant_id,'cl_sub_merchant_id',cl.sub_merchant_id,
                'cl_loyalty_id',cl.loyalty_id,'first_name',cl.first_name,'last_name',cl.last_name,'name',CONCAT(cl.first_name, ' ', cl.last_name),
                'mobile_number',cl.mobile_number,'mobile_verified',cl.mobile_verified,'email_address',cl.email_address,
                'email_verified',cl.email_verified,'date_of_birth',cl.date_of_birth,'opt_out_from_sms_status',cl.opt_out_from_sms_status,
                'opt_out_from_email_status',cl.opt_out_from_email_status,'test_control',2)
                FROM customer_loyalty cl

                WHERE cl.status = 1 AND cl.sub_merchant_id IS NOT NULL
                AND MONTH(cl.date_of_birth) = MONTH(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY))
                AND IF(rewardTypeYValue > 0,DAY(cl.date_of_birth) = DAY(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY)), 1=1)
                ORDER BY RAND() LIMIT setLimit;

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
                OPEN customerDataCursor;
                customerDataLoop: LOOP
                    FETCH customerDataCursor INTO customerData;
                    IF(notFound = 1) THEN
                        LEAVE customerDataLoop;
                    END IF;

                    IF customerIdsControl IS NULL THEN
                        SET customerIdsControl = JSON_EXTRACT(customerData,'$.cl_id');
                    ELSE
                        SET customerIdsControl = CONCAT(customerIdsControl,',',JSON_EXTRACT(customerData,'$.cl_id'));
                    END IF;
                    SET customerDataJsonArray = JSON_ARRAY_APPEND(customerDataJsonArray,'$',customerData);

                END LOOP customerDataLoop;
            END block1;

            -- test customers
            SELECT GROUP_CONCAT(cl.id) INTO customerIdsTest
            FROM customer_loyalty cl
            WHERE IF(customerIdsControl IS NOT NULL, FIND_IN_SET (cl.id, customerIdsControl) = false, 1=1) AND cl.status = 1 AND cl.sub_merchant_id IS NOT NULL
            AND MONTH(cl.date_of_birth) = MONTH(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY))
            AND IF(rewardTypeYValue > 0,DAY(cl.date_of_birth) = DAY(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY)), 1=1);

            INSERT INTO merchant_campaign_test_control_customers (merchant_campaigns_id,test_customers,control_customers,test_percentage,control_percentage,created_by)
            VALUES(merCampaignId,customerIdsTest,customerIdsControl,campaignTest,campaignControl,1);

            /* IF LAST_INSERT_ID() = 0 THEN
                ROLLBACK;
                SELECT JSON_OBJECT('status','SUCCESS','message','Customer records.','data',JSON_OBJECT('statusCode',200,'campaign_data',campaignData,'customer_data',customerDataJsonArray),'statusCode',200) as response;
                LEAVE customersEligibleForBdayAnnCampaign;
            ELSE
                COMMIT;
            END IF; */

            SELECT JSON_OBJECT('status','SUCCESS','message','Customer records.','data',JSON_OBJECT('statusCode',200,'campaign_data',campaignData,'customer_data',customerDataJsonArray),'statusCode',200) as response;
            LEAVE customersEligibleForBdayAnnCampaign;

        ELSE

            block1:BEGIN
                DECLARE customerDataCursor CURSOR FOR
                SELECT
                JSON_OBJECT('cl_id',cl.id,'cl_merchant_id',cl.merchant_id,'cl_sub_merchant_id',cl.sub_merchant_id,
                'cl_loyalty_id',cl.loyalty_id,'first_name',cl.first_name,'last_name',cl.last_name,'name',CONCAT(cl.first_name, ' ', cl.last_name),
                'mobile_number',cl.mobile_number,'mobile_verified',cl.mobile_verified,'email_address',cl.email_address,
                'email_verified',cl.email_verified,'date_of_birth',cl.date_of_birth,'opt_out_from_sms_status',cl.opt_out_from_sms_status,
                'opt_out_from_email_status',cl.opt_out_from_email_status,'test_control',0)
                FROM customer_loyalty cl

                WHERE cl.status = 1 AND cl.sub_merchant_id IS NOT NULL
                AND MONTH(cl.date_of_birth) = MONTH(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY))
                AND IF(rewardTypeYValue > 0,DAY(cl.date_of_birth) = DAY(DATE_ADD(CURDATE(), INTERVAL rewardTypeYValue DAY)), 1=1);

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
                OPEN customerDataCursor;
                customerDataLoop: LOOP
                    FETCH customerDataCursor INTO customerData;
                    IF(notFound = 1) THEN
                        LEAVE customerDataLoop;
                    END IF;

                    SET customerDataJsonArray = JSON_ARRAY_APPEND(customerDataJsonArray,'$',customerData);

                END LOOP customerDataLoop;
            END block1;

            SELECT JSON_OBJECT('status','SUCCESS','message','Customer records.','data',JSON_OBJECT('statusCode',200,'campaign_data',campaignData,'customer_data',customerDataJsonArray),'statusCode',200) as response;
            LEAVE customersEligibleForBdayAnnCampaign;

        END IF;
    END IF;

END$$
DELIMITER ;