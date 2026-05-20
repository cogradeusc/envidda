
-- In this file there are various functions that may be used to create the views needed to access the observation data through a Geoserver instance.
-- create_wfs_view_process_type (schema, process_type): creates the view for a given process type. The view includes all the data from the observation table and additionally a geometric field from either of the folowing: observation table, FOI table, sampling location of a specimen
-- drop_wfs_view_process_type (schema, process_type): drops the view for a given process type.     
-- create_wfs_view_schema(schema)
-- drop_wfs_view_schema(schema)
-- create_wfs_view_all()
-- drop_wfs_view_all()  

CREATE OR REPLACE FUNCTION create_wfs_view_process_type(process_type_schema text, process_type_name text)
  returns void
AS 
$$
DECLARE
  geo_column_name text;
  process_type_metadata record;
  sampling_location_identifier record;
  result_time_limits_expression text;
  phenomenon_time_limits_expression text;
BEGIN
    --obtain the identifier of the foi
	SELECT p.shared_feature_of_interest_type->>'schema' AS SCHEMA, 
	       p.shared_feature_of_interest_type->>'name' AS name, 
	       p.result_time_type AS result_time_type,
	       p.phenomenon_time_type AS phenomenon_time_type INTO process_type_metadata
	FROM lendas_catalog.process_types p
	WHERE p.SCHEMA = process_type_schema AND p.name = process_type_name;

    result_time_limits_expression:='';
    phenomenon_time_limits_expression:='';

    IF process_type_metadata.result_time_type = 'period' THEN
      result_time_limits_expression:=', lower(result_time) as result_time_start, upper(result_time) as result_time_end';
    END IF;

    IF process_type_metadata.phenomenon_time_type = 'period' THEN
      phenomenon_time_limits_expression:=', lower(phenomenon_time) as phenomenon_time_start, upper(phenomenon_time) as phenomenon_time_end';
    END IF;

    IF process_type_metadata.name IS NULL THEN -- It is a generated FOI
      EXECUTE format('CREATE VIEW %s.observation_%s_wfs AS
                      SELECT * %s %s 
                      FROM %s.observation_%s as o', 
                      process_type_schema, process_type_name,
                      result_time_limits_expression, phenomenon_time_limits_expression,
                      process_type_schema, process_type_name);
    ELSE -- it is a shared FOI TYPE. It might be a feature_type, a spatial_sampling or a Specimen
      IF EXISTS (SELECT * FROM lendas_catalog.spatial_sampling_feature_types sf 
                          WHERE sf.schema = process_type_metadata.schema AND sf.name = process_type_metadata.name) THEN

         EXECUTE format('CREATE VIEW %s.observation_%s_wfs AS
                      SELECT o.* %s %s , sf.shape
                      FROM %s.observation_%s as o JOIN  %s.%s as sf ON o.feature_of_interest = sf.fid',
                       process_type_schema, process_type_name, 
                       result_time_limits_expression, phenomenon_time_limits_expression,
                       process_type_schema, process_type_name,
                       process_type_metadata.schema, process_type_metadata.name);
      ELSEIF EXISTS (SELECT * FROM lendas_catalog.specimen_feature_types sf 
                     WHERE sf.schema = process_type_metadata.schema AND sf.name = process_type_metadata.name) THEN
          SELECT s.shared_sampling_location_type->>'schema' AS SCHEMA, 
	             s.shared_sampling_location_type->>'name' AS name INTO sampling_location_identifier
	      FROM lendas_catalog.specimen_feature_types s
	      WHERE s.SCHEMA = process_type_metadata.schema AND s.name = process_type_metadata.name; 
          
          IF sampling_location_identifier.name IS NULL THEN
            EXECUTE format('CREATE VIEW %s.observation_%s_wfs AS
                            SELECT o.* %s %s, sf.shape
                            FROM %s.observation_%s as o JOIN  %s.%s as sf ON o.feature_of_interest = sf.fid',
                            process_type_schema, process_type_name, 
                            result_time_limits_expression, phenomenon_time_limits_expression,
                            process_type_schema, process_type_name,
                            process_type_metadata.schema, process_type_metadata.name);
          ELSE -- the sampling location is shared and an additional join is needed to reach the shape
             EXECUTE format('CREATE VIEW %s.observation_%s_wfs AS
                            SELECT o.* %s %s, sf.shape
                            FROM %s.observation_%s as o JOIN  %s.%s as sf ON o.feature_of_interest = sf.fid
                                                      JOIN %s.%s as sl ON sf.sampling_location = sl.fid',
                            process_type_schema, process_type_name,
                            result_time_limits_expression, phenomenon_time_limits_expression,
                            process_type_schema, process_type_name,
                            process_type_metadata.schema, process_type_metadata.name, sampling_location_identifier.schema, sampling_location_identifier.name);
          END IF;
      ELSE -- THE FOI is a normal feature_type and we need to obtain the geo_colum_name
         SELECT fp->>'name' INTO geo_column_name
         FROM lendas_catalog.feature_types f, json_array_elements(f.feature_properties) as fpt(fp)
         WHERE f.schema = process_type_metadata.schema and f.name = process_type_metadata.name and
               fp->'data_type'->>'name' like 'geometry%'
         limit 1;

         IF geo_column_name IS NULL THEN
            EXECUTE format('CREATE VIEW %s.observation_%s_wfs AS
                      SELECT * %s %s
                      FROM %s.observation_%s as o',
                      process_type_schema, process_type_name,
                      result_time_limits_expression, phenomenon_time_limits_expression,
                      process_type_schema, process_type_name);
         ELSE
            EXECUTE format('CREATE VIEW %s.observation_%s_wfs AS
                      SELECT o.* %s %s, foi.%s as shape
                      FROM %s.observation_%s as o JOIN  %s.%s as foi ON o.feature_of_interest = foi.fid',
                       process_type_schema, process_type_name, 
                       result_time_limits_expression, phenomenon_time_limits_expression,
                       geo_column_name, process_type_schema, process_type_name,
                       process_type_metadata.schema, process_type_metadata.name);
         END IF;
	  END IF;
    END IF;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;




CREATE OR REPLACE FUNCTION drop_wfs_view_process_type(process_type_schema text, process_type_name text)
  returns void
AS 
$$
BEGIN
      EXECUTE format('DROP VIEW IF EXISTS %s.observation_%s_wfs', process_type_schema, process_type_name);
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION create_wfs_view_schema(process_type_schema text)
  returns void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.process_types where schema=process_type_schema
  LOOP
    PERFORM create_wfs_view_process_type(metadata_record.schema, metadata_record.name);
  END LOOP;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION drop_wfs_view_schema(process_type_schema text)
  returns void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.process_types where schema=process_type_schema
  LOOP
    PERFORM drop_wfs_view_process_type(metadata_record.schema, metadata_record.name);
  END LOOP;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION create_wfs_view_all()
  returns void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.process_types
  LOOP
    PERFORM create_wfs_view_process_type(metadata_record.schema, metadata_record.name);
  END LOOP;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION drop_wfs_view_all()
  returns void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.process_types
  LOOP
    PERFORM drop_wfs_view_process_type(metadata_record.schema, metadata_record.name);
  END LOOP;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



