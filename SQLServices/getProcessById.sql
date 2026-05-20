


CREATE OR REPLACE FUNCTION get_process_by_id(process_schema text, process_type_name TEXT, id bigint, start_time timestamp, end_time timestamp)
RETURNS json
AS
$$
DECLARE
  result_json json;
  feature_properties_text TEXT;
  valid_time_properties_text text;
  feature_references_text TEXT;
  valid_time_references_text text;
  feature_platform_text TEXT;
  valid_time_platform_text text;
  temporal_restriction TEXT;
  has_valid_time_data boolean;
  join_expression text;
  valid_time_data_expression text;
  group_expression text;
begin


       has_valid_time_data = EXISTS ( SELECT * FROM information_schema.tables
                                      WHERE table_schema = process_schema and table_name=process_type_name||'_valid_time');


       -- obtain the feature_properties_text
	   SELECT COALESCE(string_agg(', '''||(pp->>'name')||''', p.'||(pp->>'name'),' '),'') INTO feature_properties_text
	   FROM lendas_catalog.process_types pt, json_array_elements(pt.feature_properties) AS ppt(pp)
	   WHERE pt.SCHEMA = process_schema and pt.name = process_type_name AND pp->>'scope' = 'feature';
       
       -- obtain the valid_time_properties_text
	   SELECT COALESCE(string_agg(', '''||(pp->>'name')||''', t.'||(pp->>'name'),' '),'') INTO valid_time_properties_text
	   FROM lendas_catalog.process_types pt, json_array_elements(pt.feature_properties) AS ppt(pp)
	   WHERE pt.SCHEMA = process_schema and pt.name = process_type_name AND pp->>'scope' = 'valid_time_period';
	  
	   -- obtain the feature_reference_text
	   SELECT COALESCE(string_agg(', '''||(pr->>'name')||''', p.'||(pr->>'name'),' '),'') INTO feature_references_text
	   FROM lendas_catalog.process_types pt, json_array_elements(pt.feature_references) AS prt(pr)
	   WHERE pt.SCHEMA = process_schema and pt.name = process_type_name AND pr->>'scope' = 'feature';
  
       -- obtain the valid_time_reference_text
	   SELECT COALESCE(string_agg(', '''||(pr->>'name')||''', t.'||(pr->>'name'),' '),'') INTO valid_time_references_text
	   FROM lendas_catalog.process_types pt, json_array_elements(pt.feature_references) AS prt(pr)
	   WHERE pt.SCHEMA = process_schema and pt.name = process_type_name AND pr->>'scope' = 'valid_time_period';

  
	   -- obtain the feature_platform text
	  SELECT CASE WHEN platform IS NULL OR (pt.platform)->>'scope'='valid_time_period' THEN '' 
             ELSE ', ''platform'', p.platform' END INTO feature_platform_text
	  FROM lendas_catalog.process_types pt
	  WHERE pt.SCHEMA = process_schema and pt.name = process_type_name;

      -- obtain the valid_time_platform text
	  SELECT CASE WHEN platform IS NULL OR (pt.platform)->>'scope'='feature' THEN '' 
             ELSE ', ''platform'', t.platform' END INTO valid_time_platform_text
	  FROM lendas_catalog.process_types pt
	  WHERE pt.SCHEMA = process_schema and pt.name = process_type_name;

     -- generate the temporal restriction
     IF NOT has_valid_time_data OR (start_time IS NULL AND end_time IS NULL) THEN 
          temporal_restriction:='true';
     ELSEIF start_time IS NULL AND end_time IS NOT NULL THEN
        temporal_restriction:=format('tsrange(null,''%s'', ''[]'') && t.valid_time', end_time);
     ELSEIF start_time IS NOT NULL AND end_time IS NULL THEN
        temporal_restriction:=format('tsrange(''%s'',null, ''[]'') && t.valid_time', start_time);
     ELSE
       temporal_restriction:=format('tsrange(''%s'',''%s'', ''[]'') && t.valid_time',start_time, end_time);
     END IF;

     -- generate join expression
     IF has_valid_time_data THEN 
        join_expression:= format('JOIN %s.%s_valid_time t ON p.fid=t.fid',process_schema, process_type_name);
     ELSE join_expression:='';
     END IF;

     -- generate the valid_time_data_expression
     IF has_valid_time_data THEN
       valid_time_data_expression:= format(',
            ''valid_time_scope_data'',
                   json_agg(
                     json_build_object(
                       ''valid_time_period'', json_build_array(lower(t.valid_time),upper(t.valid_time))
                       %s %s %s 
                     )
                  )',valid_time_properties_text, valid_time_references_text, valid_time_platform_text);
    ELSE valid_time_data_expression:='';
    END IF;

    -- generate group_expression
    IF has_valid_time_data THEN
      group_expression:= 'GROUP BY p.fid';
    ELSE group_expression:='';
    END IF;
	
    EXECUTE format('SELECT json_agg(jo)
		FROM 
			(SELECT json_build_object(
				''processId'',p.fid
                 %s %s %s
                 %s
				) AS jo
			FROM %s.%s p %s
			WHERE p.fid = %s AND %s
            %s) AS t',
            feature_properties_text,feature_references_text,feature_platform_text,
            valid_time_data_expression,
            process_schema,process_type_name,join_expression,id,temporal_restriction, group_expression)
	 INTO result_json;
	 
  	RETURN result_json;		   
end;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL safe;