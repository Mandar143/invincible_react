DELIMITER $$
DROP PROCEDURE IF EXISTS voucherValidation$$
CREATE PROCEDURE voucherValidation(IN inputVoucherData JSON)
    voucherValidation:BEGIN     
        DECLARE actualInvoiceNumber, voucherCode, invoiceNumber, storeCode, mobileNumber, redeemedAgainstInvoiceNumber VARCHAR(20) DEFAULT '';
        DECLARE orderDate,actualOrderDate DATE DEFAULT NULL;
        DECLARE voucherValue,actualVoucherValue,customerId INTEGER DEFAULT 0;
        
        IF inputVoucherData IS NOT NULL AND JSON_VALID(inputVoucherData) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520) AS response;
            LEAVE voucherValidation;
        ELSE
            SET voucherCode = JSON_UNQUOTE(JSON_EXTRACT(inputVoucherData,'$.voucher_code')); 
            SET invoiceNumber = JSON_UNQUOTE(JSON_EXTRACT(inputVoucherData,'$.invoice_number'));            
            SET storeCode = JSON_UNQUOTE(JSON_EXTRACT(inputVoucherData,'$.store_code'));    
            SET orderDate = JSON_UNQUOTE(JSON_EXTRACT(inputVoucherData,'$.order_date'));  
            SET voucherValue = JSON_EXTRACT(inputVoucherData,'$.voucher_value');    

            IF voucherCode IS NULL OR invoiceNumber IS NULL OR storeCode IS NULL OR orderDate IS NULL OR voucherValue IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of voucherValidation.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE voucherValidation;           
            END IF;  

            SELECT customer_loyalty_id, discounted_amount, mobile_number
            INTO customerId,actualVoucherValue,mobileNumber
            FROM customer_orders
            WHERE order_number = invoiceNumber 
            AND order_date = orderDate 
            AND store_code = storeCode;

            IF ROW_COUNT() = 0 THEN
                SELECT JSON_OBJECT('status','FAILURE','statusCode',101,'message','No record found for these details.','data',JSON_OBJECT()) AS response;
                LEAVE voucherValidation;           
            END IF;

            IF EXISTS (SELECT id FROM merchant_coupons WHERE coupon_code = voucherCode)  THEN
                IF (SELECT coupon_used FROM merchant_coupons WHERE customer_loyalty_id = customerId AND coupon_code = voucherCode) = 1 THEN
                    SELECT order_number INTO redeemedAgainstInvoiceNumber FROM customer_orders WHERE voucher_applied = voucherCode;
                    SELECT JSON_OBJECT('status','FAILURE','statusCode',103,'message','Voucher is already redeemed.','data',JSON_OBJECT('redeemed_invoice_number',redeemedAgainstInvoiceNumber)) AS response;
                    LEAVE voucherValidation; 
                ELSEIF NOT EXISTS (SELECT id FROM merchant_coupons WHERE customer_loyalty_id = customerId AND coupon_code = voucherCode) THEN
                    SELECT JSON_OBJECT('status','FAILURE','statusCode',104,'message','Redeeming customer is invalid.','data',JSON_OBJECT('mobile_number',mobileNumber)) AS response;
                    LEAVE voucherValidation;  
                ELSE
                    SELECT reward_type_x_value INTO actualVoucherValue FROM merchant_campaign_reward_values WHERE id = (SELECT merchant_campaign_reward_values_id FROM merchant_coupons WHERE customer_loyalty_id = customerId AND coupon_code = voucherCode LIMIT 1);
                    IF actualVoucherValue != voucherValue THEN
                        SELECT JSON_OBJECT('status','FAILURE','statusCode',102,'message','Voucher value is invalid.','data',JSON_OBJECT('actual_value',actualVoucherValue)) AS response;
                        LEAVE voucherValidation;  
                    END IF;
                    UPDATE merchant_coupons SET coupon_used = 1 WHERE customer_loyalty_id = customerId AND coupon_code = voucherCode;
                    IF ROW_COUNT() = 0 THEN
                        SELECT JSON_OBJECT('status','SUCCESS','message','Nothing to update.','data',JSON_OBJECT('statusCode',108),'statusCode',108) AS response;
                        LEAVE voucherValidation;  
                    ELSE
                        UPDATE customer_orders SET voucher_applied = voucherCode  WHERE order_number = invoiceNumber AND order_date = orderDate AND store_code = storeCode;
                        IF ROW_COUNT() = 0 THEN
                            SELECT JSON_OBJECT('status','SUCCESS','message','Nothing to update.','data',JSON_OBJECT('statusCode',108),'statusCode',108) AS response;
                            LEAVE voucherValidation;  
                        ELSE
                            SELECT JSON_OBJECT('status','SUCCESS','message','Record updated successfully.','data',JSON_OBJECT('statusCode',200),'statusCode',200) AS response;
                            LEAVE voucherValidation;
                        END IF; 
                    END IF;
                END IF;               
            ELSEIF EXISTS (SELECT id FROM customer_milestones WHERE coupon_code = voucherCode)  THEN
                IF (SELECT coupon_used FROM customer_milestones WHERE voucher_code = voucherCode) = 1 THEN
                    SELECT order_number INTO redeemedAgainstInvoiceNumber FROM customer_orders WHERE voucher_applied = voucherCode;
                    SELECT JSON_OBJECT('status','FAILURE','statusCode',103,'message','Voucher is already redeemed.','data',JSON_OBJECT('redeemed_invoice_number',redeemedAgainstInvoiceNumber)) AS response;
                    LEAVE voucherValidation; 
                ELSEIF NOT EXISTS (SELECT id FROM customer_milestones WHERE customer_loyalty_id = customerId AND voucher_code = voucherCode) THEN
                    SELECT JSON_OBJECT('status','FAILURE','statusCode',104,'message','Redeeming customer is invalid.','data',JSON_OBJECT('mobile_number',mobileNumber)) AS response;
                    LEAVE voucherValidation;  
                ELSE
                    SELECT voucher_value INTO actualVoucherValue FROM customer_milestones WHERE coupon_code = voucherCode LIMIT 1;
                    IF actualVoucherValue != voucherValue THEN
                        SELECT JSON_OBJECT('status','FAILURE','statusCode',102,'message','Voucher value is invalid.','data',JSON_OBJECT('actual_value',actualVoucherValue)) AS response;
                        LEAVE voucherValidation;  
                    END IF;
                    UPDATE customer_milestones SET coupon_used = 1 WHERE customer_loyalty_id = customerId AND voucher_code = voucherCode;
                    IF ROW_COUNT() = 0 THEN
                        SELECT JSON_OBJECT('status','SUCCESS','message','Nothing to update.','data',JSON_OBJECT('statusCode',108),'statusCode',108) AS response;
                        LEAVE voucherValidation;  
                    ELSE
                        UPDATE customer_orders SET voucher_applied = voucherCode  WHERE order_number = invoiceNumber AND order_date = orderDate AND store_code = storeCode; 
                        IF ROW_COUNT() = 0 THEN
                            SELECT JSON_OBJECT('status','SUCCESS','message','Nothing to update.','data',JSON_OBJECT('statusCode',108),'statusCode',108) AS response;
                            LEAVE voucherValidation;  
                        ELSE
                            SELECT JSON_OBJECT('status','SUCCESS','message','Record updated successfully.','data',JSON_OBJECT('statusCode',200),'statusCode',200) AS response;
                            LEAVE voucherValidation;
                        END IF;                        
                    END IF;
                END IF;
            ELSE
                SELECT JSON_OBJECT('status','FAILURE','statusCode',105,'message','Voucher code is invalid.','data',JSON_OBJECT()) AS response;
                LEAVE voucherValidation; 
            END IF;
        END IF;                     
    END$$
DELIMITER ;