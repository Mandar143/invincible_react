DELIMITER $$
DROP PROCEDURE IF EXISTS verifyEmailAddress$$
CREATE PROCEDURE verifyEmailAddress(IN inputData JSON)
    verifyEmailAddress:BEGIN
        DECLARE emailVerifyKey,customerName VARCHAR(100) DEFAULT '';
        DECLARE customerId INTEGER DEFAULT 0;
        DECLARE emailVerified TINYINT DEFAULT 0;
        DECLARE mobileNumber,genderType,pincode VARCHAR(20) DEFAULT '';
        DECLARE emailAddress VARCHAR(50) DEFAULT '';
        DECLARE createdAt DATE;

        IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
            LEAVE verifyEmailAddress;
        ELSE
            SET emailVerifyKey = JSON_UNQUOTE(JSON_EXTRACT(inputData,'$.email_verify_key'));
            IF emailVerifyKey IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE verifyEmailAddress;
            END IF;
        END IF;

        SELECT id, email_verified, CONCAT_WS(' ', first_name, last_name), mobile_number, email_address,
                CASE WHEN gender = 1 THEN 'Male' WHEN gender = 2 THEN 'Female' WHEN gender = 3 THEN 'Other' ELSE '' END, pin_code, created_at
        INTO customerId,emailVerified,customerName,mobileNumber,emailAddress,genderType,pincode,createdAt
        FROM customer_loyalty
        WHERE email_verify_key = emailVerifyKey;

        IF customerId = 0 THEN
            SELECT JSON_OBJECT('status','SUCCESS','message','Invalid email verification link','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
            LEAVE verifyEmailAddress;
        ELSEIF emailVerified = 1 THEN
            SELECT JSON_OBJECT('status','SUCCESS','message','Email already verified','data',JSON_OBJECT('statusCode',105),'statusCode',105) AS response;
            LEAVE verifyEmailAddress;
        ELSE
            UPDATE customer_loyalty SET email_verified = 1 WHERE id = customerId;
            IF ROW_COUNT() = 0 THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Failed to verify email address.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE verifyEmailAddress;
            ELSE
                SELECT JSON_OBJECT('status', 'SUCCESS', 'message', 'Email verified successfully.','data',JSON_OBJECT('customerName',customerName,'customerNameOne',customerName,'mobileNumber',mobileNumber,'emailAddress',emailAddress,'genderType',genderType,'pincode',pincode,'createdAt',createdAt,'toEmail',emailAddress),'statusCode',200) AS response;
                LEAVE verifyEmailAddress;
            END IF;
        END IF;
    END$$
DELIMITER ;