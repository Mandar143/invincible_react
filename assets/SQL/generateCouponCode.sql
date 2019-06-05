DELIMITER $$
DROP PROCEDURE IF EXISTS `generateCouponCode`$$
/* CREATE PROCEDURE `generateCouponCode`(IN inputData JSON, OUT response JSON)
generateCouponCode:BEGIN

DECLARE customerLoyaltyId,merchantId INTEGER(10) Default 0;
DECLARE couponCode VARCHAR(20) Default '';

	-- check input data is valid or not
	IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SET response = JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520);
        LEAVE generateCouponCode;
    ELSE
        SET customerLoyaltyId = JSON_EXTRACT(inputData,'$.customer_loyalty_id');
	    -- generate dynamic coupon code
	    SELECT UPPER(SUBSTR(REPLACE(UUID(),'-',''),1,6)) INTO couponCode;

	    -- If new generated coupon code is not present
	    IF NOT EXISTS(SELECT * FROM merchant_coupons WHERE coupon_code = couponCode AND (customer_loyalty_id = 0 OR customer_loyalty_id = customerLoyaltyId)) THEN
            SET response = JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520);
            -- SET response = JSON_SET(response,'$.status','SUCCESS', '$.data',JSON_OBJECT('couponCode',couponCode), '$.message', 'Invalid user.','$.statusCode',105);
	    	LEAVE generateCouponCode;
	    ELSE
	    	inner_block: BEGIN
    			CALL generateCouponCode(inputData);
	    	END inner_block;
	    END IF;
	END IF;

END$$ */

-- CREATE PROCEDURE `generateCouponCode`(IN `couponFor` INT(10), OUT `couponCode` VARCHAR(20))
CREATE PROCEDURE `generateCouponCode`(IN inputData JSON, OUT response JSON)
generateCouponCode:BEGIN

DECLARE couponCode,couponValue VARCHAR (20) Default NULL;
DECLARE couponCodeId INTEGER;
DECLARE couponValidity DATE;
DECLARE couponFor TINYINT(1) DEFAULT 0;

    -- generate dynamic coupon code
    -- SELECT UPPER(SUBSTR(REPLACE(UUID(),'-',''),1,10)) INTO couponCode;
    -- SELECT lpad(conv(floor(rand()*pow(36,8)), 10, 36), 10, 0) INTO couponCode;

    -- If new generated coupon code is not present
    /* IF NOT EXISTS(SELECT * FROM merchant_coupons WHERE coupon_code LIKE couponCode AND customer_loyalty_id = customerLoyaltyId) THEN
        LEAVE generateCouponCode;
    ELSE
        inner_block: BEGIN
        CALL generateCouponCode();
        END inner_block;
    END IF; */

    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SET response = JSON_OBJECT('status','FAILURE','message','Please provide valid data.','data',JSON_OBJECT(),'statusCode',520);
        LEAVE generateCouponCode;
    ELSE
        SET couponFor = JSON_EXTRACT(inputData,'$.coupon_for');

        SELECT id,coupon_code,coupon_value INTO couponCodeId,couponCode,couponValue FROM pre_populated_coupons WHERE coupon_for = couponFor AND coupon_used = 0 AND status = 1 ORDER BY RAND() LIMIT 1;

        IF ROW_COUNT() = 0 THEN
            SET response = JSON_OBJECT('status','FAILURE','message','No record found.','data',JSON_OBJECT(),'statusCode',104);
        ELSE
            SET couponValidity = DATE_ADD(CURDATE(), INTERVAL 90 DAY);
            SET response = JSON_OBJECT('status','SUCCESS','message','Coupon code fetched successfully.','data',JSON_OBJECT('statusCode',200,'coupon_code_id',couponCodeId,'coupon_code',couponCode,'coupon_validity',couponValidity,'coupon_value',couponValue),'statusCode',200);
        END IF;
        LEAVE generateCouponCode;
    END IF;

END$$
DELIMITER ;