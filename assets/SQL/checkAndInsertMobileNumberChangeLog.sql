DELIMITER $$
DROP PROCEDURE IF EXISTS `checkAndInsertMobileNumberChangeLog`$$
CREATE PROCEDURE `checkAndInsertMobileNumberChangeLog`(IN `subMerchantId` INT, IN `customerLoyaltyId` INT, IN `existingMobileNumber` VARCHAR(15), IN `newMobileNumber` VARCHAR(15), IN `requestedFrom` TINYINT(1), IN `createdBy` INT)
checkAndInsertMobileNumberChangeLog:BEGIN

    IF EXISTS (SELECT id FROM customer_mobile_number_change_log WHERE customer_loyalty_id = customerLoyaltyId AND status = 1) THEN
		SELECT 'FAILURE' AS status, 'Previous request is in pending state.' AS message, 102 AS statusCode;
		LEAVE checkAndInsertMobileNumberChangeLog;
	ELSEIF EXISTS (SELECT id FROM customer_loyalty WHERE id = customerLoyaltyId AND mobile_number = existingMobileNumber) THEN
		IF EXISTS (SELECT id FROM customer_loyalty WHERE mobile_number = newMobileNumber) THEN
			SELECT 'FAILURE' AS status, 'New number is already exist.' AS message, 102 AS statusCode;
			LEAVE checkAndInsertMobileNumberChangeLog;
		ELSE
			START TRANSACTION;
			INSERT INTO customer_mobile_number_change_log(sub_merchant_id, customer_loyalty_id, existing_mobile_number, new_mobile_number, requested_from, created_by) VALUES (subMerchantId, customerLoyaltyId, existingMobileNumber, newMobileNumber, requestedFrom, createdBy);
            IF LAST_INSERT_ID() = 0 THEN
                ROLLBACK;
                SELECT 'FAILURE' AS status, 'Failed to insert data.' AS message, 520 AS statusCode;
                LEAVE checkAndInsertMobileNumberChangeLog;
            ELSE
                COMMIT;
                SELECT 'SUCCESS' AS status, 'Request is generated successfully.' AS message, 200 AS statusCode, LAST_INSERT_ID() AS lastInsertedId;
                LEAVE checkAndInsertMobileNumberChangeLog;
            END IF;
		END IF;
	ELSE
        SELECT 'FAILURE' AS status, 'Record not found.' AS message, 102 AS statusCode;
        LEAVE checkAndInsertMobileNumberChangeLog;
	END IF;

END$$
DELIMITER ;