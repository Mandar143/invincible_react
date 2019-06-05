DELIMITER $$
DROP PROCEDURE IF EXISTS getPOSDashboardDetails$$
CREATE PROCEDURE `getPOSDashboardDetails`(IN posDetailsInput JSON)
getPOSDashboardDetails:BEGIN
	DECLARE notFound,userId,locationId,subMerchantId,customerLoyaltyId,activeCustCount,
			dormantCustCount,lapsedCustCount,lostCustCount,custCount,monthId,orderCount INTEGER DEFAULT 0;
	DECLARE chartType,chartTypeValue,averageTransactionsPerCustomer,averageTransactions,highestSales,numberOfMembers,valueOfRewards,monthName,weekend,weekdays,locationIds VARCHAR(255) DEFAULT NULL;
	DECLARE startDate,endDate,orderDate,createdAt DATE DEFAULT NULL;
	DECLARE orderDetails,avgTrans,numOfMembers,storeRegisteredCust,storeSale,storeRedemption,genderPercentageDetails,statusDetails,statusDetailsNew JSON DEFAULT JSON_OBJECT();
	DECLARE averageTransactionsDetails,averageTransactionsPerCustomerDetails,highestSalesDetails,numberOfMembersDetails,valueOfRewardsDetails,storeRegisteredCustomersDetails,storeSalesDetails,storeRedemptionsDetails,weekendDetails,weekdaysDetails,weekendWeekdaysDetails JSON DEFAULT JSON_ARRAY();
	DECLARE storeRegisteredCustomers,storeSales,storeRedemptions,sumCalculatedAmount,avgCalculatedAmount,maxCalculatedAmount FLOAT (14,2);
	DECLARE userTypeId TINYINT(1) DEFAULT 0;

	SET userId = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.user_id'));
	SET chartType = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.chart_type'));
	SET chartTypeValue = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.chart_type_value'));
	SET userTypeId = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.user_type_id'));
	SET subMerchantId = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.sub_merchant_id'));

	-- set location ids
	IF userTypeId = 5 THEN
		SET locationIds = JSON_EXTRACT(posDetailsInput,'$.sub_merchant_location_id');
	ELSE
		SELECT GROUP_CONCAT(id) INTO locationIds FROM sub_merchant_locations WHERE sub_merchant_id = subMerchantId;
	END IF;

	IF userId IS NOT NULL AND chartType = 'month' AND chartTypeValue='Average Transaction (INR)' THEN

		/* block1:BEGIN
			DECLARE orderCursor1 CURSOR FOR
			SELECT m.name AS name,

				(SELECT SUM(calculated_amount) / (SELECT COUNT(*) FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) <= m.id) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = m.id) AS average_transaction_value_per_customer,
				(SELECT AVG(calculated_amount) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = m.id) AS average_transaction,
				(SELECT MAX(calculated_amount) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = m.id) AS highest_sales,
				(SELECT COUNT(DISTINCT(customer_loyalty_id)) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND MONTH(order_date) = m.id AND customer_loyalty_id != 0) AS number_of_members,
				IFNULL((SELECT SUM(calculated_amount) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND MONTH(order_date) = m.id AND customer_loyalty_id != 0),0) AS value_of_rewards,

				((SELECT COUNT(*) FROM customer_loyalty WHERE MONTH(created_at) = m.id AND IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1)) /
				(SELECT COUNT(*) FROM customer_loyalty WHERE MONTH(created_at) = m.id) * 100) AS store_registered_customers,

				((SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = m.id AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1)) /
				(SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = m.id) * 100) AS store_sales,

				((SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = m.id AND voucher_applied IS NOT NULL AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1)) /
				(SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = m.id AND voucher_applied IS NOT NULL) * 100) AS store_redemptions,

				(SELECT ((COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1 = 1) AND MONTH(order_date) = m.id)) * 100) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) IN (1,7) AND MONTH(order_date) = m.id GROUP BY month(order_date)) AS weekend,
				(SELECT ((COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1 = 1) AND MONTH(order_date) = m.id)) * 100) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) NOT IN(1,7) AND MONTH(order_date) = m.id GROUP BY month(order_date)) AS weekdays

			FROM months m LEFT JOIN customer_orders p ON m.id = MONTH(p.order_date) GROUP BY m.id, m.name, MONTH(p.order_date) ORDER BY m.id;
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor1;
			orderLoop1: LOOP
				FETCH orderCursor1 INTO monthName, averageTransactionsPerCustomer,averageTransactions, highestSales, numberOfMembers, valueOfRewards, storeRegisteredCustomers, storeSales, storeRedemptions, weekend, weekdays;
				IF(notFound = 1) THEN
					LEAVE orderLoop1;
				END IF;
				SET averageTransactionsPerCustomerDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactionsPerCustomer,2),0)));
				SET averageTransactionsDetails = JSON_ARRAY_APPEND(averageTransactionsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactions,2),0)));
                SET highestSalesDetails = JSON_ARRAY_APPEND(highestSalesDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(highestSales,2),0)));
				SET numberOfMembersDetails = JSON_ARRAY_APPEND(numberOfMembersDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(numberOfMembers,2),0)));
                SET valueOfRewardsDetails = JSON_ARRAY_APPEND(valueOfRewardsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(valueOfRewards,2),0)));
				SET storeRegisteredCustomersDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeRegisteredCustomers,2),0)));
                SET storeSalesDetails = JSON_ARRAY_APPEND(storeSalesDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeSales,2),0)));
				SET storeRedemptionsDetails = JSON_ARRAY_APPEND(storeRedemptionsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeRedemptions,2),0)));
				SET weekendDetails = JSON_ARRAY_APPEND(weekendDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(weekend,2),0)));
				SET weekdaysDetails = JSON_ARRAY_APPEND(weekdaysDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(weekdays,2),0)));
			END LOOP orderLoop1;
		END block1; */


		block1:BEGIN
			DECLARE orderCursor1 CURSOR FOR
			SELECT id, name FROM months;
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor1;
			orderLoop1: LOOP
				FETCH orderCursor1 INTO monthId, monthName;
				IF(notFound = 1) THEN
					LEAVE orderLoop1;
				END IF;

				SET averageTransactionsPerCustomer = (SELECT SUM(calculated_amount) / (SELECT COUNT(*) FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) <= monthId) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = monthId);
				SET averageTransactions = (SELECT AVG(calculated_amount) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = monthId);
				SET highestSales = (SELECT MAX(calculated_amount) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = monthId);
				SET numberOfMembers = (SELECT COUNT(DISTINCT(customer_loyalty_id)) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND MONTH(order_date) = monthId AND customer_loyalty_id != 0);
				SET valueOfRewards = IFNULL((SELECT SUM(calculated_amount) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND MONTH(order_date) = monthId AND customer_loyalty_id != 0),0);

				/* SET storeRegisteredCustomers = (SELECT (SELECT COUNT(*) FROM customer_loyalty WHERE MONTH(created_at) = monthId AND IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1)) /
				(SELECT COUNT(*) FROM customer_loyalty WHERE MONTH(created_at) = monthId) * 100); */

				SELECT IF(COUNT(*) > 0, ((SELECT COUNT(*) FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) = monthId) / COUNT(*)) * 100, 0) INTO storeRegisteredCustomers FROM customer_loyalty WHERE MONTH(created_at) = monthId;

				/* SET storeSales = ((SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = monthId AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1)) /
				(SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = monthId) * 100); */

				SET storeSales = (SELECT IF(COUNT(*) > 0,( (SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = monthId AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1)) / COUNT(*) ) * 100, 0) FROM customer_orders WHERE MONTH(order_date) = monthId);

				/* SET storeRedemptions = ((SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = monthId AND voucher_applied IS NOT NULL AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1)) /
				(SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = monthId AND voucher_applied IS NOT NULL) * 100); */

				SELECT IF(COUNT(*) > 0, ( (SELECT COUNT(*) FROM customer_orders WHERE MONTH(order_date) = monthId AND voucher_applied IS NOT NULL AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1)) / COUNT(*)) * 100, 0) INTO storeRedemptions FROM customer_orders WHERE MONTH(order_date) = monthId AND voucher_applied IS NOT NULL;

				/* SET weekend = (SELECT ((COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1 = 1) AND MONTH(order_date) = monthId)) * 100) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) IN (1,7) AND MONTH(order_date) = monthId GROUP BY month(order_date)); */

				SELECT IF(COUNT(*) > 0, ( (SELECT COUNT(*) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) IN (1,7) AND MONTH(order_date) = monthId) / COUNT(*)) * 100, 0) INTO weekend FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1 = 1) AND MONTH(order_date) = monthId;

				/* SET weekdays = (SELECT ((COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1 = 1) AND MONTH(order_date) = monthId)) * 100) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) NOT IN(1,7) AND MONTH(order_date) = monthId GROUP BY month(order_date)); */

				SELECT IF(COUNT(*) > 0, ( (SELECT COUNT(*) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) NOT IN (1,7) AND MONTH(order_date) = monthId) / COUNT(*)) * 100, 0) INTO weekdays FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1 = 1) AND MONTH(order_date) = monthId;

				SET averageTransactionsPerCustomerDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactionsPerCustomer,2),0)));
				SET averageTransactionsDetails = JSON_ARRAY_APPEND(averageTransactionsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactions,2),0)));
                SET highestSalesDetails = JSON_ARRAY_APPEND(highestSalesDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(highestSales,2),0)));
				SET numberOfMembersDetails = JSON_ARRAY_APPEND(numberOfMembersDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(numberOfMembers,2),0)));
                SET valueOfRewardsDetails = JSON_ARRAY_APPEND(valueOfRewardsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(valueOfRewards,2),0)));
				SET storeRegisteredCustomersDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeRegisteredCustomers,2),0)));
                SET storeSalesDetails = JSON_ARRAY_APPEND(storeSalesDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeSales,2),0)));
				SET storeRedemptionsDetails = JSON_ARRAY_APPEND(storeRedemptionsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeRedemptions,2),0)));
				SET weekendDetails = JSON_ARRAY_APPEND(weekendDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(weekend,2),0)));
				SET weekdaysDetails = JSON_ARRAY_APPEND(weekdaysDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(weekdays,2),0)));
			END LOOP orderLoop1;
		END block1;

		-- Gender breakup
		SELECT CONCAT('[',
			JSON_OBJECT('name','Male','count',SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Female','count',SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Other','count',SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END)/count(*),2),0))
			,']') INTO genderPercentageDetails
		FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1);

		-- Member active and inactive
		SELECT CONCAT('[',
			JSON_OBJECT('name','Active','count',SUM(CASE WHEN cl.status = 1 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 1 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Inactive','count',SUM(CASE WHEN cl.status = 0 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 0 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Deleted','count',SUM(CASE WHEN cl.status = 2 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 2 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Blocked','count',SUM(CASE WHEN cl.status = 3 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 3 THEN 1 ELSE 0 END)/count(*),2),0))
			,']') INTO statusDetails
		FROM customer_loyalty as cl WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);

		SET notFound = 0;
		block2:BEGIN
			DECLARE orderCursor2 CURSOR FOR
			SELECT id FROM customer_loyalty as cl WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor2;
			orderLoop2: LOOP
				FETCH orderCursor2 INTO customerLoyaltyId;
				IF(notFound = 1) THEN
					LEAVE orderLoop2;
				END IF;

				SELECT order_date INTO orderDate FROM customer_orders WHERE customer_loyalty_id = customerLoyaltyId ORDER BY id DESC LIMIT 1;
				IF orderDate IS NOT NULL THEN
					SET custCount = custCount + 1;
					IF (orderDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 8 MONTH) AND CURDATE()) THEN
						SET activeCustCount = activeCustCount + 1;
					ELSEIF (orderDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 8 MONTH)) THEN
						SET dormantCustCount = dormantCustCount + 1;
					ELSEIF (orderDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 24 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 12 MONTH)) THEN
						SET lapsedCustCount = lapsedCustCount + 1;
					ELSE
						SET lostCustCount = lostCustCount + 1;
					END IF;
				END IF;

			END LOOP orderLoop2;
		END block2;

		SELECT CONCAT('[',
			JSON_OBJECT('name','Active','count',activeCustCount,'value',IFNULL(ROUND(100*(activeCustCount/custCount),2),0)),',',
			JSON_OBJECT('name','Dormant','count',dormantCustCount,'value',IFNULL(ROUND(100*(dormantCustCount/custCount),2),0)),',',
			JSON_OBJECT('name','Lapsed','count',lapsedCustCount,'value',IFNULL(ROUND(100*(lapsedCustCount/custCount),2),0)),',',
			JSON_OBJECT('name','Lost','count',lostCustCount,'value',IFNULL(ROUND(100*(lostCustCount/custCount),2),0))
			,']') INTO statusDetailsNew;

		-- weekend - weekdays details
		SET weekendWeekdaysDetails = JSON_ARRAY_APPEND(weekendWeekdaysDetails,'$',JSON_OBJECT('name','Weekday','series',weekdaysDetails));
		SET weekendWeekdaysDetails = JSON_ARRAY_APPEND(weekendWeekdaysDetails,'$',JSON_OBJECT('name','Weekend','series',weekendDetails));

		SELECT JSON_OBJECT('average_transaction_value_per_customer',averageTransactionsPerCustomerDetails,'status_details_new',statusDetailsNew,'highOrder_details',highestSalesDetails,'average_trans',averageTransactionsDetails,'gender_details',genderPercentageDetails,'user_status',statusDetails,'number_of_members',numberOfMembersDetails,'value_of_rewards',valueOfRewardsDetails,'store_registered_customers',storeRegisteredCustomersDetails,'store_sales',storeSalesDetails,'store_redemptions',storeRedemptionsDetails,'weekend_details',weekendDetails,'weekdays_details',weekdaysDetails,'weekend_weekdays_details',weekendWeekdaysDetails) AS response;
		LEAVE getPOSDashboardDetails;

	ELSE
		SET startDate = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.start_date'));
		SET endDate = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.end_date'));

		IF (SELECT IFNULL(NULL, DATE(startDate))) IS NULL THEN
			SELECT JSON_OBJECT('status','FAILURE','message','Incorrect start date value.','data',JSON_OBJECT(),'statusCode',103) AS response;
			LEAVE getPOSDashboardDetails;
		END IF;

		IF (SELECT IFNULL(NULL, DATE(endDate))) IS NULL THEN
			SELECT JSON_OBJECT('status','FAILURE','message','Incorrect end date value.','data',JSON_OBJECT(),'statusCode',103) AS response;
			LEAVE getPOSDashboardDetails;
		END IF;

		IF startDate IS NULL AND endDate IS NULL THEN
			SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input.','data',posDetailsInput,'statusCode',520) AS response;
			LEAVE getPOSDashboardDetails;
		END IF;
		/* block1:BEGIN
			DECLARE orderCursor1 CURSOR FOR
			SELECT co.order_date,
				(SELECT SUM(calculated_amount) / (SELECT COUNT(*) FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) <= endDate) FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND order_date = co.order_date) AS average_transaction_value_per_customer,
				(SELECT AVG(calculated_amount) FROM customer_orders WHERE location_id = co.location_id AND order_date = co.order_date) AS average_transaction,
				(SELECT MAX(calculated_amount) FROM customer_orders WHERE location_id = co.location_id AND order_date = co.order_date) AS highest_sales,
				(SELECT ((COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE location_id = co.location_id AND order_date = co.order_date)) * 100) FROM customer_orders WHERE location_id = co.location_id AND DAYOFWEEK(order_date) IN (1,7) AND order_date = co.order_date) AS weekend,
				(SELECT ((COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE location_id = co.location_id AND order_date = co.order_date)) * 100) FROM customer_orders WHERE location_id = co.location_id AND DAYOFWEEK(order_date) NOT IN(1,7) AND order_date = co.order_date) AS weekdays
			FROM `customer_orders` co WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND (DATE(co.order_date) BETWEEN startDate AND endDate) GROUP BY co.order_date;
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor1;
			orderLoop1: LOOP
				FETCH orderCursor1 INTO orderDate, averageTransactionsPerCustomer, averageTransactions, highestSales, weekend, weekdays;
				IF(notFound = 1) THEN
					LEAVE orderLoop1;
				END IF;
				SET averageTransactionsPerCustomerDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactionsPerCustomer,2),0)));
				SET averageTransactionsDetails = JSON_ARRAY_APPEND(averageTransactionsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(averageTransactions, 2), 0)));
                SET highestSalesDetails = JSON_ARRAY_APPEND(highestSalesDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(highestSales, 2), 0)));
				SET weekendDetails = JSON_ARRAY_APPEND(weekendDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(weekend,2),0)));
				SET weekdaysDetails = JSON_ARRAY_APPEND(weekdaysDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(weekdays,2),0)));
			END LOOP orderLoop1;
		END block1; */

		block1:BEGIN
			DECLARE orderCursor1 CURSOR FOR
			SELECT co.order_date, COUNT(*), SUM(co.calculated_amount), AVG(co.calculated_amount), MAX(calculated_amount) FROM `customer_orders` co WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND (DATE(co.order_date) BETWEEN startDate AND endDate) GROUP BY co.order_date;
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor1;
			orderLoop1: LOOP
				FETCH orderCursor1 INTO orderDate, orderCount, sumCalculatedAmount, avgCalculatedAmount, maxCalculatedAmount;
				IF(notFound = 1) THEN
					LEAVE orderLoop1;
				END IF;

				SELECT sumCalculatedAmount / (SELECT COUNT(*) FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) <= endDate) INTO averageTransactionsPerCustomer;
				SELECT ((COUNT(*) / orderCount) * 100) INTO weekend FROM customer_orders WHERE DAYOFWEEK(order_date) IN (1,7) AND order_date = orderDate;
				SELECT ((COUNT(*) / orderCount) * 100) INTO weekdays FROM customer_orders WHERE DAYOFWEEK(order_date) NOT IN(1,7) AND order_date = orderDate;
				SELECT orderCount / (SELECT COUNT(*) FROM customer_orders WHERE order_date = orderDate) INTO storeSales;

				SET averageTransactionsPerCustomerDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(averageTransactionsPerCustomer,2),0)));
				SET averageTransactionsDetails = JSON_ARRAY_APPEND(averageTransactionsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(avgCalculatedAmount, 2), 0)));
                SET highestSalesDetails = JSON_ARRAY_APPEND(highestSalesDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(maxCalculatedAmount, 2), 0)));
				SET weekendDetails = JSON_ARRAY_APPEND(weekendDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(weekend,2),0)));
				SET weekdaysDetails = JSON_ARRAY_APPEND(weekdaysDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(weekdays,2),0)));
				SET storeSalesDetails = JSON_ARRAY_APPEND(storeSalesDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(storeSales,2),0)));
			END LOOP orderLoop1;
		END block1;

        SET notFound = 0;
		block2:BEGIN
			DECLARE orderCursor CURSOR FOR
            SELECT order_date, COUNT(DISTINCT(customer_loyalty_id)), SUM(calculated_amount), (COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE date(order_date) BETWEEN startDate AND endDate AND voucher_applied IS NOT NULL)) * 100 FROM customer_orders WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND customer_loyalty_id != 0 AND date(order_date) BETWEEN startDate AND endDate GROUP BY order_date;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor;
			orderLoop: LOOP
				FETCH orderCursor INTO orderDate, numberOfMembers, valueOfRewards, storeRedemptions;
				IF(notFound = 1) THEN
					LEAVE orderLoop;
				END IF;
				SET numberOfMembersDetails = JSON_ARRAY_APPEND(numberOfMembersDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(numberOfMembers, 2), 0)));
                SET valueOfRewardsDetails = JSON_ARRAY_APPEND(valueOfRewardsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(valueOfRewards, 2), 0)));
				SET storeRedemptionsDetails = JSON_ARRAY_APPEND(storeRedemptionsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(storeRedemptions,2),0)));
			END LOOP orderLoop;
		END block2;

		-- SELECT IF(COUNT(*) > 0, ((SELECT COUNT(*) FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND DATE(created_at) BETWEEN startDate AND endDate) / COUNT(*)) * 100, 0) INTO storeRegisteredCustomers FROM customer_loyalty WHERE DATE(created_at) BETWEEN startDate AND endDate;
		SET notFound = 0;
		block3:BEGIN
			DECLARE storeRegisteredCustCursor CURSOR FOR
			SELECT JSON_OBJECT('name', DATE_FORMAT(cl.created_at, '%Y-%m-%d'),
				'value', IFNULL(ROUND(((COUNT(*) / (SELECT COUNT(*) FROM customer_loyalty WHERE DATE(created_at) = DATE(cl.created_at))) * 100), 2), 0))
			FROM customer_loyalty cl
			WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1) AND DATE(cl.created_at) BETWEEN startDate AND endDate
    		GROUP BY DATE_FORMAT(cl.created_at, '%y-%m-%d');

			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN storeRegisteredCustCursor;
			storeRegisteredCustLoop: LOOP
				FETCH storeRegisteredCustCursor INTO storeRegisteredCust;
				IF(notFound = 1) THEN
					LEAVE storeRegisteredCustLoop;
				END IF;
				SET storeRegisteredCustomersDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersDetails,'$',storeRegisteredCust);
			END LOOP storeRegisteredCustLoop;
		END block3;

		/* SET notFound = 0;
		block4:BEGIN
			DECLARE storeSaleCursor CURSOR FOR
			SELECT JSON_OBJECT('name', co.order_date,
				'value', IFNULL(ROUND(( ( COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE order_date = co.order_date) ) * 100 ), 2), 0))
			FROM customer_orders co
			WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(co.location_id, locationIds), 1=1) AND DATE(co.order_date) BETWEEN startDate AND endDate
			GROUP BY co.order_date;

			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN storeSaleCursor;
			storeSaleLoop: LOOP
				FETCH storeSaleCursor INTO storeSale;
				IF(notFound = 1) THEN
					LEAVE storeSaleLoop;
				END IF;
				SET storeSalesDetails = JSON_ARRAY_APPEND(storeSalesDetails,'$',storeSale);
			END LOOP storeSaleLoop;
		END block4; */

		/* SET notFound = 0;
		block5:BEGIN
			DECLARE storeRedemptionCursor CURSOR FOR
			SELECT JSON_OBJECT('name', co.order_date,
				'value', IFNULL(ROUND(( ( COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE order_date = co.order_date AND voucher_applied IS NOT NULL) ) * 100 ), 2), 0))
			FROM customer_orders co
			WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(co.location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND DATE(co.order_date) BETWEEN startDate AND endDate
			GROUP BY co.order_date;

			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN storeRedemptionCursor;
			storeRedemptionLoop: LOOP
				FETCH storeRedemptionCursor INTO storeRedemption;
				IF(notFound = 1) THEN
					LEAVE storeRedemptionLoop;
				END IF;
				SET storeRedemptionsDetails = JSON_ARRAY_APPEND(storeRedemptionsDetails,'$',storeRedemption);
			END LOOP storeRedemptionLoop;
		END block5; */

		SET notFound = 0;
		block6:BEGIN
			DECLARE orderCursor2 CURSOR FOR
			SELECT id FROM customer_loyalty as cl WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor2;
			orderLoop2: LOOP
				FETCH orderCursor2 INTO customerLoyaltyId;
				IF(notFound = 1) THEN
					LEAVE orderLoop2;
				END IF;

				SELECT order_date INTO orderDate FROM customer_orders WHERE customer_loyalty_id = customerLoyaltyId ORDER BY id DESC LIMIT 1;
				IF orderDate IS NOT NULL THEN
					SET custCount = custCount + 1;
					IF (orderDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 8 MONTH) AND CURDATE()) THEN
						SET activeCustCount = activeCustCount + 1;
					ELSEIF (orderDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 8 MONTH)) THEN
						SET dormantCustCount = dormantCustCount + 1;
					ELSEIF (orderDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 24 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 12 MONTH)) THEN
						SET lapsedCustCount = lapsedCustCount + 1;
					ELSE
						SET lostCustCount = lostCustCount + 1;
					END IF;
				END IF;

			END LOOP orderLoop2;
		END block6;

		SELECT CONCAT('[',
			JSON_OBJECT('name','Active','count',activeCustCount,'value',IFNULL(ROUND(100*(activeCustCount/custCount),2),0)),',',
			JSON_OBJECT('name','Dormant','count',dormantCustCount,'value',IFNULL(ROUND(100*(dormantCustCount/custCount),2),0)),',',
			JSON_OBJECT('name','Lapsed','count',lapsedCustCount,'value',IFNULL(ROUND(100*(lapsedCustCount/custCount),2),0)),',',
			JSON_OBJECT('name','Lost','count',lostCustCount,'value',IFNULL(ROUND(100*(lostCustCount/custCount),2),0))
			,']') INTO statusDetailsNew;

		-- Gender breakup
		SELECT CONCAT('[',
			JSON_OBJECT('name','Male','count',SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Female','count',SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Other','count',SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END)/count(*),2),0))
			,']') INTO genderPercentageDetails
		FROM customer_loyalty WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1);

		-- Member active and inactive
		SELECT CONCAT('[',
			JSON_OBJECT('name','Active','count',SUM(CASE WHEN cl.status = 1 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 1 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Inactive','count',SUM(CASE WHEN cl.status = 0 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 0 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Deleted','count',SUM(CASE WHEN cl.status = 2 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 2 THEN 1 ELSE 0 END)/count(*),2),0)),',',
			JSON_OBJECT('name','Blocked','count',SUM(CASE WHEN cl.status = 3 THEN 1 ELSE 0 END),'value',IFNULL(ROUND(100*SUM(CASE WHEN cl.status = 3 THEN 1 ELSE 0 END)/count(*),2),0))
			,']') INTO statusDetails
		FROM customer_loyalty as cl WHERE IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);

		-- weekend - weekdays details
		SET weekendWeekdaysDetails = JSON_ARRAY_APPEND(weekendWeekdaysDetails,'$',JSON_OBJECT('name','Weekday','series',weekdaysDetails));
		SET weekendWeekdaysDetails = JSON_ARRAY_APPEND(weekendWeekdaysDetails,'$',JSON_OBJECT('name','Weekend','series',weekendDetails));

		SELECT JSON_OBJECT('average_transaction_value_per_customer',averageTransactionsPerCustomerDetails,'status_details_new',statusDetailsNew,'highOrder_details',highestSalesDetails,'average_trans',averageTransactionsDetails,'gender_details',genderPercentageDetails,'user_status',statusDetails,'number_of_members',numberOfMembersDetails,'value_of_rewards',valueOfRewardsDetails,'store_registered_customers',storeRegisteredCustomersDetails,'store_sales',storeSalesDetails,'store_redemptions',storeRedemptionsDetails,'weekend_details',weekendDetails,'weekdays_details',weekdaysDetails,'weekend_weekdays_details',weekendWeekdaysDetails) AS response;
		LEAVE getPOSDashboardDetails;
	END IF;
	SET SESSION group_concat_max_len = 1024;
END$$
DELIMITER ;