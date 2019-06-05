DELIMITER $$
DROP PROCEDURE IF EXISTS userLoyaltyCalculation$$
CREATE PROCEDURE userLoyaltyCalculation(IN lastId INT, IN inMobileNumber VARCHAR(20),OUT finalOutPut JSON)
    userLoyaltyCalculation:BEGIN
        -- VARIAABLE DECLARATION START
        DECLARE orderNotFound, orderId, subMerchantId, customerId, locationId, merchantId, currentMilestoneId, loyaltyId, emailVerified, mobileVerified INTEGER DEFAULT 0;
        DECLARE orderDate, lastLoyaltyResetDate DATE DEFAULT NULL;
        DECLARE firstName,emailAddress,saleType, orderNumber, voucherApplied, storeCode, mobileNumber VARCHAR (20) DEFAULT '';
        DECLARE orderAmount, calculatedAmount,currentPurchaseValue DECIMAL(14,2) DEFAULT 0.00;
        DECLARE outputData JSON DEFAULT JSON_ARRAY();
        DECLARE userGender, isLoyaltyUser, optOutFromSmsStatus, optOutFromEmailStatus TINYINT DEFAULT 0;
        -- VARIABLE DECLARATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        -- CURSOR DECLARATION START
        DECLARE customerOrderCursor CURSOR FOR 
        SELECT id, customer_loyalty_id, location_id, merchant_id, order_date, order_number, order_amount, calculated_amount, voucher_applied, 
        store_code, mobile_number
        FROM customer_orders
        WHERE processed = 0 AND mobile_number != '' 
        AND communication_sent = 0
        AND DATE_FORMAT(created_at,'%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
        AND IF(inMobileNumber != '', mobile_number = inMobileNumber,1=1)
        AND IF(lastId != 0,id > lastId,1=1) 
        ORDER BY id ASC LIMIT 1000;

        DECLARE CONTINUE HANDLER FOR NOT FOUND SET orderNotFound = 1;
        -- CURSOR DECLARATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        -- CURSOR ITERATION START
        START TRANSACTION;
        OPEN customerOrderCursor;
            getOrders: LOOP
                FETCH customerOrderCursor INTO orderId, customerId, locationId, merchantId, orderDate, orderNumber, orderAmount, calculatedAmount, voucherApplied, storeCode, mobileNumber;
                IF orderNotFound = 1 THEN 
                    LEAVE getOrders;
                END IF;
                IF locationId = 0 THEN
                    IF storeCode != '' THEN
                        SET locationId = (SELECT id FROM sub_merchant_locations WHERE store_code = storeCode);
                    END IF;
                END IF;              
                SET subMerchantId = (SELECT sub_merchant_id FROM sub_merchant_locations WHERE id = locationId);
                IF customerId != 0 THEN
                    SELECT current_milestone_id, loyalty_id, first_name, email_address, mobile_number, email_verified, mobile_verified, IFNULL(current_purchase_value,0), is_loyalty_user,last_loyalty_reset_date, opt_out_from_sms_status, opt_out_from_email_status
                    INTO currentMilestoneId, loyaltyId, firstName, emailAddress, mobileNumber, emailVerified, mobileVerified, currentPurchaseValue, isLoyaltyUser, lastLoyaltyResetDate, optOutFromSmsStatus, optOutFromEmailStatus
                    FROM customer_loyalty WHERE id = customerId;
                    IF isLoyaltyUser = 1 THEN
                        SET currentPurchaseValue = currentPurchaseValue + calculatedAmount;
                        IF currentMilestoneId = (SELECT id FROM merchant_loyalty_program_milestones WHERE loyalty_id = loyaltyId AND milestone_reach_at = (SELECT MAX(milestone_reach_at) FROM merchant_loyalty_program_milestones WHERE loyalty_id = loyaltyId))  THEN
                            SET lastLoyaltyResetDate = CURDATE();
                            SET currentPurchaseValue = currentPurchaseValue - (SELECT MAX(milestone_reach_at) FROM merchant_loyalty_program_milestones WHERE loyalty_id = loyaltyId);
                            SET currentMilestoneId = 1;
                        END IF;
                        IF EXISTS (SELECT id FROM merchant_loyalty_program_milestones WHERE id > currentMilestoneId AND milestone_reach_at <= currentPurchaseValue) THEN
                            milestoneBlock: BEGIN
                                DECLARE couponId,milestoneId,milestoneNotFound,milestoneSequence INTEGER DEFAULT 0;
                                DECLARE milestoneReachAt,milestoneBenefit BIGINT DEFAULT 0;
                                DECLARE couponCode VARCHAR(20) DEFAULT '';
                                DECLARE couponValidity DATE DEFAULT NULL;
                                DECLARE couponInput,couponData JSON DEFAULT JSON_OBJECT();
                                DECLARE milestoneCursor CURSOR FOR
                                SELECT id, milestone_reach_at, milestone_benefit_value,sequence FROM merchant_loyalty_program_milestones WHERE id > currentMilestoneId AND loyalty_id = loyaltyId AND milestone_reach_at <= currentPurchaseValue;
                                DECLARE CONTINUE HANDLER FOR NOT FOUND SET milestoneNotFound = 1;

                                OPEN milestoneCursor;
                                    getMilestones: LOOP
                                        FETCH milestoneCursor INTO milestoneId,milestoneReachAt,milestoneBenefit,milestoneSequence;
                                        IF milestoneNotFound = 1 THEN 
                                            LEAVE getMilestones;
                                        END IF;
                                        SET couponInput = JSON_OBJECT('coupon_for',(milestoneSequence - 1));
                                        CALL generateCouponCode(couponInput,couponData);
                                        IF couponData IS NOT NULL AND JSON_VALID(couponData) = 1 THEN
                                            SET couponId = JSON_EXTRACT(couponData,'$.data.coupon_code_id');
                                            SET couponCode = JSON_UNQUOTE(JSON_EXTRACT(couponData,'$.data.coupon_code'));
                                            SET couponValidity = JSON_UNQUOTE(JSON_EXTRACT(couponData,'$.data.coupon_validity'));
                                        END IF;
                                        IF couponValidity IS NOT NULL THEN
                                            INSERT INTO customer_milestones (customer_loyalty_id, merchant_id, loyalty_id, milestone_id, voucher_value, purchase_value, voucher_code, date_earned, expiry_date, created_by) 
                                            VALUES (customerId,merchantId,loyaltyId,milestoneId,milestoneBenefit,milestoneReachAt,couponCode,CURDATE(),couponValidity,1);
                                        END IF;
                                        IF LAST_INSERT_ID() > 0 AND couponId != 0 THEN
                                            SET currentMilestoneId = milestoneId;
                                            UPDATE pre_populated_coupons SET coupon_used = 1 WHERE id = couponId;
                                            IF inMobileNumber != '' THEN
                                                SET outputData = JSON_ARRAY_APPEND(outputData,'$',JSON_OBJECT('first_name',firstName,'email_address',emailAddress,'email_verified',emailVerified,'mobile_number',mobileNumber,'mobile_verified',mobileVerified,'opt_out_from_sms_status',optOutFromSmsStatus,'opt_out_from_email_status',optOutFromEmailStatus,'voucher_value',milestoneBenefit,'milestoneNo',(milestoneSequence - 1),'coupon_code',couponCode,'coupon_validity',couponValidity,'message_type',0,'total_purchase',currentPurchaseValue,'update_date',DATE_ADD(CURDATE(), INTERVAL 2 DAY)));

                                                INSERT INTO send_user_loyalty_communication (order_id, first_name, email_address, email_verified, mobile_number, mobile_verified, opt_out_from_sms_status, opt_out_from_email_status, total_purchase, coupon_code, voucher_value, coupon_validity, milestone_no, update_date, message_type, is_from_register) 
                                                VALUES (orderId, firstName, emailAddress, emailVerified, mobileNumber, mobileVerified, optOutFromSmsStatus, optOutFromEmailStatus, currentPurchaseValue, couponCode, milestoneBenefit, couponValidity, (milestoneSequence - 1), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 0, 1);
                                            ELSE
                                                INSERT INTO send_user_loyalty_communication (order_id, first_name, email_address, email_verified, mobile_number, mobile_verified, opt_out_from_sms_status, opt_out_from_email_status, total_purchase, coupon_code, voucher_value, coupon_validity, milestone_no, update_date, message_type) 
                                                VALUES (orderId, firstName, emailAddress, emailVerified, mobileNumber, mobileVerified, optOutFromSmsStatus, optOutFromEmailStatus, currentPurchaseValue, couponCode, milestoneBenefit, couponValidity, (milestoneSequence - 1), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 0);
                                            END IF;
                                        END IF;
                                    END LOOP getMilestones;
                                CLOSE milestoneCursor;
                            END milestoneBlock;
                        END IF;
                        UPDATE customer_loyalty 
                        SET sub_merchant_id = IF((sub_merchant_id = 0 OR sub_merchant_id IS NULL),subMerchantId,sub_merchant_id), current_milestone_id = currentMilestoneId, home_branch_id = IF((home_branch_id = 0 OR home_branch_id IS NULL),locationId,home_branch_id), 
                        current_purchase_value = currentPurchaseValue, last_loyalty_reset_date = lastLoyaltyResetDate WHERE id = customerId;

                        UPDATE customer_orders SET processed = 1 WHERE id = orderId;
                    END IF;
                ELSE
                     IF JSON_SEARCH(outputData, 'one', mobileNumber) IS NULL THEN
                        SELECT SUM(calculated_amount)
                        INTO @totalPurchase
                        FROM customer_orders
                        WHERE processed = 0 AND mobile_number = mobileNumber 
                        AND DATE_FORMAT(created_at,'%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL 2 DAY);

                        INSERT INTO send_user_loyalty_communication (order_id, first_name, email_address, email_verified, mobile_number, mobile_verified, opt_out_from_sms_status, opt_out_from_email_status, total_purchase, coupon_code, voucher_value, coupon_validity, milestone_no, update_date, message_type) 
                        VALUES (orderId, '', '', 0, mobileNumber, 1, 0, 0, @totalPurchase, '', 0, NULL, 0, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1);
                                            
                    END IF;
                END IF;
            END LOOP getOrders;
        CLOSE customerOrderCursor;
        -- CURSOR ITERATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------        
        COMMIT;
        SET finalOutPut = JSON_OBJECT('status','SUCCESS','message','Loyalty calculations done successfully','data',outputData,'statusCode',200,'lastId',orderId);
    END$$
DELIMITER ;