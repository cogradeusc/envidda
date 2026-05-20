


CREATE OR REPLACE FUNCTION get_feature_type_by_name(schema text, name text)
RETURNS json
AS
$$
DECLARE
  resultado json;
BEGIN

    SELECT resultado_json INTO resultado
    FROM
		(SELECT json_build_object(
	         'schema',ft.schema,
		     'name',ft.name,
	         'description', ft.description,
			 'names', ft.names,
			 'properties', ft.feature_properties,
			 'references', ft.feature_references
		      ) as resultado_json
		FROM lendas_catalog.feature_types ft
		WHERE ft.SCHEMA = get_feature_type_by_name.schema AND ft.name=get_feature_type_by_name.name
	    UNION ALL
	    SELECT json_build_object(
	         'schema',ft.schema,
		     'name',ft.name,
	         'description', ft.description,
			 'names', ft.names,
			 'properties', ft.feature_properties,
			 'references', ft.feature_references,
			 'spatial_sampling_feature_type',
			 CASE WHEN ft.height_type IS NULL THEN 
				 json_build_object(
				   'sampled_feature_type',ft.sampled_feature_type,
				   'shape_type', ft.shape_type,
				   'shape_crs', ft.shape_crs
				 )
		     ELSE 
		        json_build_object(
				   'sampled_feature_type',ft.sampled_feature_type,
				   'shape_type', ft.shape_type,
				   'shape_crs',ft.shape_crs,
				   'height_type',ft.height_type,
				   'height_crs',ft.height_crs
				 )
		     END 
		     ) as resultado_json
		FROM lendas_catalog.spatial_sampling_feature_types ft
		WHERE ft.SCHEMA = get_feature_type_by_name.schema AND ft.name=get_feature_type_by_name.name
		UNION ALL
		SELECT json_build_object(
	         'schema',ft.schema,
		     'name',ft.name,
	         'description', ft.description,
			 'names', ft.names,
			 'properties', ft.feature_properties,
			 'references', ft.feature_references,
			 'specimen_feature_type',
			   json_build_object(
			   'sampled_feature_type', ft.sampled_feature_type,
			   'sampling_time_extension', ft.sampling_time_extension,
			   CASE WHEN ft.shared_sampling_location_type IS NOT NULL THEN 'shared_sampling_location_type'
			   ELSE 'generated_sampling_location_type' END,
			   CASE WHEN ft.shared_sampling_location_type IS NOT NULL THEN ft.shared_sampling_location_type
			   ELSE 
			     CASE WHEN ft.generated_sampling_location_type_height_type IS NULL THEN 
				 json_build_object(
				   'shape_type', ft.generated_sampling_location_type_shape_type,
				   'shape_crs', ft.generated_sampling_location_type_shape_crs
				 )
			     ELSE 
			        json_build_object(
					   'shape_type', ft.generated_sampling_location_type_shape_type,
					   'shape_crs',ft.generated_sampling_location_type_shape_crs,
					   'height_type',ft.generated_sampling_location_type_height_type,
					   'height_crs',ft.generated_sampling_location_type_height_crs
					 )
			     END
			   END,
			   'sampling_method_type',
			    json_build_object(
			      'name', ft.sampling_method_type_name,
			      'description', ft.sampling_method_type_description,
			      'names', ft.sampling_method_type_names,
			      'properties', ft.sampling_method_type_properties,
			      'references', ft.sampling_method_type_references
			    )
			   )
		     ) as resultado_json
		FROM lendas_catalog.specimen_feature_types ft
		WHERE ft.SCHEMA = get_feature_type_by_name.schema AND ft.name=get_feature_type_by_name.name
	   ) as temp;
	
	RETURN resultado;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL safe;



  





