DELIMITER $$
DROP PROCEDURE IF EXISTS approveRejectRequest$$
CREATE PROCEDURE approveRejectRequest(IN inputData JSON)
approveRejectRequest:BEGIN
    DECLARE customerLoyaltyId,subMerchantId,updatedBy,existingHomeBranchId,newHomeBranchId,requestId INTEGER(10) DEFAULT 0;
    DECLARE requestType,changedFrom,requestStatus TINYINT(1) DEFAULT 0;
    DECLARE typeMsg TEXT DEFAULT '';
    DECLARE userData JSON DEFAULT JSON_OBJECT();

    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
        LEAVE approveRejectRequest;
    ELSE
        SET requestType = JSON_EXTRACT(inputData,'$.request_type');
        SET requestId = JSON_EXTRACT(inputData,'$.id');
        SET changedFrom = JSON_EXTRACT(inputData,'$.changed_from');
        SET customerLoyaltyId = JSON_EXTRACT(inputData,'$.customer_loyalty_id');
        SET requestStatus = JSON_EXTRACT(inputData,'$.status');
        SET updatedBy = JSON_EXTRACT(inputData,'$.updated_by');

        IF requestType = 3 THEN
            UPDATE customer_home_branch_change_log SET status = requestStatus, updated_by = updatedBy, changed_from = changedFrom  WHERE id = requestId;
            IF ROW_COUNT() = 1 THEN
                IF requestStatus = 2 THEN
                    UPDATE customer_loyalty SET home_branch_id = (SELECT new_home_branch_id FROM customer_home_branch_change_log  WHERE id = requestId) WHERE id = customerLoyaltyId;
                    SELECT JSON_OBJECT('customerName', CONCAT_WS(' ', cl.first_name, cl.last_name), 'toEmail', cl.email_address, 'newHomeBranch', sml.location_name) INTO userData FROM customer_loyalty cl LEFT JOIN sub_merchant_locations sml ON cl.home_branch_id = sml.id WHERE cl.id = customerLoyaltyId;
                    SET typeMsg = 'Request approved successfully.';
                ELSE
                    SET typeMsg = 'Request rejected successfully.';
                END IF;
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', typeMsg,'data',JSON_OBJECT('text',typeMsg,'type','success','user_data',userData),'statusCode',200) AS response;
                LEAVE approveRejectRequest;
            ELSE
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Failed to update status.','data',JSON_OBJECT('text','Failed to update status','type','warning'),'statusCode',520) AS response;
                LEAVE approveRejectRequest;
            END IF;
        ELSEIF requestType = 2 THEN
            UPDATE customer_mobile_number_change_log SET status = requestStatus, updated_by = updatedBy, changed_from = changedFrom  WHERE id = requestId;
            IF ROW_COUNT() = 1 THEN
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Request cancelled successfully.','data',JSON_OBJECT('text','Request Approved successfully.','type','success'),'statusCode',200) AS response;
                LEAVE approveRejectRequest;
            ELSE
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Failed to update status.','data',JSON_OBJECT('text','Failed to update status','type','warning'),'statusCode',520) AS response;
                LEAVE approveRejectRequest;
            END IF;
        ELSE
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Invalid request type.','data',JSON_OBJECT(),'statusCode',404) AS response;
            LEAVE approveRejectRequest;
        END IF;
    END IF;
END$$
DELIMITER ;