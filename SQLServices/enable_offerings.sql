
-- In this file there are function to enable an refresh the offerings of each process_type that may be used to explore data availability

-- enable_process_type_offerings(process_type_schema, process_type_name)
-- refresh_process_type_offerings(process_type_schema, process_type_name)
-- disable_process_type_offerings(process_type_schema, process_type_name)

-- enable_schema_offerings(process_type_schema)
-- refresh_schema_offerings(process_type_schema)
-- disable_schema_offerings(process_type_schema)

-- enable_all_offerings(process_type_schema)
-- refresh_all_offerings(process_type_schema)
-- disable_all_offerings(process_type_schema)

CREATE OR REPLACE FUNCTION enable_process_type_offerings(process_type_schema text, process_type_name text)
  RETURNS void
AS
$$
DECLARE
  process_type_metadata record;
  spatial_sampling_feature_type_metadata record;
  specimen_feature_type_metadata record;
  upper_result_time_expression text;
  lower_result_time_expression text;
  group_by_expression text;
  geo_column_expression text;
  join_expression text;
  sql_query text;
BEGIN
	
--Obtain the metadata of the process_type
SELECT * INTO process_type_metadata
FROM lendas_catalog.process_types p
WHERE p.SCHEMA = process_type_schema AND p.name = process_type_name;

--Obtain the expressions to access the result_time
IF process_type_metadata.result_time_type = 'instant' THEN
  upper_result_time_expression:='result_time';
  lower_result_time_expression:='result_time';
ELSE
  upper_result_time_expression:='upper(result_time)';
  lower_result_time_expression:='lower(result_time)';
END IF;
	
IF process_type_metadata.shared_feature_of_interest_type IS NOT NULL THEN
  SELECT * INTO spatial_sampling_feature_type_metadata
  FROM lendas_catalog.spatial_sampling_feature_types
  where schema=process_type_metadata.shared_feature_of_interest_type->>'schema'
    and name = process_type_metadata.shared_feature_of_interest_type->>'name';

  IF NOT spatial_sampling_feature_type_metadata IS NULL THEN
    group_by_expression:='procedure, feature_of_interest';
    geo_column_expression:='st_setsrid(st_extent(f.shape)::geometry, any_value(st_srid(f.shape))) AS geo_extension,';
    join_expression:=format('JOIN %s.observation_%s o using (%s) JOIN %s.%s f ON r.feature_of_interest = f.fid',
                            process_type_schema, process_type_name, group_by_expression,
                            spatial_sampling_feature_type_metadata.schema,
                            spatial_sampling_feature_type_metadata.name);

  ELSE
     SELECT * INTO specimen_feature_type_metadata
     FROM lendas_catalog.specimen_feature_types
     where schema=process_type_metadata.shared_feature_of_interest_type->>'schema'
       and name = process_type_metadata.shared_feature_of_interest_type->>'name';
      
     IF NOT specimen_feature_type_metadata is null THEN
       IF NOT specimen_feature_type_metadata.shared_sampling_location_type IS NULL THEN
           group_by_expression:='procedure, feature_of_interest';
           geo_column_expression:='st_setsrid(st_extent(sl.shape)::geometry, any_value(st_srid(sl.shape))) AS geo_extension,';
           join_expression:=format('JOIN %s.observation_%s o using (%s) JOIN %s.%s f ON r.feature_of_interest = f.fid
                                                                        JOIN %s.%s sl ON f.sampling_location = sl.fid',
                                     process_type_schema, process_type_name, group_by_expression,
                                     specimen_feature_type_metadata.schema,
                                     specimen_feature_type_metadata.name,
                                     specimen_feature_type_metadata.shared_sampling_location_type->>'schema',
                                     specimen_feature_type_metadata.shared_sampling_location_type->>'name');
       ELSEIF specimen_feature_type_metadata.generated_sampling_location_type_shape_type IS NOT NULL THEN
           group_by_expression:='procedure, feature_of_interest';
           geo_column_expression:='st_setsrid(st_extent(f.shape)::geometry, any_value(st_srid(f.shape))) AS geo_extension,';
           join_expression:=format('JOIN %s.observation_%s o using (%s) JOIN %s.%s f ON r.feature_of_interest = f.fid',
                                     process_type_schema, process_type_name, group_by_expression,
                                     specimen_feature_type_metadata.schema,
                                     specimen_feature_type_metadata.name);
       ELSE
           group_by_expression:='procedure, feature_of_interest';
           geo_column_expression:='';
           join_expression:=format('JOIN %s.observation_%s o using (%s)',
                                     process_type_schema, process_type_name, group_by_expression);
       END IF;
     ELSE -- It is a feature of interest that is not a sampling feature.
		/*
        SELECT 'st_setsrid(st_extent(f.'||(fp->>'name')||')::geometry, any_value(st_srid(f.'||(fp->>'name')||'))) AS geo_extension,'
        FROM lendas_catalog.feature_types f, json_array_elements(f.feature_properties) fpt(fp)
        WHERE schema = process_type_metadata.shared_feature_of_interest_type->>'schema'
          and name = process_type_metadata.shared_feature_of_interest_type->>'name'
          and fp->'data_type'->>'name' like 'geometry%'
        limit 1;
		*/
		-- La seccion anterior daba un error.
		SELECT 'st_setsrid(st_extent(f.'||(fp->>'name')||')::geometry, any_value(st_srid(f.'||(fp->>'name')||'))) AS geo_extension,'
		INTO geo_column_expression
		FROM lendas_catalog.feature_types f, json_array_elements(f.feature_properties) fpt(fp)
		WHERE schema = process_type_metadata.shared_feature_of_interest_type->>'schema'
		  AND name = process_type_metadata.shared_feature_of_interest_type->>'name'
		  AND fp->'data_type'->>'name' LIKE 'geometry%'
		LIMIT 1;

        IF NOT geo_column_expression IS NULL THEN
           group_by_expression:='procedure, feature_of_interest';
           join_expression:=format('JOIN %s.observation_%s o using (%s) JOIN %s.%s f ON r.feature_of_interest = f.fid',
                            process_type_schema, process_type_name, group_by_expression,
                            process_type_metadata.shared_feature_of_interest_type->>'schema',
                            process_type_metadata.shared_feature_of_interest_type->>'name');
        ELSE
           group_by_expression:='procedure, feature_of_interest';
           geo_column_expression:='';
           join_expression:=format('JOIN %s.observation_%s o using (%s)',
                                     process_type_schema, process_type_name, group_by_expression);
        END IF;

     END IF;
  END IF;
