DELIMITER $$
DROP PROCEDURE IF EXISTS `checkCampaignAvailability`$$
CREATE PROCEDURE `checkAndInsertHomeBranchChangeLog`(IN `customerLoyaltyId` INT, IN `existingHomeBranchId` INT, IN `newHomeBranchId` INT, IN `requestedFrom` TINYINT(1), IN `createdBy` INT)
checkAndInsertHomeBranchChangeLog:BEGIN

DECLARE subMerchantId INT(10);

	IF EXISTS (SELECT id FROM customer_home_branch_change_log WHERE customer_loyalty_id = customerLoyaltyId AND status = 1) THEN
		SELECT 'FAILURE' AS status, 'Previous request is in pending state.' AS message, 102 AS statusCode;
		LEAVE checkAndInsertHomeBranchChangeLog;
	ELSEIF EXISTS (SELECT id FROM sub_merchant_locations WHERE id = newHomeBranchId AND status = 1) THEN
		START TRANSACTION;
        SELECT sub_merchant_id INTO subMerchantId FROM sub_merchant_locations WHERE id = newHomeBranchId AND status = 1;
		INSERT INTO customer_home_branch_change_log(sub_merchant_id, customer_loyalty_id, existing_home_branch_id, new_home_branch_id, requested_from, created_by) VALUES (subMerchantId, customerLoyaltyId, existingHomeBranchId, newHomeBranchId, requestedFrom, createdBy);
		IF LAST_INSERT_ID() = 0 THEN
			ROLLBACK;
			SELECT 'FAILURE' AS status, 'Failed to insert data.' AS message, 520 AS statusCode;
			LEAVE checkAndInsertHomeBranchChangeLog;
		ELSE
			COMMIT;
			SELECT 'SUCCESS' AS status, 'Request is generated successfully.' AS message, 200 AS statusCode;
			LEAVE checkAndInsertHomeBranchChangeLog;
		END IF;
	ELSE
	    SELECT 'FAILURE' AS status, 'New branch location is not present.' AS message, 102 AS statusCode;
	    LEAVE checkAndInsertHomeBranchChangeLog;
	END IF;

END$$
DELIMITER ;