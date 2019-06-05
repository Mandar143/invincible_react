DELIMITER $$
DROP PROCEDURE IF EXISTS `customersEligibleForBdayAnnCampaign`$$
/* CREATE PROCEDURE `customersEligibleForBdayAnnCampaign`(IN campaignId INT, OUT response JSON)
customersEligibleForBdayAnnCampaign:BEGIN

DECLARE notFound,customerLoyaltyId,counts INTEGER DEFAULT 0;
DECLARE campaignRequest JSON;

        -- CURSOR DECLARATION START
        DECLARE customers_cursor CURSOR FOR
            SELECT
            cl.id

            FROM merchant_campaigns AS mcamp

            JOIN merchant_campaign_reward_values AS mcrv
            ON mcamp.id = mcrv.merchant_campaigns_id
            JOIN customer_loyalty cl
            ON cl.merchant_id = mcamp.merchant_id
            AND cl.loyalty_id = mcamp.loyalty_id

            WHERE mcamp.campaign_id = 11
            AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
            AND cl.status = 1
            -- AND cl.registered_from = mcrv.platform
            AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
            AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY));

        DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
        -- CURSOR DECLARATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        -- CURSOR ITERATION START
        OPEN customers_cursor;
            get_orders: LOOP
                FETCH customers_cursor INTO customerLoyaltyId;

                IF notFound = 1 THEN
                    -- SET response = JSON_OBJECT('status', 'FAILURE');
                    -- LEAVE customersEligibleForBdayAnnCampaign;
                    LEAVE get_orders;
                END IF;

                SET campaignRequest = JSON_OBJECT('campaign_category_id',4,'merchant_id',1,'loyalty_id',1,'customer_loyalty_id',customerLoyaltyId,'platform',3);
                CALL checkCampaignAvailability(campaignRequest, @campaignResponse);
                SET response = JSON_OBJECT('output', @campaignResponse);
                LEAVE customersEligibleForBdayAnnCampaign;
            END LOOP get_orders;
        CLOSE customers_cursor;
        -- CURSOR ITERATION END

        SET response = JSON_OBJECT('counts', counts);
        LEAVE customersEligibleForBdayAnnCampaign; */

CREATE PROCEDURE `customersEligibleForBdayAnnCampaign`(IN inputData JSON)
customersEligibleForBdayAnnCampaign:BEGIN

