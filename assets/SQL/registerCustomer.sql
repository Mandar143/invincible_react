DELIMITER $$
DROP PROCEDURE IF EXISTS registerCustomer$$
CREATE PROCEDURE registerCustomer(IN inputCustomerData JSON)
    registerCustomer:BEGIN     
        DECLARE mobileNumber, emailAddress, firstName, lastName, emailVerifyKey, pinCode VARCHAR(100) DEFAULT '';
        DECLARE dateOfBirth, spouceDob, anniversaryDate DATE DEFAULT NULL;
        DECLARE customerId,currentMilestoneId,merchantId,loyaltyId, createdBy,mobileOtp,subMerchantId,registeredLocation,statusCode,requestSource,customerLoyaltyId,cityId INTEGER DEFAULT 0;
        DECLARE maritalStatus,mobileVerified,userGender,registeredFrom TINYINT DEFAULT 0;
        DECLARE inputData,outPutData,campaignRequest,campaignOutput,userLoyaltyData JSON;

        IF inputCustomerData IS NOT NULL AND JSON_VALID(inputCustomerData) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520) AS response;
            LEAVE registerCustomer;
        ELSE
            SET firstName = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.first_name')); 
            SET lastName = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.last_name'));            
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.mobile_number'));            
            SET emailAddress = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.email_address'));  
            SET emailVerifyKey = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.email_verify_key')); 
            SET dateOfBirth = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.date_of_birth'));          
            SET spouceDob = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.spouse_dob'));          
            SET anniversaryDate = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.anniversary_date')); 

            SET merchantId = JSON_EXTRACT(inputCustomerData,'$.merchant_id');
            SET loyaltyId = JSON_EXTRACT(inputCustomerData,'$.loyalty_id');
            SET subMerchantId = JSON_EXTRACT(inputCustomerData,'$.sub_merchant_id');
            SET registeredLocation = JSON_EXTRACT(inputCustomerData,'$.registered_location');
            SET registeredFrom = JSON_EXTRACT(inputCustomerData,'$.registered_from');
            SET createdBy = JSON_EXTRACT(inputCustomerData,'$.created_by');
            SET mobileOtp = JSON_EXTRACT(inputCustomerData,'$.otp');
            SET userGender = JSON_EXTRACT(inputCustomerData,'$.gender');
            SET maritalStatus = JSON_EXTRACT(inputCustomerData,'$.marital_status');
            SET pinCode = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.pin_code'));
            SET cityId = JSON_UNQUOTE(JSON_EXTRACT(inputCustomerData,'$.city_id'));
            SET requestSource = JSON_EXTRACT(inputCustomerData,'$.request_source');
            IF merchantId IS NULL OR loyaltyId IS NULL OR registeredFrom IS NULL OR firstName IS NULL OR mobileNumber IS NULL OR dateOfBirth IS NULL OR requestSource IS NULL OR (requestSource IS NOT NULL AND requestSource NOT IN (0,201)) THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of registerCustomer.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE registerCustomer;
            ELSEIF createdBy IS NULL AND (lastName IS NULL OR userGender IS NULL OR emailAddress IS NULL OR (requestSource = 0 AND emailVerifyKey IS NULL)) THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of registerCustomer.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE registerCustomer;
            ELSEIF requestSource = 0 AND createdBy IS NULL AND (mobileOtp IS NULL OR CHAR_LENGTH(mobileOtp) < 6) THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'OTP is mandatory.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE registerCustomer;
            ELSEIF requestSource = 0 AND createdBy IS NOT NULL AND (subMerchantId IS NULL OR registeredLocation IS NULL) THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Sub merchant id and registered location are mandatory.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE registerCustomer;
            ELSEIF mobileOtp IS NOT NULL AND CHAR_LENGTH(mobileOtp) = 6 THEN
                IF NOT EXISTS (SELECT id FROM customer_otp WHERE mobile_number = mobileNumber AND otp = mobileOtp AND otp_used = 1) THEN
                    SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Invalid request.','data',JSON_OBJECT(),'statusCode',520) AS response;
                    LEAVE registerCustomer;
                ELSE
                    SET mobileVerified = 1;
                END IF;
            END IF; 

            IF registeredFrom = 1 THEN
                SET mobileVerified = 1;
            END IF;
            
            IF requestSource = 0 AND (mobileNumber != '' AND EXISTS (SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber)) THEN
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Mobile number already used.','data',JSON_OBJECT('field_name','mobile_number','statusCode',102),'statusCode',102) AS response;
                LEAVE registerCustomer;
            ELSEIF requestSource = 0 AND (emailAddress != '' AND EXISTS (SELECT id FROM customer_loyalty WHERE email_address = emailAddress)) THEN
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Email address already used.','data',JSON_OBJECT('field_name','email_address','statusCode',102),'statusCode',102) AS response;
                LEAVE registerCustomer;
            ELSE
                IF requestSource = 0 THEN
                    SELECT id INTO currentMilestoneId FROM merchant_loyalty_program_milestones WHERE loyalty_id = loyaltyId AND default_milestone = 1;

                    INSERT INTO customer_loyalty(merchant_id,loyalty_id,sub_merchant_id,home_branch_id,current_milestone_id,first_name,last_name,mobile_number,mobile_verified,email_address,email_verify_key,date_of_birth,gender,marital_status,spouse_dob,anniversary_date,registered_from,registered_location,pin_code,city_id,created_by)
                    VALUES (merchantId,loyaltyId,subMerchantId,registeredLocation,currentMilestoneId,firstName,lastName,mobileNumber,mobileVerified,emailAddress,emailVerifyKey,IF(dateOfBirth = '',NULL,dateOfBirth),userGender,maritalStatus,IF(spouceDob = '',NULL,spouceDob),IF(anniversaryDate = '',NULL,anniversaryDate),registeredFrom,registeredLocation,pinCode,cityId,IFNULL(createdBy,0));
                    IF LAST_INSERT_ID() > 0 THEN
                    
						SET customerLoyaltyId = LAST_INSERT_ID();
                    -- CAMPAIGN CHECK
                        SET campaignRequest = JSON_OBJECT('campaign_category_id',5,'merchant_id',merchantId,'loyalty_id',loyaltyId,'customer_loyalty_id',customerLoyaltyId);
                        CALL checkCampaignAvailability(campaignRequest, @campaignResponse);
                        SET campaignOutput = @campaignResponse;
                    -- LOYALTY CALCULATION
                        IF EXISTS(SELECT id FROM customer_orders WHERE mobile_number = mobileNumber AND merchant_id = merchantId AND processed = 0) THEN
                            UPDATE customer_orders SET customer_loyalty_id = customerLoyaltyId WHERE mobile_number = mobileNumber AND processed = 0;
                            UPDATE customer_order_details SET customer_loyalty_id = customerLoyaltyId WHERE mobile_number = mobileNumber;
                            -- CALL TO USER LOYALTY CALCULATION PROCEDURE                            
                            CALL userLoyaltyCalculation(0,mobileNumber,@outPutData);
                            SET userLoyaltyData = @outPutData;
                        END IF;
                        IF userLoyaltyData IS NULL THEN
                            SET userLoyaltyData = JSON_OBJECT('statusCode',104);
                        END IF;

                        SELECT JSON_OBJECT('status','SUCCESS','message','Record added successfully','data',JSON_OBJECT('user_id',customer_loyalty.id,
                        'first_name',customer_loyalty.first_name, 'last_name',customer_loyalty.last_name,'mobile_number',customer_loyalty.mobile_number,
                        'mobile_verified',customer_loyalty.mobile_verified,'email_address',customer_loyalty.email_address,'email_verified',customer_loyalty.email_verified,'email_verify_key',customer_loyalty.email_verify_key,
                        'date_of_birth',customer_loyalty.date_of_birth, 'anniversary_date', customer_loyalty.anniversary_date,'spouse_dob', customer_loyalty.spouse_dob, 
                        'marital_status',customer_loyalty.marital_status, 'gender',customer_loyalty.gender, 'userStatus',customer_loyalty.status,'home_branch_id',customer_loyalty.home_branch_id,
                        'merchant_id',customer_loyalty.merchant_id,'sub_merchant_id',customer_loyalty.sub_merchant_id,'loyalty_id',customer_loyalty.loyalty_id,
                        'membership_id',customer_loyalty.membership_id,'user_type_id',0,'opt_out_from_sms_status',customer_loyalty.opt_out_from_sms_status,
                        'opt_out_from_email_status',customer_loyalty.opt_out_from_email_status,'pin_code',customer_loyalty.pin_code,
                        'city_name',IFNULL(cities.name,'N/A'),'city_id',customer_loyalty.city_id,'last_loyalty_reset_date',customer_loyalty.last_loyalty_reset_date,'registration_date',customer_loyalty.created_at, 
                        'campaign_response',campaignOutput, 'user_loyalty_data',userLoyaltyData),'statusCode',200) AS response
                        FROM customer_loyalty 
                        LEFT JOIN cities ON cities.id = customer_loyalty.city_id
                        WHERE mobile_number = mobileNumber AND merchant_id = merchantId;
                        LEAVE registerCustomer;
                    ELSE
                        SELECT JSON_OBJECT('status','FAILURE','message','Record not added','data',JSON_OBJECT(),'statusCode',520) AS response; 
                        LEAVE registerCustomer;
                    END IF;
                ELSE
                    SET inputData = JSON_OBJECT('mobile_number',mobileNumber,'merchant_id',merchantId);
                    CALL checkUserStatus(inputData,outPutData);	
                    SET statusCode = JSON_EXTRACT(outPutData,'$.statusCode');
                    IF statusCode != 200 AND statusCode != 104 THEN
                        SELECT outPutData AS response;
                        LEAVE registerCustomer; 
                    ELSE
                        SET customerId = JSON_EXTRACT(outPutData,'$.data.user_id');  
                        IF emailAddress != '' AND EXISTS(SELECT id FROM customer_loyalty WHERE id != customerId AND email_address = emailAddress) THEN
                            SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Email address already used.','data',JSON_OBJECT('field_name','email_address','statusCode',102),'statusCode',102) AS response;
                            LEAVE registerCustomer;
                        END IF;
                    END IF;
                    IF NOT EXISTS(SELECT id FROM customer_milestones WHERE customer_loyalty_id = customerId AND loyalty_id = loyaltyId) THEN
                        SELECT id INTO currentMilestoneId FROM merchant_loyalty_program_milestones WHERE loyalty_id = loyaltyId AND default_milestone = 1;
                    ELSE
                        SELECT current_milestone_id INTO currentMilestoneId FROM customer_loyalty WHERE id = customerId;
                    END IF;
                    UPDATE customer_loyalty SET 
                        first_name = firstName, 
                        last_name = lastName, 
                        merchant_id = merchantId,
                        loyalty_id = loyaltyId,
                        email_address = IF((email_address != emailAddress OR email_address IS NULL), emailAddress,email_address),
                        email_verify_key = IF((email_address != emailAddress OR email_address IS NULL), emailVerifyKey,email_verify_key),
                        date_of_birth = IF(dateOfBirth = '',NULL,dateOfBirth),
                        marital_status = maritalStatus,
                        current_milestone_id = currentMilestoneId,
                        anniversary_date = IF(anniversaryDate = '',NULL,anniversaryDate),
                        spouse_dob = IF(spouceDob = '',NULL,spouceDob),
                        gender = userGender,
                        pin_code = pinCode,
                        city_id = cityId
                    WHERE mobile_number = mobileNumber AND merchant_id = merchantId;
                    IF ROW_COUNT() > 0 THEN                        
                        SELECT JSON_OBJECT('status','SUCCESS','message','Record updated successfully','data',JSON_OBJECT('user_id',customer_loyalty.id,
                        'first_name',customer_loyalty.first_name, 'last_name',customer_loyalty.last_name,'mobile_number',customer_loyalty.mobile_number,
                        'mobile_verified',customer_loyalty.mobile_verified,'email_address',customer_loyalty.email_address,'email_verified',customer_loyalty.email_verified,'email_verify_key',customer_loyalty.email_verify_key,
                        'date_of_birth',customer_loyalty.date_of_birth, 'anniversary_date', customer_loyalty.anniversary_date,'spouse_dob', customer_loyalty.spouse_dob, 
                        'marital_status',customer_loyalty.marital_status, 'gender',customer_loyalty.gender, 'userStatus',customer_loyalty.status,'home_branch_id',customer_loyalty.home_branch_id,
                        'merchant_id',customer_loyalty.merchant_id,'sub_merchant_id',customer_loyalty.sub_merchant_id,'loyalty_id',customer_loyalty.loyalty_id,
                        'membership_id',customer_loyalty.membership_id,'user_type_id',0,'opt_out_from_sms_status',customer_loyalty.opt_out_from_sms_status,
                        'opt_out_from_email_status',customer_loyalty.opt_out_from_email_status,'pin_code',customer_loyalty.pin_code,
                        'city_name',IFNULL(cities.name,'N/A'),'city_id',customer_loyalty.city_id,'last_loyalty_reset_date',customer_loyalty.last_loyalty_reset_date,'registration_date',customer_loyalty.created_at),'statusCode',200) AS response
                        FROM customer_loyalty 
                        LEFT JOIN cities ON cities.id = customer_loyalty.city_id
                        WHERE mobile_number = mobileNumber AND merchant_id = merchantId; 
                        LEAVE registerCustomer;
                    ELSE
                        SELECT JSON_OBJECT('status','SUCCESS','message','Nothing to update','data',JSON_OBJECT('statusCode',108),'statusCode',108) AS response; 
                        LEAVE registerCustomer;
                    END IF;
                END IF;
            END IF;
        END IF;                     
    END$$
DELIMITER ;