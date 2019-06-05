DELIMITER $$
DROP PROCEDURE IF EXISTS dataTable$$
CREATE PROCEDURE dataTable(IN sqlQueries JSON)
    dataTable:BEGIN
        DECLARE pTableQuery, pCountQuery TEXT DEFAULT '';
        DECLARE nextText TEXT DEFAULT NULL;
        DECLARE nextlen INT DEFAULT NULL;        
        DECLARE inputData,outPutData JSON;

        IF sqlQueries IS NOT NULL AND JSON_VALID(sqlQueries) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','statusCode',520) AS response;
            LEAVE dataTable;
        ELSE
            SET pTableQuery = JSON_UNQUOTE(JSON_EXTRACT(sqlQueries,'$.tableQuery'));
            SET pCountQuery = JSON_UNQUOTE(JSON_EXTRACT(sqlQueries,'$.countQuery'));
            IF pTableQuery IS NULL OR pCountQuery IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE dataTable;
            END IF;

            iterator: LOOP
            -- exit the loop if the list seems empty or was null;
            -- this extra caution is necessary to avoid an endless loop in the proc.
            IF LENGTH(TRIM(_list)) = 0 OR _list IS NULL THEN
                LEAVE iterator;
            END IF;

            -- capture the next value from the list
            SET _next = SUBSTRING_INDEX(_list,',',1);

            -- save the length of the captured value; we will need to remove this
            -- many characters + 1 from the beginning of the string 
            -- before the next iteration
            SET _nextlen = LENGTH(_next);

            -- trim the value of leading and trailing spaces, in case of sloppy CSV strings
            SET _value = TRIM(_next);

            
            SET _list = INSERT(_list,1,_nextlen + 1,'');
            END LOOP iterator;



            SET @tableSql = pTableQuery;
            SET @countSql = pCountQuery;
            PREPARE tableStmt FROM @tableSql;
            PREPARE countStmt FROM @countSql;
            EXECUTE tableStmt;
            EXECUTE countStmt;
            SELECT JSON_OBJECT('count',EXECUTE countStmt,'data',EXECUTE tableStmt)  AS response;
            DEALLOCATE PREPARE tableStmt;
            DEALLOCATE PREPARE countStmt;
        END IF;
    END$$
DELIMITER ;