ELSE
  group_by_expression:='procedure';
  geo_column_expression:='st_setsrid(st_extent(o.shape)::geometry, any_value(st_srid(o.shape))) AS geo_extension,';
  join_expression:=format('JOIN %s.observation_%s o using (%s)',process_type_schema, process_type_name, group_by_expression);
END IF;
	
sql_query:=
 format('WITH time_resolutions AS (
			SELECT %s, EXTRACT(EPOCH FROM max(%s) - min(%s))/ count(*) AS avg_time_resolution
			FROM %s.observation_%s o
			GROUP BY %s
		),
		serie_temporal AS (
			SELECT %s, result_time, 
			       lag(%s) OVER (PARTITION BY %s ORDER BY result_time) AS previous_time,
			        lead(%s) OVER (PARTITION BY %s ORDER BY result_time) AS next_time
			FROM %s.observation_%s
		),
		limits AS (
			SELECT *,
			       CASE 
			         WHEN previous_time IS NULL OR EXTRACT(EPOCH FROM %s - previous_time) > 3*tr.avg_time_resolution THEN ''start''
			         ELSE ''end''
			       END AS limit_type
			FROM serie_temporal st join time_resolutions tr using(%s)
			WHERE previous_time IS NULL OR next_time IS NULL 
			       OR EXTRACT(EPOCH FROM %s - previous_time) > 3*tr.avg_time_resolution
			       OR EXTRACT(EPOCH FROM next_time - %s) > 3*tr.avg_time_resolution
		),
		ranges AS (
		    SELECT %s, 
		       tsrange(%s, 
		               lead(%s) OVER (PARTITION BY %s ORDER BY result_time)  
		               , ''[]'') AS time_extension, 
		       avg_time_resolution,
		       limit_type
			FROM limits 
		)
		SELECT row_number() OVER (PARTITION BY %s ORDER BY time_extension) AS offeringid,
		       %s, r.time_extension, r.avg_time_resolution*(INTERVAL ''1 second'') AS avg_time_resolution, 
		       %s count(*) AS observations
		FROM ranges r %s
		WHERE limit_type = ''start'' AND r.time_extension @> o.result_time
		GROUP BY %s, time_extension, avg_time_resolution
		ORDER BY %s, time_extension',
        group_by_expression,upper_result_time_expression,lower_result_time_expression,
        process_type_schema, process_type_name, group_by_expression, group_by_expression,
        lower_result_time_expression,group_by_expression, upper_result_time_expression,group_by_expression,
        process_type_schema, process_type_name,lower_result_time_expression,group_by_expression,
        lower_result_time_expression, upper_result_time_expression, group_by_expression,
        lower_result_time_expression, upper_result_time_expression,group_by_expression, group_by_expression, group_by_expression,
        geo_column_expression, join_expression, group_by_expression, group_by_expression);

    execute format('CREATE MATERIALIZED VIEW %s.offerings_%s AS %s', process_type_schema, process_type_name, sql_query);

END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



CREATE OR REPLACE FUNCTION refresh_process_type_offerings(process_type_schema text, process_type_name text)
  RETURNS void
AS
$$
BEGIN
  execute format('REFRESH MATERIALIZED VIEW %s.offerings_%s',process_type_schema, process_type_name);
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION disable_process_type_offerings(process_type_schema text, process_type_name text)
  RETURNS void
AS
$$
BEGIN
  execute format('DROP MATERIALIZED VIEW IF EXISTS %s.offerings_%s',process_type_schema, process_type_name);
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



CREATE OR REPLACE FUNCTION enable_schema_offerings(process_type_schema text)
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p where p.schema = process_type_schema
  LOOP
    PERFORM enable_process_type_offerings(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION refresh_schema_offerings(process_type_schema text)
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p where p.schema = process_type_schema
  LOOP
    PERFORM refresh_process_type_offerings(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION disable_schema_offerings(process_type_schema text)
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p where p.schema = process_type_schema
  LOOP
    PERFORM disable_process_type_offerings(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;




CREATE OR REPLACE FUNCTION enable_all_offerings()
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p
  LOOP
    PERFORM enable_process_type_offerings(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION refresh_all_offerings()
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p 
  LOOP
    PERFORM refresh_process_type_offerings(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION disable_all_offerings()
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p 
  LOOP
    PERFORM disable_process_type_offerings(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;










