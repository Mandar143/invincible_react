DELIMITER $$
DROP PROCEDURE IF EXISTS `checkCampaignAvailability`$$
CREATE PROCEDURE `checkCampaignAvailability`(IN inputData JSON, OUT response JSON)
checkCampaignAvailability:BEGIN

DECLARE rewardType,targetCustomer,type,campaignUse,rewardTypeYValueUnit,custGender,transUse,
        transUseType,platform,custTestOrControl,couponFor TINYINT(1) DEFAULT 0;
DECLARE campaignUseValue TINYINT(2) DEFAULT 0;
DECLARE bonusPoints,rewardTypeYValue,usedCouponPercentage DECIMAL(10,2) DEFAULT 0;
DECLARE campaignTitle VARCHAR(255);
DECLARE merchantCampaignId,merCampRewValId,logInsertedId,currentTierId,campaignId,brand_ID,category_ID,
        location_ID,rewardTypeXValue,merchantCouponsId,merchantCouponValuesId,campaignCategoryId,merchantId,
        loyaltyId,customerLoyaltyId,createdBy,couponCodeId,genCouCodeResStatusCode INTEGER(10) DEFAULT 0;
DECLARE expiryDate,dateToCheck,custCreatedAt,rewardStartDate,rewardEndDate,couponValidity DATE;
DECLARE logCount,targetCustomerCount,issuedCouponCount TINYINT(3) DEFAULT 0;
DECLARE targetCustomerValue VARCHAR(1000) DEFAULT 0;
DECLARE rewardTypeExpireValue VARCHAR(10) DEFAULT 0;
DECLARE allowedPlatform VARCHAR(4) DEFAULT '';
DECLARE couponCode,genericCouponCode,couponValue VARCHAR(20) DEFAULT NULL;
DECLARE couponQty INTEGER(10) DEFAULT 1;
DECLARE generateCouponRequest,generateCouponCodeResponse,generateCouponCodeData JSON;

