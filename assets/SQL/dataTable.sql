CREATE DEFINER=`web`@`%` PROCEDURE `dataTable`(IN sqlQueries JSON)
dataTable:BEGIN
        DECLARE pTableQuery, pCountQuery TEXT DEFAULT '';
        DECLARE totalRecords JSON DEFAULT JSON_ARRAY();
        IF sqlQueries IS NOT NULL AND JSON_VALID(sqlQueries) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520) AS response;
            LEAVE dataTable;
        ELSE
			SET SESSION group_concat_max_len = 10000000;
            SET pTableQuery = JSON_UNQUOTE(JSON_EXTRACT(sqlQueries,'$.tableQuery'));
            SET pCountQuery = JSON_UNQUOTE(JSON_EXTRACT(sqlQueries,'$.countQuery'));
            IF pTableQuery IS NULL OR pCountQuery IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE dataTable;
            END IF;
            SET @tableSql = pTableQuery;
            SET @countSql = pCountQuery;
            PREPARE tableStmt FROM @tableSql;
            PREPARE countStmt FROM @countSql;
            EXECUTE tableStmt;
            EXECUTE countStmt;
            DEALLOCATE PREPARE tableStmt;
            DEALLOCATE PREPARE countStmt;
            IF @totalRecords IS NOT NULL THEN
				SET totalRecords = @totalRecords;
			END IF;
			SELECT JSON_OBJECT('status','SUCCESS', 'message','Record fetch successfully','data',JSON_OBJECT('totalRecords',totalRecords,'totalCount',@totalCount), 'statusCode',200) AS response;
            LEAVE dataTable;
            SET SESSION group_concat_max_len = 1024;
        END IF;
    END