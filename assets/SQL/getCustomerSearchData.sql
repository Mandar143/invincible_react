DELIMITER $$
DROP PROCEDURE IF EXISTS getCustomerSearchData$$
CREATE PROCEDURE getCustomerSearchData(IN customerDetailsInput JSON)
    getCustomerSearchData:BEGIN
        DECLARE customerName, emailAddress,mobileNumber VARCHAR(255) DEFAULT '';
        DECLARE currentPurchaseValue, awayFromNextMilestone,currentMilesoneBenefit BIGINT DEFAULT 0;
        DECLARE dateOfBirth, anniversaryDate, spouseDob DATE DEFAULT NULL;
        DECLARE customerGender, mobileVerified, emailVerified, customerStatus, maritalStatus TINYINT(1) DEFAULT 0;
        DECLARE customerId,loyaltyId, merchantId, homeBranchId, currentMilestoneId,requestType INTEGER(10) DEFAULT 0;
        DECLARE customerDetails,mobileNumberChangeRequest,homeBranchChangeRequest,existingHomeBranch,loyaltyDetails JSON DEFAULT JSON_OBJECT();

        IF customerDetailsInput IS NOT NULL AND JSON_VALID(customerDetailsInput) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
            LEAVE getCustomerSearchData;
        ELSE
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.mobile_number'));
            SET customerId = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.customer_loyalty_id'));
            SET merchantId = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.merchant_id'));
            SET requestType = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.request_type'));
            IF merchantId IS NULL OR requestType IS NULL THEN                
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of getCustomerSearchData.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE getCustomerSearchData;
            ELSEIF requestType = 1 AND mobileNumber IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of getCustomerSearchData.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE getCustomerSearchData;
            ELSEIF requestType > 1 AND customerId IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of getCustomerSearchData.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE getCustomerSearchData;
            END IF;
        END IF;
        IF EXISTS(SELECT id FROM customer_loyalty WHERE merchant_id = merchantId AND IF(mobileNumber != '', mobile_number = mobileNumber, 1 = 1) AND IF(customerId != 0, id = customerId, 1 = 1)) THEN 
            IF requestType = 1 THEN
                SELECT JSON_OBJECT('customer_loyalty_id',customer_loyalty.id,'sub_merchant_id',customer_loyalty.sub_merchant_id, 'first_name',customer_loyalty.first_name,'last_name', customer_loyalty.last_name,'gender', customer_loyalty.gender,'mobile_number',customer_loyalty.mobile_number,
                'mobile_verified', customer_loyalty.mobile_verified,'email_address', customer_loyalty.email_address,'email_verified', customer_loyalty.email_verified,'email_verify_key',customer_loyalty.email_verify_key, 'merchant_id', customer_loyalty.merchant_id,
                'home_branch_id',customer_loyalty.home_branch_id, 'loyalty_id', customer_loyalty.loyalty_id,'current_milestone_id', customer_loyalty.current_milestone_id, 'current_purchase_value',customer_loyalty.current_purchase_value,
                'status',customer_loyalty.status, 'marital_status',customer_loyalty.marital_status,'date_of_birth', customer_loyalty.date_of_birth,'anniversary_date', customer_loyalty.anniversary_date, 'spouse_dob',customer_loyalty.spouse_dob,
                'opt_out_from_sms_status',customer_loyalty.opt_out_from_sms_status,'opt_out_from_email_status',customer_loyalty.opt_out_from_email_status,'created_at',customer_loyalty.created_at,'pin_code',customer_loyalty.pin_code,
                'city_name',IFNULL(cities.name,'N/A'),'city_id',customer_loyalty.city_id,'last_loyalty_reset_date',customer_loyalty.last_loyalty_reset_date,'registration_date',customer_loyalty.created_at)
                INTO customerDetails
                FROM customer_loyalty
                LEFT JOIN cities ON cities.id = customer_loyalty.city_id
                WHERE mobile_number = mobileNumber AND merchant_id = merchantId;

                SET customerId =  JSON_EXTRACT(customerDetails,'$.customer_loyalty_id');
                SET loyaltyId = JSON_EXTRACT(customerDetails,'$.loyalty_id');
                SET currentMilestoneId = JSON_EXTRACT(customerDetails,'$.current_milestone_id');
                SET currentPurchaseValue = JSON_EXTRACT(customerDetails,'$.current_purchase_value');
                
                SELECT milestone_benefit_value INTO currentMilesoneBenefit
                FROM merchant_loyalty_program_milestones
                WHERE  id = currentMilestoneId;

                SELECT (milestone_reach_at - currentPurchaseValue) INTO awayFromNextMilestone
                FROM merchant_loyalty_program_milestones
                WHERE loyalty_id = loyaltyId  
                AND sequence > (SELECT sequence FROM merchant_loyalty_program_milestones WHERE id = currentMilestoneId)
                LIMIT 1;

                SELECT CONCAT('[',GROUP_CONCAT(JSON_OBJECT('id',id,'loyalty_id',loyalty_id,'milestone_name', milestone_name,'milestone_reach_at', milestone_reach_at,
                'milestone_benefit_value', milestone_benefit_value,'sequence', sequence)),']')
                INTO loyaltyDetails
                FROM merchant_loyalty_program_milestones 
                WHERE loyalty_id = loyaltyId ORDER BY sequence ASC;

                SET customerDetails = JSON_SET(customerDetails,'$.current_milestone_benefit',currentMilesoneBenefit,'$.away_from_next_milestone',awayFromNextMilestone);
                SELECT JSON_OBJECT('status','SUCCESS', 'message','Customer details.','data',JSON_OBJECT('customer_details',customerDetails,'loyalty_details',loyaltyDetails), 'statusCode',200) AS response;
                LEAVE getCustomerSearchData;
            ELSEIF requestType = 2 THEN
                SELECT JSON_OBJECT('id',id,'existing_mobile_number',existing_mobile_number,'new_mobile_number',new_mobile_number,'status',status) 
                INTO mobileNumberChangeRequest
                FROM customer_mobile_number_change_log 
                WHERE customer_loyalty_id = customerId 
                AND status = 1;
                SELECT JSON_OBJECT('status','SUCCESS', 'message','Mobile number change request.','data',JSON_OBJECT('mobile_number_change_request',mobileNumberChangeRequest), 'statusCode',200) AS response;
                LEAVE getCustomerSearchData;
            ELSEIF requestType = 3 THEN
                SELECT JSON_OBJECT('state_name',sml.state_name,'city_name',sml.city_name,'existing_location',JSON_OBJECT('id',sml.id,'location_name',sml.location_name))
                INTO existingHomeBranch
                FROM customer_loyalty AS cl
                JOIN sub_merchant_locations AS sml ON sml.id = cl.home_branch_id
                WHERE cl.id = customerId;

                SELECT JSON_OBJECT('id',chbcl.id,'state_name',sml.state_name,'city_name',sml.city_name,'requested_location',JSON_OBJECT('id',sml.id,'location_name',sml.location_name))
                INTO homeBranchChangeRequest
                FROM customer_home_branch_change_log AS chbcl
                JOIN sub_merchant_locations AS sml ON sml.id = chbcl.new_home_branch_id
                WHERE chbcl.customer_loyalty_id = customerId
                AND chbcl.status = 1 
                ORDER BY chbcl.id DESC LIMIT 1;

                SELECT JSON_OBJECT('status','SUCCESS', 'message','Home branch.','data',JSON_OBJECT('existing_home_branch',existingHomeBranch,'home_branch_change_request',homeBranchChangeRequest), 'statusCode',200) AS response;
                LEAVE getCustomerSearchData;
            END IF;            
        ELSE
            SELECT JSON_OBJECT('status','SUCCESS', 'message','No record found.','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
            LEAVE getCustomerSearchData;
        END IF; 
    END$$
DELIMITER ;