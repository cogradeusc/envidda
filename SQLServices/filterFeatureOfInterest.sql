


CREATE OR REPLACE FUNCTION filter_featureofinterest(feature_type_schema text, feature_type_name TEXT, keyword_filter TEXT, spatial_filter text, start_time timestamp, end_time timestamp)
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
  keyword_filter_restriction TEXT;
  temporal_restriction TEXT;
  has_valid_time_data boolean;
  has_feature_tsvector boolean;
  has_valid_time_tsvector boolean;
  join_expression text;
  valid_time_data_expression text;
  group_expression text;
  fts_config text;
  spatial_restriction text;
  geo_column_name text;
  spatial_sampling_feature_properties record;
  specimen_feature_properties record;
BEGIN
	   --Obtain configuration from process_type language
	   SELECT 'pg_catalog.'||fts_config_from_language((p.LANGUAGE)->>0)::text  into fts_config
	   FROM lendas_catalog.process_types p
	   where (feature_type_schema=(p.shared_feature_of_interest_type)->>'schema' and feature_type_name = (p.shared_feature_of_interest_type)->>'name')
	     OR (feature_type_schema=(p.generated_feature_of_interest_type)->'sampled_feature_type'->>'schema'
	         and feature_type_name = (p.generated_feature_of_interest_type)->'sampled_feature_type'->>'name')
	     OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
	         (SELECT s.schema, s.name
	          FROM lendas_catalog.specimen_feature_types s
	          WHERE s.schema = feature_type_schema and feature_type_name = s.sampling_method_type_name) 
	     OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
	         (SELECT s.schema, s.name
	          FROM lendas_catalog.specimen_feature_types s
	          WHERE (s.shared_sampling_location_type)->>'schema' = feature_type_schema 
	            and feature_type_name = (s.shared_sampling_location_type)->>'name')
	      OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
	         (SELECT s.schema, s.name
	          FROM lendas_catalog.specimen_feature_types s
	          WHERE (s.sampled_feature_type)->>'schema' = feature_type_schema 
	            and feature_type_name = (s.sampled_feature_type)->>'name')
	      OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
	         (SELECT s.schema, s.name
	          FROM lendas_catalog.spatial_sampling_feature_types s
	          WHERE (s.sampled_feature_type)->>'schema' = feature_type_schema 
	            and feature_type_name = (s.sampled_feature_type)->>'name');
   
    IF fts_config IS NULL THEN
      SELECT 'pg_catalog.'||fts_config_from_language((p.LANGUAGE)->>0)::text into fts_config
      FROM lendas_catalog.process_types p
      WHERE p.schema = feature_type_schema
      LIMIT 1;
    END IF;
	
   
       has_valid_time_data = EXISTS ( SELECT * FROM information_schema.tables
                                      WHERE table_schema = feature_type_schema and table_name=feature_type_name||'_valid_time');

       has_feature_tsvector = EXISTS (SELECT * FROM information_schema.columns
                                      WHERE table_schema = feature_type_schema and table_name=feature_type_name
                                        and column_name = 'keyword_vector');

       has_valid_time_tsvector = EXISTS (SELECT * FROM information_schema.columns
                                         WHERE table_schema = feature_type_schema and table_name=feature_type_name||'_valid_time'
                                          and column_name = 'keyword_vector');

   
       -- obtain the feature_properties_text
	   SELECT COALESCE(string_agg(', '''||property||''', f.'||property,' '),'') INTO feature_properties_text
       FROM 
	       (SELECT fp->>'name' as property 
		   FROM lendas_catalog.feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fp->>'scope' = 'feature'
	       UNION ALL
	       SELECT fp->>'name' as property 
		   FROM lendas_catalog.spatial_sampling_feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fp->>'scope' = 'feature'
	       UNION ALL
	       SELECT fp->>'name' as property 
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fp->>'scope' = 'feature'
	       UNION ALL
	       SELECT fp->>'name' as property 
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.sampling_method_type_name = feature_type_name AND fp->>'scope' = 'feature') as temp;
   
       -- obtain the valid_time_properties_text
       SELECT COALESCE(string_agg(', '''||property||''', t.'||property,' '),'') INTO valid_time_properties_text
       FROM
		   (SELECT fp->>'name' as property 
		   FROM lendas_catalog.feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fp->>'scope' = 'valid_time_period'
	       UNION ALL
	       SELECT fp->>'name' as property 
		   FROM lendas_catalog.spatial_sampling_feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fp->>'scope' = 'valid_time_period'
	       UNION ALL
	       SELECT fp->>'name' as property 
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fp->>'scope' = 'valid_time_period'
	       UNION ALL
	       SELECT fp->>'name' as property 
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.sampling_method_type_name = feature_type_name AND fp->>'scope' = 'valid_time_period') as temp;
	  
	   -- obtain the feature_reference_text
       SELECT COALESCE(string_agg(', '''||reference||''', f.'||reference,' '),'') INTO feature_references_text
       FROM
		   (SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.feature_types ft, json_array_elements(ft.feature_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fr->>'scope' = 'feature'
	       UNION ALL
	       SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.spatial_sampling_feature_types ft, json_array_elements(ft.feature_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fr->>'scope' = 'feature'
	       UNION ALL
	       SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fr->>'scope' = 'feature'
	       UNION ALL
	       SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.sampling_method_type_name = feature_type_name AND fr->>'scope' = 'feature');

       -- obtain the valid_time_reference_text
	   SELECT COALESCE(string_agg(', '''||reference||''', t.'||reference,' '),'') INTO feature_references_text
       FROM
		   (SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.feature_types ft, json_array_elements(ft.feature_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fr->>'scope' = 'valid_time_period'
	       UNION ALL
	       SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.spatial_sampling_feature_types ft, json_array_elements(ft.feature_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fr->>'scope' = 'valid_time_period'
	       UNION ALL
	       SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND fr->>'scope' = 'valid_time_period'
	       UNION ALL
	       SELECT (fr->>'name') AS reference
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_references) AS frt(fr)
		   WHERE ft.SCHEMA = feature_type_schema and ft.sampling_method_type_name = feature_type_name AND fr->>'scope' = 'valid_time_period');

      -- generate the keyword_filter
      IF keyword_filter IS NULL
         OR NOT (has_feature_tsvector OR has_valid_time_tsvector) THEN 
          keyword_filter_restriction:='true';
      ELSEIF has_feature_tsvector AND NOT has_valid_time_tsvector THEN
           keyword_filter_restriction:=format('f.keyword_vector @@ to_tsquery(''%s'', ''%s'')',fts_config, keyword_filter);
      ELSEIF NOT has_feature_tsvector AND has_valid_time_tsvector THEN
            keyword_filter_restriction:=format('t.keyword_vector @@ to_tsquery(''%s'', ''%s'')',fts_config, keyword_filter);
      ELSE   keyword_filter_restriction:=format('(f.keyword_vector || t.keyword_vector) @@ to_tsquery(''%s'', ''%s'')',fts_config, keyword_filter);
      END IF;

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

     -- generate the geospatial restriction
      
        -- obtain the name of the geometric column
        IF EXISTS (SELECT schema, name
			        FROM lendas_catalog.spatial_sampling_feature_types f
			        WHERE f.schema = feature_type_schema and f.name = feature_type_name
			        UNION
			        SELECT schema, name
			        FROM lendas_catalog.specimen_feature_types f
			        WHERE f.schema = feature_type_schema and f.name = feature_type_name
			          AND f.generated_sampling_location_type_shape_type is not null) THEN
           geo_column_name:='f.shape';
        ELSE
         SELECT geo_column into geo_column_name
         FROM
           (SELECT case when fp->>'scope' = 'feature' then 'f' else 't' end ||'.'||(fp->>'name') as geo_column
		   FROM lendas_catalog.feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND lower(fp->'data_type'->>'name') like 'geometry%'
	       UNION ALL
	       SELECT fp->>'name' as geo_column
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.name = feature_type_name AND lower(fp->'data_type'->>'name') like 'geometry%'
	       UNION ALL
	       SELECT fp->>'name' as geo_column
		   FROM lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_properties) AS fpt(fp)
		   WHERE ft.SCHEMA = feature_type_schema and ft.sampling_method_type_name = feature_type_name AND lower(fp->'data_type'->>'name') like 'geometry%')
         LIMIT 1;
        END IF;
        
        IF spatial_filter is not null and geo_column_name is not null THEN 
          spatial_restriction:=format('st_intersects(%s, st_transform(st_geomfromewkt(''%s''),st_srid(%s)))',geo_column_name,spatial_filter,geo_column_name);
        ELSE
          spatial_restriction:= 'true';
        END IF;
     

     -- generate join expression
     IF has_valid_time_data THEN 
        join_expression:= format('JOIN %s.%s_valid_time t ON f.fid=t.fid',process_schema, process_type_name);
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
      group_expression:= 'GROUP BY f.fid';
    ELSE group_expression:='';
    END IF;


     -- Add special properties present in sampling features
     SELECT shape_type, height_type INTO spatial_sampling_feature_properties
     FROM lendas_catalog.spatial_sampling_feature_types f
     WHERE f.schema = feature_type_schema and f.name = feature_type_name;

     SELECT shared_sampling_location_type,
            generated_sampling_location_type_shape_type, 
            generated_sampling_location_type_height_type INTO specimen_feature_properties
     FROM lendas_catalog.specimen_feature_types f
     WHERE f.schema = feature_type_schema and f.name = feature_type_name;

   
     IF spatial_sampling_feature_properties is not null THEN
         feature_properties_text:= feature_properties_text || ', ''sampled_feature'', f.sampled_feature, ''shape'', f.shape ';
         IF spatial_sampling_feature_properties.height_type IS NOT NULL THEN
           feature_properties_text:= feature_properties_text || ', ''height'', f.height ';
         END IF;
     END IF;

     IF specimen_feature_properties IS NOT NULL THEN
         feature_properties_text:= feature_properties_text || 
                                   ', ''sampled_feature'', f.sampled_feature, ''sampling_time'', f.sampling_time ';
         IF specimen_feature_properties.shared_sampling_location_type IS NOT null THEN
            feature_properties_text:= feature_properties_text|| ', ''sampling_location'', f.sampling_location ';
         END IF;
         IF specimen_feature_properties.generated_sampling_location_type_shape_type IS NOT NULL THEN
             feature_properties_text:= feature_properties_text || ', ''shape'', f.shape ';
             IF specimen_feature_properties.generated_sampling_location_type_height_type IS NOT NULL THEN
               feature_properties_text:= feature_properties_text || ', ''height'', f.height ';
             END IF; 
         END IF;
         feature_properties_text:= feature_properties_text ||', ''sampling_method'', f.sampling_method';
     END IF;
     
	
    EXECUTE format('SELECT json_agg(jo)
		FROM 
			(SELECT json_build_object(
				''featureId'',f.fid
                 %s %s %s
                 %s
				) AS jo
			FROM %s.%s f %s
			WHERE %s
			  AND %s 
              AND %s
            %s) AS t',
            feature_properties_text,feature_references_text,feature_platform_text,
            valid_time_data_expression,
            feature_type_schema,feature_type_name,join_expression,keyword_filter_restriction,temporal_restriction,spatial_restriction, group_expression)
	 INTO result_json;
	 
  	RETURN result_json;		   
end;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL safe;