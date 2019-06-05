DELIMITER $$
DROP PROCEDURE IF EXISTS getPOSDashboardDetails$$
CREATE PROCEDURE `getPOSDashboardDetails`(IN posDetailsInput JSON)
getPOSDashboardDetails:BEGIN
	DECLARE notFound,userId,subMerchantId,customerLoyaltyId,activeCustCount,dormantCustCount,lapsedCustCount,lostCustCount,
			custCount,monthId,storeRegisteredCustomersCount,storeSalesCount,storeSalesVoucherCount,averageTransactionsPerCustomerCount,
			weekendCount,weekdayCount,registeredCustomersCount INTEGER DEFAULT 0;
	DECLARE chartType,chartTypeValue,averageTransactions,highestSales,numberOfMembers,valueOfRewards,
			monthName,weekend,weekdays VARCHAR(255) DEFAULT NULL;
	DECLARE startDate,endDate,orderDate,createdAt DATE DEFAULT NULL;
	DECLARE orderDetails,avgTrans,numOfMembers,storeRegisteredCust,storeSale,storeRedemption,
			genderPercentageDetails,statusDetails,statusDetailsNew JSON DEFAULT JSON_OBJECT();
	DECLARE averageTransactionsDetails,averageTransactionsPerCustomerValueDetails,
			averageTransactionsPerCustomerCountDetails,highestSalesDetails,numberOfMembersDetails,
			valueOfRewardsDetails,storeRegisteredCustomersPercentageDetails,storeRegisteredCustomersCountDetails,storeSalesPercentageDetails,storeSalesCountDetails,storeSalesValueDetails,storeRedemptionsCountDetails,
			storeRedemptionsDetails,weekendDetails,weekdaysDetails,weekendWeekdaysValDetails,weekendWeekdaysCouDetails,weekendWeekdaysDetailsRatio,
			weekendValueDetails,weekdaysValueDetails,weekendWeekdaysValueDetails,
			weekendCountDetails,weekdaysCountDetails,weekendWeekdaysCountDetails JSON DEFAULT JSON_ARRAY();
	DECLARE storeRegisteredCustomers,storeSales,storeRedemptions,averageTransactionsPerCustomerValue,
			weekendValue,weekdayValue,storeSalesValue FLOAT (14,2);
	DECLARE userTypeId TINYINT(1) DEFAULT 0;
	DECLARE locationIds TEXT DEFAULT NULL;

	SET userId = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.user_id'));
	SET chartType = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.chart_type'));
	SET chartTypeValue = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.chart_type_value'));
	SET userTypeId = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.user_type_id'));
	SET subMerchantId = JSON_UNQUOTE(JSON_EXTRACT(posDetailsInput,'$.sub_merchant_id'));

	-- set location ids
	IF userTypeId = 5 THEN
		SET locationIds = JSON_EXTRACT(posDetailsInput,'$.sub_merchant_location_id');
	ELSE
		SET locationIds = JSON_EXTRACT(posDetailsInput,'$.sub_merchant_location_id');
		IF locationIds = 0 THEN
			SELECT GROUP_CONCAT(id) INTO locationIds FROM sub_merchant_locations WHERE sub_merchant_id = subMerchantId;
		END IF;
	END IF;

	IF userId IS NOT NULL AND chartType = 'month' AND chartTypeValue='Average Transaction (INR)' THEN

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

				SELECT COUNT(*),AVG(calculated_amount),MAX(calculated_amount),SUM(calculated_amount) INTO storeSalesCount,averageTransactions,highestSales,storeSalesValue FROM customer_orders WHERE processed = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND MONTH(order_date) = monthId;

				SELECT IF(COUNT(*) > 0, (storeSalesValue / COUNT(*)),0), IF(COUNT(*) > 0, (storeSalesCount / COUNT(*)),0) INTO averageTransactionsPerCustomerValue,averageTransactionsPerCustomerCount FROM customer_loyalty WHERE is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) <= monthId;
				SELECT COUNT(DISTINCT(customer_loyalty_id)), SUM(calculated_amount), COUNT(*) INTO numberOfMembers,valueOfRewards,storeSalesVoucherCount FROM customer_orders WHERE processed = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND MONTH(order_date) = monthId AND customer_loyalty_id != 0;
				SELECT COUNT(*) INTO storeRegisteredCustomersCount FROM customer_loyalty WHERE is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) = monthId;
				SELECT IF(COUNT(*) > 0, (storeRegisteredCustomersCount / COUNT(*)) * 100, 0) INTO storeRegisteredCustomers FROM customer_loyalty WHERE is_loyalty_user = 1 AND MONTH(created_at) = monthId;
				SELECT IF(COUNT(*) > 0,( storeSalesCount / COUNT(*) ) * 100, 0) INTO storeSales FROM customer_orders WHERE processed = 1 AND MONTH(order_date) = monthId;
				SELECT IF(COUNT(*) > 0, ( storeSalesVoucherCount / COUNT(*)) * 100, 0) INTO storeRedemptions FROM customer_orders WHERE processed = 1 AND MONTH(order_date) = monthId AND voucher_applied IS NOT NULL;

				-- weekend and weekday(ratio, count and value)
 				SELECT COUNT(*), SUM(calculated_amount), IF(storeSalesCount > 0, (COUNT(*) / storeSalesCount) * 100, 0) INTO weekendCount,weekendValue,weekend FROM customer_orders WHERE processed = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) IN (1,7) AND MONTH(order_date) = monthId;
				SELECT COUNT(*), SUM(calculated_amount), IF(storeSalesCount > 0, (COUNT(*) / storeSalesCount) * 100, 0) INTO weekdayCount,weekdayValue,weekdays FROM customer_orders WHERE processed = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND DAYOFWEEK(order_date) NOT IN (1,7) AND MONTH(order_date) = monthId;

				SET averageTransactionsPerCustomerValueDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerValueDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactionsPerCustomerValue,2),0)));
				SET averageTransactionsPerCustomerCountDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerCountDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactionsPerCustomerCount,2),0)));
				SET averageTransactionsDetails = JSON_ARRAY_APPEND(averageTransactionsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(averageTransactions,2),0)));
                SET highestSalesDetails = JSON_ARRAY_APPEND(highestSalesDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(highestSales,2),0)));
				SET numberOfMembersDetails = JSON_ARRAY_APPEND(numberOfMembersDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(numberOfMembers,2),0)));
                SET valueOfRewardsDetails = JSON_ARRAY_APPEND(valueOfRewardsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(valueOfRewards,2),0)));

				IF userTypeId = 5 THEN
					SET storeRegisteredCustomersPercentageDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersPercentageDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeRegisteredCustomers,2),0)));
					SET storeSalesPercentageDetails = JSON_ARRAY_APPEND(storeSalesPercentageDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeSales,2),0)));
				END IF;

				IF userTypeId = 4 THEN
					SET storeSalesValueDetails = JSON_ARRAY_APPEND(storeSalesValueDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeSalesValue,2),0)));
				END IF;

				SET storeRegisteredCustomersCountDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersCountDetails,'$',JSON_OBJECT('name',monthName,'value',storeRegisteredCustomersCount));
				SET storeSalesCountDetails = JSON_ARRAY_APPEND(storeSalesCountDetails,'$',JSON_OBJECT('name',monthName,'value',storeSalesCount));
				SET storeRedemptionsCountDetails = JSON_ARRAY_APPEND(storeRedemptionsCountDetails,'$',JSON_OBJECT('name',monthName,'value',storeSalesVoucherCount));
				SET storeRedemptionsDetails = JSON_ARRAY_APPEND(storeRedemptionsDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(storeRedemptions,2),0)));

				SET weekdaysDetails = JSON_ARRAY_APPEND(weekdaysDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(weekdays,2),0)));
				SET weekendDetails = JSON_ARRAY_APPEND(weekendDetails,'$',JSON_OBJECT('name',monthName,'value',IFNULL(ROUND(weekend,2),0)));

				SET weekendWeekdaysValDetails = JSON_ARRAY_APPEND(weekendWeekdaysValDetails,'$',JSON_OBJECT('name','Weekday','value',IFNULL(ROUND(weekdayValue,2),0)));
				SET weekendWeekdaysValDetails = JSON_ARRAY_APPEND(weekendWeekdaysValDetails,'$',JSON_OBJECT('name','Weekend','value',IFNULL(ROUND(weekendValue,2),0)));
				SET weekendWeekdaysValueDetails = JSON_ARRAY_APPEND(weekendWeekdaysValueDetails, '$',JSON_OBJECT('name',monthName,'series',weekendWeekdaysValDetails));
				SET weekendWeekdaysValDetails = JSON_ARRAY();

				SET weekendWeekdaysCouDetails = JSON_ARRAY_APPEND(weekendWeekdaysCouDetails,'$',JSON_OBJECT('name','Weekday','value',IFNULL(ROUND(weekdayCount,2),0)));
				SET weekendWeekdaysCouDetails = JSON_ARRAY_APPEND(weekendWeekdaysCouDetails,'$',JSON_OBJECT('name','Weekend','value',IFNULL(ROUND(weekendCount,2),0)));
				SET weekendWeekdaysCountDetails = JSON_ARRAY_APPEND(weekendWeekdaysCountDetails, '$',JSON_OBJECT('name',monthName,'series',weekendWeekdaysCouDetails));
				SET weekendWeekdaysCouDetails = JSON_ARRAY();
			END LOOP orderLoop1;
		END block1;

		-- Gender breakup AND Member active and inactive
		SELECT
			CONCAT('[',
			JSON_OBJECT('name','Male','value',IFNULL(SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Female','value',IFNULL(SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Other','value',IFNULL(SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END),0))
			,']'),
			CONCAT('[',
			JSON_OBJECT('name','Active','value',IFNULL(SUM(CASE WHEN cl.status = 1 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Inactive','value',IFNULL(SUM(CASE WHEN cl.status = 0 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Deleted','value',IFNULL(SUM(CASE WHEN cl.status = 2 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Blocked','value',IFNULL(SUM(CASE WHEN cl.status = 3 THEN 1 ELSE 0 END),0))
			,']')
			INTO genderPercentageDetails,statusDetails
		FROM customer_loyalty as cl WHERE cl.is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);

		SET notFound = 0;
		block2:BEGIN
			DECLARE orderCursor2 CURSOR FOR
			SELECT id FROM customer_loyalty as cl WHERE cl.is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor2;
			orderLoop2: LOOP
				FETCH orderCursor2 INTO customerLoyaltyId;
				IF(notFound = 1) THEN
					LEAVE orderLoop2;
				END IF;

				SELECT order_date INTO orderDate FROM customer_orders WHERE processed = 1 AND customer_loyalty_id = customerLoyaltyId ORDER BY order_date DESC LIMIT 1;
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
				SET orderDate = NULL;

			END LOOP orderLoop2;
		END block2;

		SELECT CONCAT('[',
			JSON_OBJECT('name','Active','value',activeCustCount),',',
			JSON_OBJECT('name','Dormant','value',dormantCustCount),',',
			JSON_OBJECT('name','Lapsed','value',lapsedCustCount),',',
			JSON_OBJECT('name','Lost','value',lostCustCount)
			,']') INTO statusDetailsNew;

		-- weekend - weekdays details
		SET weekendWeekdaysDetailsRatio = JSON_ARRAY_APPEND(weekendWeekdaysDetailsRatio,'$',JSON_OBJECT('name','Weekday','series',weekdaysDetails));
		SET weekendWeekdaysDetailsRatio = JSON_ARRAY_APPEND(weekendWeekdaysDetailsRatio,'$',JSON_OBJECT('name','Weekend','series',weekendDetails));

		SELECT JSON_OBJECT('average_transaction_per_customer_value',averageTransactionsPerCustomerValueDetails,'average_transaction_per_customer_count',averageTransactionsPerCustomerCountDetails,'status_details_new',statusDetailsNew,'highOrder_details',highestSalesDetails,'average_trans',averageTransactionsDetails,'gender_details',genderPercentageDetails,'user_status',statusDetails,'number_of_members',numberOfMembersDetails,'value_of_rewards',valueOfRewardsDetails,'store_registered_customers_percentage',storeRegisteredCustomersPercentageDetails,'store_registered_customers_count',storeRegisteredCustomersCountDetails,'store_sales_percentage',storeSalesPercentageDetails,'store_sales_count',storeSalesCountDetails,'store_sales_value',storeSalesValueDetails,'store_redemptions',storeRedemptionsDetails,'store_redemptions_count',storeRedemptionsCountDetails,'weekend_details',weekendDetails,'weekdays_details',weekdaysDetails,'weekend_weekdays_details',weekendWeekdaysDetailsRatio,'weekend_weekdays_value_details',weekendWeekdaysValueDetails,'weekend_weekdays_count_details',weekendWeekdaysCountDetails) AS response;
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

		block1:BEGIN
			DECLARE orderCursor1 CURSOR FOR
			SELECT co.order_date, COUNT(*), SUM(co.calculated_amount), AVG(co.calculated_amount), MAX(calculated_amount) FROM `customer_orders` co WHERE co.processed = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND (DATE(co.order_date) BETWEEN startDate AND endDate) GROUP BY co.order_date;
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor1;
			orderLoop1: LOOP
				FETCH orderCursor1 INTO orderDate, storeSalesCount, storeSalesValue, averageTransactions, highestSales;
				IF(notFound = 1) THEN
					LEAVE orderLoop1;
				END IF;

				SELECT IF(COUNT(*) > 0, (storeSalesValue / COUNT(*)),0), IF(COUNT(*) > 0, (storeSalesCount / COUNT(*)),0) INTO averageTransactionsPerCustomerValue,averageTransactionsPerCustomerCount FROM customer_loyalty WHERE is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(home_branch_id, locationIds), 1=1) AND MONTH(created_at) <= MONTH(endDate);

				SELECT IF(storeSalesCount > 0, ((COUNT(*) / storeSalesCount) * 100), 0),COUNT(*), SUM(calculated_amount) INTO weekend,weekendCount,weekendValue FROM customer_orders WHERE processed = 1 AND DAYOFWEEK(order_date) IN (1,7) AND order_date = orderDate;
				SELECT IF(storeSalesCount > 0, ((COUNT(*) / storeSalesCount) * 100), 0),COUNT(*), SUM(calculated_amount) INTO weekdays,weekdayCount,weekdayValue FROM customer_orders WHERE processed = 1 AND DAYOFWEEK(order_date) NOT IN(1,7) AND order_date = orderDate;
				SELECT (storeSalesCount / (SELECT COUNT(*) FROM customer_orders WHERE processed = 1 AND order_date = orderDate)) * 100 INTO storeSales;

				SET averageTransactionsPerCustomerValueDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerValueDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(averageTransactionsPerCustomerValue,2),0)));
				SET averageTransactionsPerCustomerCountDetails = JSON_ARRAY_APPEND(averageTransactionsPerCustomerCountDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(averageTransactionsPerCustomerCount,2),0)));
				SET averageTransactionsDetails = JSON_ARRAY_APPEND(averageTransactionsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(averageTransactions, 2), 0)));
                SET highestSalesDetails = JSON_ARRAY_APPEND(highestSalesDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(highestSales, 2), 0)));

				IF userTypeId = 5 THEN
					SET storeSalesPercentageDetails = JSON_ARRAY_APPEND(storeSalesPercentageDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(storeSales,2),0)));
				END IF;
				IF userTypeId = 4 THEN
					SET storeSalesValueDetails = JSON_ARRAY_APPEND(storeSalesValueDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(storeSalesValue,2),0)));
				END IF;
				SET storeSalesCountDetails = JSON_ARRAY_APPEND(storeSalesCountDetails,'$',JSON_OBJECT('name',orderDate,'value',storeSalesCount));
				SET weekendDetails = JSON_ARRAY_APPEND(weekendDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(weekend,2),0)));
				SET weekdaysDetails = JSON_ARRAY_APPEND(weekdaysDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(weekdays,2),0)));

				SET weekendWeekdaysValDetails = JSON_ARRAY_APPEND(weekendWeekdaysValDetails,'$',JSON_OBJECT('name','Weekday','value',IFNULL(ROUND(weekdayValue,2),0)));
				SET weekendWeekdaysValDetails = JSON_ARRAY_APPEND(weekendWeekdaysValDetails,'$',JSON_OBJECT('name','Weekend','value',IFNULL(ROUND(weekendValue,2),0)));
				SET weekendWeekdaysValueDetails = JSON_ARRAY_APPEND(weekendWeekdaysValueDetails, '$',JSON_OBJECT('name',orderDate,'series',weekendWeekdaysValDetails));
				SET weekendWeekdaysValDetails = JSON_ARRAY();

				SET weekendWeekdaysCouDetails = JSON_ARRAY_APPEND(weekendWeekdaysCouDetails,'$',JSON_OBJECT('name','Weekday','value',IFNULL(ROUND(weekdayCount,2),0)));
				SET weekendWeekdaysCouDetails = JSON_ARRAY_APPEND(weekendWeekdaysCouDetails,'$',JSON_OBJECT('name','Weekend','value',IFNULL(ROUND(weekendCount,2),0)));
				SET weekendWeekdaysCountDetails = JSON_ARRAY_APPEND(weekendWeekdaysCountDetails, '$',JSON_OBJECT('name',orderDate,'series',weekendWeekdaysCouDetails));
				SET weekendWeekdaysCouDetails = JSON_ARRAY();

			END LOOP orderLoop1;
		END block1;

        SET notFound = 0;
		block2:BEGIN
			DECLARE orderCursor CURSOR FOR
            SELECT order_date, COUNT(*), COUNT(DISTINCT(customer_loyalty_id)), SUM(calculated_amount), (COUNT(*) / (SELECT COUNT(*) FROM customer_orders WHERE processed = 1 AND date(order_date) BETWEEN startDate AND endDate AND voucher_applied IS NOT NULL)) * 100 FROM customer_orders WHERE processed = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(location_id, locationIds), 1=1) AND voucher_applied IS NOT NULL AND customer_loyalty_id != 0 AND date(order_date) BETWEEN startDate AND endDate GROUP BY order_date;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor;
			orderLoop: LOOP
				FETCH orderCursor INTO orderDate, storeSalesVoucherCount, numberOfMembers, valueOfRewards, storeRedemptions;
				IF(notFound = 1) THEN
					LEAVE orderLoop;
				END IF;
				SET numberOfMembersDetails = JSON_ARRAY_APPEND(numberOfMembersDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(numberOfMembers, 2), 0)));
                SET valueOfRewardsDetails = JSON_ARRAY_APPEND(valueOfRewardsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(valueOfRewards, 2), 0)));
				SET storeRedemptionsDetails = JSON_ARRAY_APPEND(storeRedemptionsDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(storeRedemptions,2),0)));
				SET storeRedemptionsCountDetails = JSON_ARRAY_APPEND(storeRedemptionsCountDetails,'$',JSON_OBJECT('name',orderDate,'value',storeSalesVoucherCount));
			END LOOP orderLoop;
		END block2;

		SET notFound = 0;
		block3:BEGIN
			DECLARE storeRegisteredCustCursor CURSOR FOR
			SELECT DATE_FORMAT(cl.created_at, '%Y-%m-%d'),
				IFNULL(ROUND(((COUNT(*) / (SELECT COUNT(*) FROM customer_loyalty WHERE is_loyalty_user = 1 AND DATE(created_at) = DATE(cl.created_at))) * 100), 2), 0),
				COUNT(*)
			FROM customer_loyalty cl
			WHERE cl.is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1) AND DATE(cl.created_at) BETWEEN startDate AND endDate
    		GROUP BY DATE_FORMAT(cl.created_at, '%y-%m-%d');

			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN storeRegisteredCustCursor;
			storeRegisteredCustLoop: LOOP
				FETCH storeRegisteredCustCursor INTO orderDate, storeRegisteredCustomers, storeRegisteredCustomersCount;
				IF(notFound = 1) THEN
					LEAVE storeRegisteredCustLoop;
				END IF;
				IF userTypeId = 5 THEN
					SET storeRegisteredCustomersPercentageDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersPercentageDetails,'$',JSON_OBJECT('name',orderDate,'value',IFNULL(ROUND(storeRegisteredCustomers,2),0)));
				END IF;
				SET storeRegisteredCustomersCountDetails = JSON_ARRAY_APPEND(storeRegisteredCustomersCountDetails,'$',JSON_OBJECT('name',orderDate,'value',storeRegisteredCustomersCount));
			END LOOP storeRegisteredCustLoop;
		END block3;

		SET notFound = 0;
		block4:BEGIN
			DECLARE orderCursor2 CURSOR FOR
			SELECT id FROM customer_loyalty as cl WHERE cl.is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);
			DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
			OPEN orderCursor2;
			orderLoop2: LOOP
				FETCH orderCursor2 INTO customerLoyaltyId;
				IF(notFound = 1) THEN
					LEAVE orderLoop2;
				END IF;

				SELECT order_date INTO orderDate FROM customer_orders WHERE processed = 1 AND customer_loyalty_id = customerLoyaltyId ORDER BY order_date DESC LIMIT 1;
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
				SET orderDate = NULL;

			END LOOP orderLoop2;
		END block4;

		SELECT CONCAT('[',
			JSON_OBJECT('name','Active','value',activeCustCount),',',
			JSON_OBJECT('name','Dormant','value',dormantCustCount),',',
			JSON_OBJECT('name','Lapsed','value',lapsedCustCount),',',
			JSON_OBJECT('name','Lost','value',lostCustCount)
			,']') INTO statusDetailsNew;

		-- Gender breakup AND Member active and inactive
		SELECT
			CONCAT('[',
			JSON_OBJECT('name','Male','value',IFNULL(SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Female','value',IFNULL(SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Other','value',IFNULL(SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END),0))
			,']'),
			CONCAT('[',
			JSON_OBJECT('name','Active','value',IFNULL(SUM(CASE WHEN cl.status = 1 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Inactive','value',IFNULL(SUM(CASE WHEN cl.status = 0 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Deleted','value',IFNULL(SUM(CASE WHEN cl.status = 2 THEN 1 ELSE 0 END),0)),',',
			JSON_OBJECT('name','Blocked','value',IFNULL(SUM(CASE WHEN cl.status = 3 THEN 1 ELSE 0 END),0))
			,']')
			INTO genderPercentageDetails,statusDetails
		FROM customer_loyalty as cl WHERE cl.is_loyalty_user = 1 AND IF(locationIds IS NOT NULL, FIND_IN_SET(cl.home_branch_id, locationIds), 1=1);

		-- weekend - weekdays details
		SET weekendWeekdaysDetailsRatio = JSON_ARRAY_APPEND(weekendWeekdaysDetailsRatio,'$',JSON_OBJECT('name','Weekday','series',weekdaysDetails));
		SET weekendWeekdaysDetailsRatio = JSON_ARRAY_APPEND(weekendWeekdaysDetailsRatio,'$',JSON_OBJECT('name','Weekend','series',weekendDetails));

		SELECT JSON_OBJECT('average_transaction_per_customer_value',averageTransactionsPerCustomerValueDetails,'average_transaction_per_customer_count',averageTransactionsPerCustomerCountDetails,'status_details_new',statusDetailsNew,'highOrder_details',highestSalesDetails,'average_trans',averageTransactionsDetails,'gender_details',genderPercentageDetails,'user_status',statusDetails,'number_of_members',numberOfMembersDetails,'value_of_rewards',valueOfRewardsDetails,'store_registered_customers_percentage',storeRegisteredCustomersPercentageDetails,'store_registered_customers_count',storeRegisteredCustomersCountDetails,'store_sales_percentage',storeSalesPercentageDetails,'store_sales_count',storeSalesCountDetails,'store_sales_value',storeSalesValueDetails,'store_redemptions',storeRedemptionsDetails,'store_redemptions_count',storeRedemptionsCountDetails,'weekend_details',weekendDetails,'weekdays_details',weekdaysDetails,'weekend_weekdays_details',weekendWeekdaysDetailsRatio,'weekend_weekdays_value_details',weekendWeekdaysValueDetails,'weekend_weekdays_count_details',weekendWeekdaysCountDetails) AS response;
		LEAVE getPOSDashboardDetails;
	END IF;
	SET SESSION group_concat_max_len = 1024;
END$$
DELIMITER ;