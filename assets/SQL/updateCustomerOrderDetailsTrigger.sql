DELIMITER $$
DROP TRIGGER IF EXISTS updateCustomerOrderDetailsTrigger$$
CREATE TRIGGER updateCustomerOrderDetailsTrigger
BEFORE INSERT ON customer_order_details FOR EACH ROW
    BEGIN
        DECLARE mobileNumber,storeCode,invoiceNumber,productSku VARCHAR(20) DEFAULT '';
        DECLARE customerId,productId,orderId INTEGER DEFAULT 0;
        DECLARE orderDate DATE DEFAULT NULL;
        SELECT NEW.mobile_number, NEW.store_code, NEW.order_date, NEW.invoice_number INTO mobileNumber,storeCode,orderDate,invoiceNumber;

        IF (NEW.order_id = NULL OR NEW.order_id = 0 OR NEW.order_id = '') AND storeCode != '' AND (orderDate != NULL OR orderDate != '') AND invoiceNumber != '' THEN
            IF EXISTS (SELECT id FROM customer_orders WHERE mobile_number = mobileNumber AND store_code = storeCode AND order_number = invoiceNumber AND order_date = orderDate) THEN
				SELECT id,customer_loyalty_id INTO orderId,customerId
				FROM customer_orders 
				WHERE mobile_number = mobileNumber AND store_code = storeCode 
				AND order_number = invoiceNumber AND order_date = orderDate;
				SET NEW.customer_loyalty_id = customerId, NEW.order_id = orderId, NEW.product_id = (SELECT id FROM product_masters WHERE sku = productSku LIMIT 1);                
            END IF;
        END IF;
    END$$
DELIMITER ;