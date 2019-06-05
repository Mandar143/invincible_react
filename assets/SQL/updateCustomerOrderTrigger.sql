DELIMITER $$
DROP TRIGGER IF EXISTS updateCustomerOrderTrigger$$
CREATE TRIGGER updateCustomerOrderTrigger
BEFORE INSERT ON customer_orders FOR EACH ROW
    BEGIN
        DECLARE mobileNumber,storeCode VARCHAR(20) DEFAULT '';
        DECLARE merchantId INTEGER DEFAULT 0;
        SELECT NEW.merchant_id,NEW.mobile_number,NEW.store_code INTO merchantId,mobileNumber,storeCode;

        IF NEW.customer_loyalty_id = 0 AND mobileNumber != '' AND merchantId != 0 THEN
            IF EXISTS (SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber AND merchant_id = merchantId) THEN
                SET NEW.customer_loyalty_id = (SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber AND merchant_id = merchantId LIMIT 1);
            END IF;
        END IF;

        IF NEW.location_id = 0 AND storeCode != '' THEN
            IF EXISTS(SELECT id FROM sub_merchant_locations WHERE store_code = storeCode) THEN
                SET NEW.location_id = (SELECT id FROM sub_merchant_locations WHERE store_code = storeCode LIMIT 1);
            END IF;
        END IF;
    END$$
DELIMITER ;