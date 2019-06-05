DELIMITER $$
DROP PROCEDURE IF EXISTS `createDynamicCoupon`$$
CREATE PROCEDURE `createDynamicCoupon`(IN inputData JSON, OUT response JSON)
createDynamicCoupon:BEGIN

DECLARE couponFor,couponRewardType TINYINT(1) DEFAULT 0;
DECLARE quantity,existCouponCount INTEGER DEFAULT 0;
DECLARE couponValue VARCHAR(20);
DECLARE couponCode VARCHAR(10) DEFAULT NULL;
DECLARE couponValidity DATE;

    -- check input data is valid or not
    IF inputData IS NOT NULL AND JSON_VALID(inputData) = 0 THEN
        SET response = JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520);
        LEAVE createDynamicCoupon;
    ELSE

        SET couponFor = JSON_EXTRACT(inputData,'$.coupon_for');
        SET quantity = JSON_EXTRACT(inputData,'$.quantity');
        SET couponValue = JSON_UNQUOTE(JSON_EXTRACT(inputData,'$.coupon_value'));
        SET couponRewardType = JSON_EXTRACT(inputData,'$.coupon_reward_type');
        SET couponValidity = '2021-04-30';

        START TRANSACTION;
        do_this:LOOP

            -- SELECT lpad(conv(floor(rand()*pow(36,8)), 10, 36), 10, 0) INTO couponCode;
            SELECT LPAD(FLOOR(RAND() * 10000000000), 10, '0') INTO couponCode;

            SELECT COUNT(*) INTO existCouponCount FROM pre_populated_coupons WHERE coupon_code = couponCode;

            IF existCouponCount = 0 THEN

                INSERT INTO pre_populated_coupons (coupon_reward_type,coupon_code,coupon_value,coupon_validity,coupon_for,created_by)
                VALUES (couponRewardType,couponCode,couponValue,couponValidity,couponFor,1);

                IF LAST_INSERT_ID() = 0 THEN
                    ROLLBACK;
                    SET response = JSON_OBJECT('status','FAILURE','message','Failed to generate coupon.','statusCode',104);
                    LEAVE createDynamicCoupon;
                END IF;

                SET quantity = quantity - 1;
                IF quantity = 0 THEN
                    LEAVE do_this;
                END IF;

            END IF;
        END LOOP do_this;

        COMMIT;
        SET response = JSON_OBJECT('status','SUCCESS','message','Dynamic coupon are generated successfully.','statusCode',200);
        LEAVE createDynamicCoupon;

    END IF;
END$$
DELIMITER ;