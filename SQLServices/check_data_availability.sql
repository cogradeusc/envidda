-- This functión obtains data availability information in space and time from the offerings of a process_type

CREATE OR REPLACE FUNCTION check_data_availability(process_type_schema text, process_type_name text,
                                                   process_ids text, feature_ids text, spatial_filter text, start_time timestamp, end_time timestamp)
  RETURNS json
AS
$$
DECLARE
  process_ids_expression text;
  feature_ids_expression text;
  spatial_filter_expression text;
  temporal_filter_expression text;
  periods json;
  geometries json;
BEGIN

-- process_ids and features_ids expressions
IF process_ids IS NULL THEN 
  process_ids_expression:='true'; 
ELSE 
  process_ids_expression:=format('PROCEDURE IN (%s)',process_ids); 
END IF;

IF NOT feature_ids IS NULL AND EXISTS (SELECT  
										FROM pg_attribute a
										JOIN pg_class c ON a.attrelid = c.oid
										JOIN pg_namespace n ON c.relnamespace = n.oid
										WHERE c.relname = format('offerings_%s',process_type_name)
										  AND n.nspname = process_type_schema  -- o tu esquema
										  AND a.attnum > 0
										  AND NOT a.attisdropped
										  AND a.attname = 'feature_of_interest') THEN
   feature_ids_expression:=format('feature_of_interest IN (%s)',feature_ids);
ELSE
   feature_ids_expression:='true';
END IF;

IF spatial_filter is null or not exists (SELECT  
										FROM pg_attribute a
										JOIN pg_class c ON a.attrelid = c.oid
										JOIN pg_namespace n ON c.relnamespace = n.oid
										WHERE c.relname = format('offerings_%s',process_type_name)
										  AND n.nspname = process_type_schema  -- o tu esquema
										  AND a.attnum > 0
										  AND NOT a.attisdropped
										  AND a.attname = 'geo_extension') then 
  spatial_filter_expression:='true';
else
 spatial_filter_expression:= format('st_intersects(o.geo_extension, st_transform(st_geomfromewkt(''%s''),st_srid(o.geo_extension)))',spatial_filter);
end if;

IF start_time IS NULL AND end_time IS NULL THEN 
    temporal_filter_expression:='true';
ELSEIF start_time IS NULL AND end_time IS NOT NULL THEN
    temporal_filter_expression:=format('tsrange(null,''%s'', ''[]'') && o.time_extension', end_time);
ELSEIF start_time IS NOT NULL AND end_time IS NULL THEN
    temporal_filter_expression:=format('tsrange(''%s'',null, ''[]'') && o.time_extension', start_time);
ELSE
   temporal_filter_expression:=format('tsrange(''%s'',''%s'', ''[]'') && o.time_extension',start_time, end_time);
END IF;

EXECUTE
format('WITH ranges AS (
			SELECT  row_number() OVER (ORDER BY r) AS Id,
			        r AS time_extension
			FROM unnest((SELECT range_agg(time_extension)
				        FROM %s.offerings_%s o
				        WHERE %s
				          AND %s
                          AND %s
                          AND %s
				        )) AS rt(r)
		),
		ranges_with_observations AS (
			SELECT json_build_object(''time_extension'',json_build_array(lower(r.time_extension), upper(r.time_extension)), 
			                          ''observations'', sum(o.observations),
			                          ''avg_time_resolution'', avg(o.avg_time_resolution)) AS range
			FROM %s.offerings_%s o, ranges r
			WHERE %s
			  AND %s
              AND %s
              AND %s
			  AND r.time_extension @> o.time_extension
			GROUP BY r.id, r.time_extension
			ORDER BY r.time_extension
		)
		SELECT json_agg(range) FROM ranges_with_observations',
        process_type_schema,process_type_name, 
        process_ids_expression, feature_ids_expression, spatial_filter_expression, temporal_filter_expression,
        process_type_schema,process_type_name, 
        process_ids_expression, feature_ids_expression, spatial_filter_expression, temporal_filter_expression)
 INTO periods;

execute
format('WITH geometries AS (
			SELECT geo_extension, sum(observations) AS observations
			FROM %s.offerings_%s o
			WHERE %s
			   AND %s
               AND %s
               AND %s
			GROUP BY geo_extension
		),
		features AS (
			SELECT ROW_NUMBER() OVER (ORDER BY geo_extension) AS id,
			       geo_extension,
			       observations
			FROM geometries
		)
		SELECT json_build_object(''type'', ''FeatureCollection'',
						         ''features'', json_agg(ST_AsGeoJSON(f.*, ''geo_extension'')::json))
		FROM features f',
        process_type_schema,process_type_name, 
        process_ids_expression, feature_ids_expression, spatial_filter_expression, temporal_filter_expression)
into geometries;

return(json_build_object('geometries', geometries, 'periods', periods));

   
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


