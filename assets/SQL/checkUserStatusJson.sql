DELIMITER $$
DROP PROCEDURE IF EXISTS checkUserStatus$$
CREATE PROCEDURE checkUserStatus(IN inputData JSON, OUT response JSON)
    checkUserStatus:BEGIN     
        DECLARE mobileNumber,emailAddress VARCHAR(100) DEFAULT '';
        DECLARE merchantId INTEGER DEFAULT 0;

        IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
            SET response = JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520);
            LEAVE checkUserStatus;
        ELSE
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(inputData,'$.mobile_number'));            
            SET merchantId = JSON_EXTRACT(inputData,'$.merchant_id');
            SET emailAddress = JSON_UNQUOTE(JSON_EXTRACT(inputData,'$.email_address'));  
            IF (mobileNumber IS NULL AND emailAddress IS NULL) OR merchantId IS NULL THEN
                SET response = JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of checkUserStatus.','data',JSON_OBJECT(),'statusCode',520);
                LEAVE checkUserStatus;
            END IF;            
        END IF;      

        IF EXISTS (SELECT id FROM customer_loyalty WHERE merchant_id = merchantId AND IF(emailAddress IS NOT NULL, email_address = emailAddress, 1=1) AND IF(mobileNumber IS NOT NULL, mobile_number = mobileNumber, 1=1)) THEN
            SELECT JSON_OBJECT('data',JSON_OBJECT('user_id',customer_loyalty.id,'first_name',customer_loyalty.first_name, 'last_name',customer_loyalty.last_name,'mobile_number',customer_loyalty.mobile_number, 'mobile_verified',customer_loyalty.mobile_verified, 'email_address',customer_loyalty.email_address, 'email_verified',customer_loyalty.email_verified,'email_verify_key',customer_loyalty.email_verify_key,
			'date_of_birth',customer_loyalty.date_of_birth, 'anniversary_date', customer_loyalty.anniversary_date,'spouse_dob', customer_loyalty.spouse_dob, 'marital_status',customer_loyalty.marital_status, 'gender',customer_loyalty.gender, 'userStatus',customer_loyalty.status,'home_branch_id',customer_loyalty.home_branch_id,
			'merchant_id',customer_loyalty.merchant_id,'sub_merchant_id',customer_loyalty.sub_merchant_id,'loyalty_id',customer_loyalty.loyalty_id,'membership_id',customer_loyalty.membership_id,'user_type_id',0,'opt_out_from_sms_status',customer_loyalty.opt_out_from_sms_status,
            'opt_out_from_email_status',customer_loyalty.opt_out_from_email_status,'pin_code',customer_loyalty.pin_code,'city_name',IFNULL(cities.name,'N/A'),'city_id',customer_loyalty.city_id,'last_loyalty_reset_date',customer_loyalty.last_loyalty_reset_date,'registration_date',customer_loyalty.created_at),
            'status','SUCCESS', 'message','User details.','statusCode',200),customer_loyalty.status
            INTO response,@userStatus
            FROM customer_loyalty
            LEFT JOIN cities ON cities.id = customer_loyalty.city_id
            WHERE customer_loyalty.merchant_id = merchantId 
            AND IF(emailAddress IS NOT NULL, customer_loyalty.email_address = emailAddress, 1=1)
            AND IF(mobileNumber IS NOT NULL, customer_loyalty.mobile_number = mobileNumber, 1=1); 
            IF @userStatus NOT IN (0,1,2,3) THEN
                SET response = JSON_SET(response,'$.status','SUCCESS', '$.data',JSON_OBJECT('statusCode',105), '$.message', 'Invalid user.','$.statusCode',105);
                LEAVE checkUserStatus;
            ELSEIF @userStatus = 0 THEN
                SET response = JSON_SET(response,'$.status','SUCCESS', '$.data',JSON_OBJECT('statusCode',105), '$.message', 'User profile is inactive, please contact site admin.','$.statusCode',105);
                LEAVE checkUserStatus;
            ELSEIF @userStatus = 2 THEN
                SET response = JSON_SET(response,'$.status','SUCCESS', '$.data',JSON_OBJECT('statusCode',105), '$.message', 'User profile is deleted, please contact site admin.','$.statusCode',105);
                LEAVE checkUserStatus;
            ELSEIF @userStatus = 3 THEN
                SET response = JSON_SET(response,'$.status','SUCCESS', '$.data',JSON_OBJECT('statusCode',105), '$.message', 'User profile is blocked, please contact site admin.','$.statusCode',105);
                LEAVE checkUserStatus;
            END IF;
        ELSE
            SET response = JSON_OBJECT('status','SUCCESS', 'message', 'Record not found.','data',JSON_OBJECT('statusCode',104),'statusCode',104);
            LEAVE checkUserStatus;
        END IF;
    END$$
DELIMITER ;