DECLARE campaignTitle VARCHAR (255) DEFAULT NULL;
DECLARE campaignId,customerCount,setLimit,merCampaignId INTEGER DEFAULT 0;
DECLARE isTestControl TINYINT (1) DEFAULT 0;
DECLARE campaignTest,campaignControl FLOAT (14,2) DEFAULT 0;
DECLARE campaignStartDate,campaignEndDate DATE DEFAULT NULL;
DECLARE campaignData JSON DEFAULT JSON_OBJECT();

    SET campaignId = JSON_EXTRACT(inputData, '$.campaign_id');

    -- check input data is valid or not
    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SELECT JSON_OBJECT('status','FAILURE','message','Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) as response;
        LEAVE customersEligibleForBdayAnnCampaign;
    ELSE
        -- Get campaign details
        SELECT mcamp.id,mcamp.campaign_title,mcamp.campaign_start_date,mcamp.campaign_end_date,mcamp.is_test_control,mcamp.campaign_test,mcamp.campaign_control
        INTO merCampaignId,campaignTitle,campaignStartDate,campaignEndDate,isTestControl,campaignTest,campaignControl
        FROM merchant_campaigns AS mcamp
        WHERE mcamp.status = 1 AND mcamp.campaign_id = campaignId;

        IF merCampaignId > 0 THEN
            SELECT JSON_OBJECT('status','FAILURE','message','No record found.','data',JSON_OBJECT(),'statusCode',104) as response;
            LEAVE customersEligibleForBdayAnnCampaign;
        END IF;

        SET campaignData = JSON_OBJECT('id',merCampaignId,'campaign_title',campaignTitle,'campaign_start_date',campaignStartDate,
        'campaign_end_date',campaignEndDate,'is_test_control',isTestControl,'campaign_test',campaignTest,'campaign_control',campaignControl);

        IF isTestControl = 1 THEN

            -- Get customer count
            SELECT COUNT(*) INTO customerCount FROM merchant_campaigns AS mcamp

            JOIN merchant_campaign_reward_values AS mcrv
            ON mcamp.id = mcrv.merchant_campaigns_id
            JOIN customer_loyalty cl
            ON cl.merchant_id = mcamp.merchant_id
            AND cl.loyalty_id = mcamp.loyalty_id

            WHERE mcamp.campaign_id = campaignId
            AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
            AND cl.status = 1
            AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
            AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY));

            IF customerCount > 0 THEN
                SET setLimit = ROUND((campaignTest * customerCount) / 100);
                SET setLimit = IF(setLimit = 0, 1, IF(setLimit = customerCount, setLimit - 1, setLimit));

                SELECT
                cl.id AS cl_id,cl.merchant_id AS cl_merchant_id,cl.sub_merchant_id AS cl_sub_merchant_id,cl.loyalty_id AS cl_loyalty_id,cl.first_name,cl.last_name,cl.mobile_number,cl.email_address,cl.registered_from,
                cl.date_of_birth,cl.anniversary_date,
                mcamp.id,mcamp.merchant_id,mcamp.loyalty_id,mcamp.campaign_title,mcamp.campaign_use,
                mcamp.campaign_use_value,mcamp.target_customer,mcamp.target_customer_value,mcamp.is_test_control,mcamp.campaign_test,mcamp.campaign_control,
                mcrv.platform,mcrv.reward_type,mcrv.reward_type_x_value,mcrv.reward_type_y_value,
                mcrv.reward_type_y_value_unit,mcrv.reward_type_expire_value

                FROM merchant_campaigns AS mcamp

                JOIN merchant_campaign_reward_values AS mcrv
                ON mcamp.id = mcrv.merchant_campaigns_id
                JOIN customer_loyalty cl
                ON cl.merchant_id = mcamp.merchant_id
                AND cl.loyalty_id = mcamp.loyalty_id

                WHERE mcamp.campaign_id = campaignId
                AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
                AND cl.status = 1 AND cl.sub_merchant_id IS NOT NULL
                AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
                AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
                ORDER BY RAND() LIMIT setLimit;
            ELSE
                SELECT JSON_OBJECT('status','FAILURE','message','No record found.','data',JSON_OBJECT(),'statusCode',104) as response;
                LEAVE customersEligibleForBdayAnnCampaign;
            END IF;

        ELSE

            SELECT
            cl.id AS cl_id,cl.merchant_id AS cl_merchant_id,cl.sub_merchant_id AS cl_sub_merchant_id,cl.loyalty_id AS cl_loyalty_id,cl.first_name,cl.last_name,cl.mobile_number,cl.email_address,cl.registered_from,
            cl.date_of_birth,cl.anniversary_date,
            mcamp.id,mcamp.merchant_id,mcamp.loyalty_id,mcamp.campaign_title,mcamp.campaign_use,
            mcamp.campaign_use_value,mcamp.target_customer,mcamp.target_customer_value,mcamp.is_test_control,mcamp.campaign_test,mcamp.campaign_control,
            mcrv.platform,mcrv.reward_type,mcrv.reward_type_x_value,mcrv.reward_type_y_value,
            mcrv.reward_type_y_value_unit,mcrv.reward_type_expire_value

            FROM merchant_campaigns AS mcamp

            JOIN merchant_campaign_reward_values AS mcrv
            ON mcamp.id = mcrv.merchant_campaigns_id
            JOIN customer_loyalty cl
            ON cl.merchant_id = mcamp.merchant_id
            AND cl.loyalty_id = mcamp.loyalty_id

            WHERE mcamp.campaign_id = campaignId
            AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
            AND cl.status = 1 AND cl.sub_merchant_id IS NOT NULL
            AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
            AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY));

        END IF;
    END IF;

    /* CREATE TEMPORARY TABLE IF NOT EXISTS temp_table_one(
        cl_id INT,cl_merchant_id INT, cl_sub_merchant_id INT,cl_loyalty_id INT,cl_name VARCHAR (100),first_name VARCHAR (50),
        last_name VARCHAR (50),mobile_number VARCHAR (20),email_address VARCHAR (100),
        cl_counter INT,test_control TINYINT
    );

    CREATE TEMPORARY TABLE IF NOT EXISTS temp_table_two(
        cl_id INT,cl_merchant_id INT,cl_sub_merchant_id INT,cl_loyalty_id INT,cl_name VARCHAR (100),first_name VARCHAR (50),
        last_name VARCHAR (50),mobile_number VARCHAR (20),email_address VARCHAR (100),
        cl_counter INT,test_control TINYINT
    );

    INSERT INTO temp_table_one (
        SELECT
        cl.id AS cl_id,cl.merchant_id AS cl_merchant_id,cl.sub_merchant_id AS cl_sub_merchant_id,
        cl.loyalty_id AS cl_loyalty_id,CONCAT(cl.first_name, " ", cl.last_name),cl.first_name,cl.last_name,cl.mobile_number,cl.email_address,
        @counter := @counter +1 AS counter, IF(mcamp.is_test_control = 1, 1, 0)

        FROM (select @counter:=0) AS initvar, merchant_campaigns AS mcamp

        JOIN merchant_campaign_reward_values AS mcrv
        ON mcamp.id = mcrv.merchant_campaigns_id
        JOIN customer_loyalty cl
        ON cl.merchant_id = mcamp.merchant_id
        AND cl.loyalty_id = mcamp.loyalty_id

        WHERE IF(mcamp.is_test_control = 0, 1=1, @counter <= (mcamp.campaign_test/100 * @counter)) AND mcamp.campaign_id = campaignId
        AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
        AND cl.status = 1
        AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
        AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
        ORDER BY rand()
    );

    INSERT INTO temp_table_two (
        SELECT
        cl.id AS cl_id,cl.merchant_id AS cl_merchant_id,cl.sub_merchant_id AS cl_sub_merchant_id,
        cl.loyalty_id AS cl_loyalty_id,CONCAT(cl.first_name, " ", cl.last_name),cl.first_name,cl.last_name,cl.mobile_number,cl.email_address,
        0, IF(mcamp.is_test_control = 1, 2, 0)

        FROM merchant_campaigns AS mcamp

        JOIN merchant_campaign_reward_values AS mcrv
        ON mcamp.id = mcrv.merchant_campaigns_id
        JOIN customer_loyalty cl
        ON cl.merchant_id = mcamp.merchant_id
        AND cl.loyalty_id = mcamp.loyalty_id

        WHERE cl.id NOT IN (SELECT cl_id FROM temp_table_one) AND mcamp.campaign_id = campaignId
        AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
        AND cl.status = 1
        AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
        AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
        ORDER BY rand()
    );

    INSERT INTO temp_table_two (
        SELECT * FROM temp_table_one
    );

    SELECT * FROM temp_table_two;
    DROP TABLE IF EXISTS temp_table_one;
    DROP TABLE IF EXISTS temp_table_two; */


    /* SELECT
    cl.id AS cl_id,cl.merchant_id AS cl_merchant_id,cl.sub_merchant_id AS cl_sub_merchant_id,cl.loyalty_id AS cl_loyalty_id,cl.first_name,cl.last_name,cl.mobile_number,cl.email_address,cl.registered_from,
    cl.date_of_birth,cl.anniversary_date,
    mcamp.id,mcamp.merchant_id,mcamp.loyalty_id,mcamp.campaign_title,mcamp.campaign_use,
    mcamp.campaign_use_value,mcamp.target_customer,mcamp.target_customer_value,mcamp.is_test_control,mcamp.campaign_test,mcamp.campaign_control,
    mcrv.platform,mcrv.reward_type,mcrv.reward_type_x_value,mcrv.reward_type_y_value,
    mcrv.reward_type_y_value_unit,mcrv.reward_type_expire_value

    FROM merchant_campaigns AS mcamp

    JOIN merchant_campaign_reward_values AS mcrv
    ON mcamp.id = mcrv.merchant_campaigns_id
    JOIN customer_loyalty cl
    ON cl.merchant_id = mcamp.merchant_id
    AND cl.loyalty_id = mcamp.loyalty_id

    WHERE mcamp.campaign_id = campaignId
    AND mcamp.campaign_start_date <= CURDATE() AND mcamp.campaign_end_date >= CURDATE() AND mcamp.status = 1
    AND cl.status = 1
    -- AND cl.registered_from = mcrv.platform
    AND month(cl.date_of_birth) = month(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY))
    AND day(cl.date_of_birth) = day(DATE_ADD(CURDATE(), INTERVAL mcrv.reward_type_y_value DAY)); */

END$$
DELIMITER ;