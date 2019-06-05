DELIMITER $$
DROP PROCEDURE IF EXISTS `changeRequestFromCustomer`$$
CREATE PROCEDURE `changeRequestFromCustomer`(IN `inputData` JSON)
changeRequestFromCustomer:BEGIN

DECLARE customerLoyaltyId,subMerchantId,createdBy,existingHomeBranchId,newHomeBranchId INTEGER(10) DEFAULT 0;
DECLARE requestType,requestedFrom TINYINT(1) DEFAULT 0;
DECLARE existingMobileNumber,newMobileNumber VARCHAR (20) DEFAULT NULL;

    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
        LEAVE changeRequestFromCustomer;
    ELSE

        SET requestType = JSON_EXTRACT(inputData,'$.request_type');
        SET requestedFrom = JSON_EXTRACT(inputData,'$.requested_from');
        SET customerLoyaltyId = JSON_EXTRACT(inputData,'$.customer_loyalty_id');
        SET subMerchantId = JSON_EXTRACT(inputData,'$.sub_merchant_id');
        SET createdBy = JSON_EXTRACT(inputData,'$.created_by');

        IF requestType = 3 THEN

            SET existingHomeBranchId = JSON_EXTRACT(inputData,'$.existing_home_branch_id');
            SET newHomeBranchId = JSON_EXTRACT(inputData,'$.new_home_branch_id');

            IF EXISTS (SELECT id FROM customer_home_branch_change_log WHERE customer_loyalty_id = customerLoyaltyId AND status = 1) THEN
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Previous request is in pending state.','data',JSON_OBJECT('statusCode',102),'statusCode',102) AS response;
                LEAVE changeRequestFromCustomer;
            ELSEIF EXISTS (SELECT id FROM sub_merchant_locations WHERE id = newHomeBranchId AND status = 1) THEN
                START TRANSACTION;
                INSERT INTO customer_home_branch_change_log(sub_merchant_id, customer_loyalty_id, existing_home_branch_id, new_home_branch_id, requested_from, created_by) VALUES (subMerchantId, customerLoyaltyId, existingHomeBranchId, newHomeBranchId, requestedFrom, createdBy);
                IF LAST_INSERT_ID() = 0 THEN
                    ROLLBACK;
                    SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Failed to insert data.','data',JSON_OBJECT(),'statusCode',520) AS response;
                    LEAVE changeRequestFromCustomer;
                ELSE
                    COMMIT;
                    SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Request generated successfully.','data',JSON_OBJECT('statusCode',100),'statusCode',100) AS response;
                    LEAVE changeRequestFromCustomer;
                END IF;
            ELSE
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'New branch location is not present.','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
                LEAVE changeRequestFromCustomer;
            END IF;

        ELSEIF requestType = 2 THEN

            SET existingMobileNumber = JSON_UNQUOTE(JSON_EXTRACT(inputData,'$.existing_mobile_number'));
            SET newMobileNumber = JSON_UNQUOTE(JSON_EXTRACT(inputData,'$.new_mobile_number'));

            IF EXISTS (SELECT id FROM customer_mobile_number_change_log WHERE customer_loyalty_id = customerLoyaltyId AND status = 1) THEN
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Previous request is in pending state.','data',JSON_OBJECT('statusCode',102),'statusCode',102) AS response;
                LEAVE changeRequestFromCustomer;
            ELSEIF EXISTS (SELECT id FROM customer_loyalty WHERE id = customerLoyaltyId AND mobile_number = existingMobileNumber) THEN
                IF EXISTS (SELECT id FROM customer_loyalty WHERE mobile_number = newMobileNumber) THEN
                    SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'New number is already exist.','data',JSON_OBJECT('statusCode',102),'statusCode',102) AS response;
                    LEAVE changeRequestFromCustomer;
                ELSE
                    START TRANSACTION;
                    INSERT INTO customer_mobile_number_change_log(sub_merchant_id, customer_loyalty_id, existing_mobile_number, new_mobile_number, requested_from, created_by) VALUES (subMerchantId, customerLoyaltyId, existingMobileNumber, newMobileNumber, requestedFrom, createdBy);
                    IF LAST_INSERT_ID() = 0 THEN
                        ROLLBACK;
                        SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Failed to insert data.','data',JSON_OBJECT(),'statusCode',520) AS response;
                        LEAVE changeRequestFromCustomer;
                    ELSE
                        COMMIT;
                        SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Request generated successfully.','data',JSON_OBJECT('statusCode',100),'statusCode',100) AS response;
                        LEAVE changeRequestFromCustomer;
                    END IF;
                END IF;
            ELSE
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'User not found.','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
                LEAVE changeRequestFromCustomer;
            END IF;

        ELSE
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Invalid request type.','data',JSON_OBJECT(),'statusCode',404) AS response;
            LEAVE changeRequestFromCustomer;
        END IF;

    END IF;

END$$
DELIMITER ;