SET dateToCheck = CURDATE();

    -- check input data is valid or not
    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SET response = JSON_OBJECT('status','FAILURE','message','Please provide valid data.','data',JSON_OBJECT(),'statusCode',520);
        LEAVE checkCampaignAvailability;
    ELSE
        SET campaignCategoryId = JSON_EXTRACT(inputData,'$.campaign_category_id');
        SET merchantId = JSON_EXTRACT(inputData,'$.merchant_id');
        SET loyaltyId = JSON_EXTRACT(inputData,'$.loyalty_id');
        SET customerLoyaltyId = JSON_EXTRACT(inputData,'$.customer_loyalty_id');

        IF JSON_EXTRACT(inputData,'$.cust_test_or_control') THEN
            SET custTestOrControl = JSON_EXTRACT(inputData,'$.cust_test_or_control');
        END IF;

        SELECT
        mcamp.id, mcamp.campaign_id, mcamp.campaign_title, mcamp.campaign_use, mcamp.campaign_use_value, mcamp.target_customer, mcamp.target_customer_value, mcamp.type, mcamp.coupon_code, mcamp.allowed_platform, mcamp.transaction_use, mcamp.transaction_use_type, mcamp.created_by,
        mcrv.id, mcrv.location_id, mcrv.category_id, mcrv.brand_id, mcrv.reward_type, mcrv.reward_type_x_value, mcrv.reward_type_y_value, mcrv.reward_type_y_value_unit, mcrv.reward_type_expire_value, mcrv.reward_start_date, mcrv.reward_end_date
        INTO
        merchantCampaignId, campaignId,	campaignTitle, campaignUse, campaignUseValue, targetCustomer, targetCustomerValue, type, genericCouponCode, allowedPlatform, transUse, transUseType, createdBy,
        merCampRewValId, location_ID, category_ID, brand_ID, rewardType, rewardTypeXValue, rewardTypeYValue, rewardTypeYValueUnit, rewardTypeExpireValue, rewardStartDate, rewardEndDate
        FROM merchant_campaigns AS mcamp
        JOIN merchant_campaign_reward_values AS mcrv ON mcamp.id = mcrv.merchant_campaigns_id
        WHERE mcamp.campaign_category_id = campaignCategoryId AND mcamp.merchant_id = merchantId AND mcamp.loyalty_id = loyaltyId AND mcamp.status = 1 AND mcamp.campaign_start_date <= dateToCheck AND mcamp.campaign_end_date >= dateToCheck
        ORDER BY mcamp.priority LIMIT 1 OFFSET 0;

        -- SET response = JSON_OBJECT('merchantCampaignId',merchantCampaignId);
        -- LEAVE checkCampaignAvailability;

        IF merchantCampaignId != 0 THEN

            -- check campaign use
            IF campaignUse = 1 AND ((SELECT COUNT(*) FROM merchant_coupons WHERE customer_loyalty_id = customerLoyaltyId AND merchant_campaigns_id = merchantCampaignId) >= campaignUseValue) THEN
                SET response = JSON_OBJECT('status','FAILURE','message','Campaign use count is exceeded.','data',JSON_OBJECT(),'statusCode',102);
                LEAVE checkCampaignAvailability;
            END IF;

            -- check campaign coupon type
            IF type = 2 THEN
                SET couponCode = genericCouponCode;
            ELSE
                IF campaignCategoryId = 5 THEN
                    SET couponFor = 6;
                ELSE
                    SET couponFor = 7;
                END IF;

                SET generateCouponRequest = JSON_OBJECT('coupon_for',couponFor);
                CALL generateCouponCode(generateCouponRequest, generateCouponCodeResponse);
                SET genCouCodeResStatusCode = JSON_EXTRACT(generateCouponCodeResponse,'$.statusCode');

                -- IF coupon is not present
                IF genCouCodeResStatusCode != 200 THEN
                    SET response = JSON_OBJECT('status','FAILURE','message','Coupon is out of stock.','data',JSON_OBJECT(),'statusCode', 103);
                    LEAVE checkCampaignAvailability;
                END IF;

                SET generateCouponCodeData = JSON_EXTRACT(generateCouponCodeResponse,'$.data');
                SET couponCode = JSON_UNQUOTE(JSON_EXTRACT(generateCouponCodeData,'$.coupon_code'));
                SET couponCodeId = JSON_EXTRACT(generateCouponCodeData,'$.coupon_code_id');
                SET couponValidity = JSON_UNQUOTE(JSON_EXTRACT(generateCouponCodeData,'$.coupon_validity'));
                SET couponValue = JSON_UNQUOTE(JSON_EXTRACT(generateCouponCodeData,'$.coupon_value'));

            END IF;

            START TRANSACTION;

            /* IF rewardTypeExpireValue > 0 THEN
                SET rewardStartDate = CURDATE();
                SET rewardEndDate = DATE_ADD(CURDATE(), INTERVAL rewardTypeExpireValue DAY);
            END IF; */

            -- set coupon validity
            SET rewardStartDate = CURDATE();
            SET rewardEndDate = couponValidity;

            -- insert into merchant coupons
			INSERT INTO merchant_coupons (
				merchant_campaigns_id, merchant_campaign_reward_values_id, customer_loyalty_id, coupon_code, coupon_start_date, coupon_end_date, created_by, test_control
			) VALUES (
			    merchantCampaignId, merCampRewValId, customerLoyaltyId, couponCode, rewardStartDate, rewardEndDate, createdBy, custTestOrControl
			);

            /* IF LAST_INSERT_ID() = 0 THEN
                ROLLBACK;
                SET response = JSON_OBJECT('status','SUCCESS','message','Coupon is not assigned.','data',JSON_OBJECT(),'statusCode',104);
                LEAVE checkCampaignAvailability;
            ELSE
                COMMIT; */

                -- update pre_populated_coupons for coupon assigned successfully
                UPDATE pre_populated_coupons SET coupon_used = 1 WHERE id = couponCodeId;
                IF ROW_COUNT() > 0 THEN
                    COMMIT;
                ELSE
                    ROLLBACK;
                    SET response = JSON_OBJECT('status','SUCCESS','message','Coupon is not assigned.','data',JSON_OBJECT(),'statusCode',104);
                    LEAVE checkCampaignAvailability;
                END IF;

                -- get used coupon percentage based on coupon_for
                SELECT ((SELECT COUNT(*) FROM pre_populated_coupons WHERE coupon_for = couponFor AND coupon_used = 1 AND status = 1) / (SELECT COUNT(*) FROM pre_populated_coupons WHERE coupon_for = couponFor AND status = 1) * 100) INTO usedCouponPercentage;

                SET response = JSON_OBJECT('status','SUCCESS', 'message','Coupon assigned successfully.','data',JSON_OBJECT('statusCode',200,'usedCouponPercentage',usedCouponPercentage,'customerLoyaltyId',customerLoyaltyId,'campaignTitle',campaignTitle,'campaignId',merchantCampaignId,'couponCode',couponCode,'couponValidity',couponValidity,'couponValue',couponValue),'statusCode',200);
                LEAVE checkCampaignAvailability;
            -- END IF;
        ELSE
            SET response = JSON_OBJECT('status','SUCCESS','message','Record not found.','data',JSON_OBJECT(),'statusCode',101);
            LEAVE checkCampaignAvailability;
        END IF;

    END IF;

END$$
DELIMITER ;