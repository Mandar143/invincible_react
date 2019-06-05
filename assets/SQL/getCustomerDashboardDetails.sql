DELIMITER $$
DROP PROCEDURE IF EXISTS getCustomerDashboardDetails$$
CREATE PROCEDURE getCustomerDashboardDetails(IN customerDetailsInput JSON)
    getCustomerDashboardDetails:BEGIN
        DECLARE customerName, emailAddress,mobileNumber VARCHAR(255) DEFAULT '';
        DECLARE currentPurchaseValue, awayFromNextMilestone,currentMilesoneBenefit, daysLeftForCompletion BIGINT DEFAULT 0;
        DECLARE dateOfBirth, anniversaryDate, spouseDob, registrationDate DATE DEFAULT NULL;
        DECLARE customerGender, mobileVerified, emailVerified, customerStatus, maritalStatus TINYINT(1) DEFAULT 0;
        DECLARE customerId,loyaltyId, merchantId, homeBranchId, currentMilestoneId INTEGER(10) DEFAULT 0;
        DECLARE customerDetails,loyaltyDetails,milestoneJourney JSON DEFAULT JSON_OBJECT();
        DECLARE createdAt TIMESTAMP DEFAULT NULL;

        IF customerDetailsInput IS NOT NULL AND JSON_VALID(customerDetailsInput) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
            LEAVE getCustomerDashboardDetails;
        ELSE
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.mobile_number'));
            SET merchantId = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.merchant_id'));
            IF mobileNumber IS NULL OR merchantId IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of getCustomerDashboardDetails.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE getCustomerDashboardDetails;
            END IF;
        END IF;
        IF EXISTS(SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber AND merchant_id = merchantId) THEN
            SET SESSION group_concat_max_len = 10000000;

            SELECT JSON_OBJECT('customer_loyalty_id',customer_loyalty.id, 'first_name',customer_loyalty.first_name,'last_name', customer_loyalty.last_name,'gender', customer_loyalty.gender,'mobile_number',customer_loyalty.mobile_number,
            'mobile_verified', customer_loyalty.mobile_verified,'email_address', customer_loyalty.email_address,'email_verified', customer_loyalty.email_verified,'email_verify_key',customer_loyalty.email_verify_key, 'merchant_id', customer_loyalty.merchant_id,
            'home_branch_id',customer_loyalty.home_branch_id, 'loyalty_id', customer_loyalty.loyalty_id,'current_milestone_id', customer_loyalty.current_milestone_id, 'current_purchase_value',customer_loyalty.current_purchase_value,
            'status',customer_loyalty.status, 'marital_status',customer_loyalty.marital_status,'date_of_birth', customer_loyalty.date_of_birth,'anniversary_date', customer_loyalty.anniversary_date, 'spouse_dob',customer_loyalty.spouse_dob,
            'opt_out_from_sms_status',customer_loyalty.opt_out_from_sms_status,'opt_out_from_email_status',customer_loyalty.opt_out_from_email_status,'created_at',customer_loyalty.created_at,'pin_code',customer_loyalty.pin_code,
            'city_name',IFNULL(cities.name,'N/A'),'city_id',customer_loyalty.city_id,'last_loyalty_reset_date',customer_loyalty.last_loyalty_reset_date)
            INTO customerDetails
            FROM customer_loyalty
            LEFT JOIN cities ON cities.id = customer_loyalty.city_id
            WHERE mobile_number = mobileNumber AND merchant_id = merchantId;

            SET customerId =  JSON_EXTRACT(customerDetails,'$.customer_loyalty_id');
            SET loyaltyId = JSON_EXTRACT(customerDetails,'$.loyalty_id');
            SET currentMilestoneId = JSON_EXTRACT(customerDetails,'$.current_milestone_id');
            SET homeBranchId = JSON_EXTRACT(customerDetails,'$.home_branch_id');
            SET currentPurchaseValue = JSON_EXTRACT(customerDetails,'$.current_purchase_value');
            SET registrationDate = JSON_UNQUOTE(JSON_EXTRACT(customerDetails,'$.created_at'));
            SET daysLeftForCompletion = DATEDIFF(DATE_ADD(registrationDate, INTERVAL 364 DAY),CURDATE());

            SELECT milestone_benefit_value INTO currentMilesoneBenefit
            FROM merchant_loyalty_program_milestones
            WHERE  id = currentMilestoneId;

            SELECT (milestone_reach_at - currentPurchaseValue) INTO awayFromNextMilestone
            FROM merchant_loyalty_program_milestones
            WHERE loyalty_id = loyaltyId
            AND sequence > (SELECT sequence FROM merchant_loyalty_program_milestones WHERE id = currentMilestoneId)
            LIMIT 1;

            SET customerDetails = JSON_SET(customerDetails,'$.current_milestone_benefit',currentMilesoneBenefit,'$.away_from_next_milestone',awayFromNextMilestone,'$.days_left_for_completion',daysLeftForCompletion,'$.registration_date',registrationDate);

            SELECT CONCAT('[',GROUP_CONCAT(JSON_OBJECT('id',id,'loyalty_id',loyalty_id,'milestone_name', milestone_name,'milestone_reach_at', milestone_reach_at,
            'milestone_benefit_value', milestone_benefit_value,'sequence', sequence)),']')
            INTO loyaltyDetails
            FROM merchant_loyalty_program_milestones
            WHERE loyalty_id = loyaltyId ORDER BY sequence ASC;     
            
            IF loyaltyDetails IS NULL THEN
                SET loyaltyDetails = JSON_ARRAY();
            END IF;

            CREATE TEMPORARY TABLE milestone_journey(
                id INTEGER(10) PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255)  DEFAULT '',
                sub_title VARCHAR(255) DEFAULT '',
                date_of_transaction DATE,
                amount INTEGER(15),
                type_of_transaction TINYINT
            );
            -- milestone achieved
            INSERT INTO milestone_journey (title,sub_title,date_of_transaction,amount,type_of_transaction)
            SELECT CONCAT('Milestone ',mlpm.sequence - 1, ' Achived'),'', cm.date_earned, cm.purchase_value, 2
            FROM customer_milestones cm
            JOIN merchant_loyalty_program_milestones mlpm ON mlpm.id = cm.milestone_id
            WHERE cm.customer_loyalty_id = customerId;

            -- voucher issued
            INSERT INTO milestone_journey (title,sub_title,date_of_transaction,amount,type_of_transaction)
            SELECT 'Voucher Issued','', cm.date_earned, cm.voucher_value, 3
            FROM customer_milestones cm            
            WHERE cm.customer_loyalty_id = customerId;

            -- voucher expired
            INSERT INTO milestone_journey (title,sub_title,date_of_transaction,amount,type_of_transaction)
            SELECT 'Voucher Expired','', cm.expiry_date, cm.voucher_value, 5
            FROM customer_milestones cm            
            WHERE cm.customer_loyalty_id = customerId AND cm.expiry_date <= CURDATE();

            -- shopping
            INSERT INTO milestone_journey (title,sub_title,date_of_transaction,amount,type_of_transaction)
            SELECT 'Shopping',CONCAT(sml.location_name, ' Invoice #',co.order_number), DATE(co.created_at), co.calculated_amount, 1
            FROM customer_orders co   
            JOIN sub_merchant_locations sml ON sml.id = co.location_id         
            WHERE co.customer_loyalty_id = customerId;

            -- voucher used
            INSERT INTO milestone_journey (title,sub_title,date_of_transaction,amount,type_of_transaction)
            SELECT 'Voucher Redeemed',CONCAT(sml.location_name, ' Invoice #',co.order_number), DATE(co.created_at), cm.voucher_value, 4
            FROM customer_orders co   
            JOIN sub_merchant_locations sml ON sml.id = co.location_id  
            JOIN customer_milestones cm ON cm.voucher_code = co.voucher_applied       
            WHERE co.customer_loyalty_id = customerId;
            innerBlock:BEGIN
                DECLARE dataTitle, dataSubTitle VARCHAR(255) DEFAULT '';
                DECLARE dataTransactionDate DATE;
                DECLARE dataAmount,notFound INTEGER DEFAULT 0;
                DECLARE dataTypeOfTransaction TINYINT DEFAULT 0;

                DECLARE milestoneJourney CURSOR FOR 
                SELECT title,sub_title,date_of_transaction,amount,type_of_transaction             
                FROM milestone_journey order by date_of_transaction ASC;

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
                SET milestoneJourney = JSON_ARRAY();
                OPEN milestoneJourney;
                    milestoneJourneyLoop:LOOP
                        FETCH milestoneJourney INTO dataTitle, dataSubTitle, dataTransactionDate, dataAmount, dataTypeOfTransaction;

                        IF notFound = 1 THEN
                            LEAVE milestoneJourneyLoop;
                        END IF;
                        SET milestoneJourney = JSON_ARRAY_APPEND(milestoneJourney,'$',JSON_OBJECT('title',dataTitle,'sub_title',dataSubTitle,'date_of_transaction',dataTransactionDate,'amount',dataAmount,'type_of_transaction',dataTypeOfTransaction));
                    END LOOP milestoneJourneyLoop;
                CLOSE milestoneJourney;
            END innerBlock;            
            DROP TEMPORARY TABLE milestone_journey;
            SELECT JSON_OBJECT('status','SUCCESS', 'message','Customer dashboard details.','data',JSON_OBJECT('customer_details',customerDetails,'loyalty_details',loyaltyDetails,'milestone_journey',milestoneJourney), 'statusCode',200) AS response;
            LEAVE getCustomerDashboardDetails;
        ELSE
            SELECT JSON_OBJECT('status','SUCCESS', 'message','No record found.','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
            LEAVE getCustomerDashboardDetails;
        END IF;
        SET SESSION group_concat_max_len = 1024;
    END$$
DELIMITER ;