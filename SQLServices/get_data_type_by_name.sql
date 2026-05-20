
CREATE OR REPLACE FUNCTION get_data_type_by_name(schema text, name text)
RETURNS json
AS
$$
DECLARE
  resultado json;
BEGIN
    SELECT resultado_json INTO resultado
    FROM
		(SELECT json_build_object(
	         'schema',edt.schema,
		     'name',edt.name,
	         'description', edt.description,
			 'names', edt.names,
			 'class', 'enumeration',
			 'versions',
			 json_agg(json_build_object(
			   'version',edtv.version,
			   'num_values',edtv.num_values,
			   'values', edtv.values,
	           'json_schema',edtv.json_schema
			 ))
		) as resultado_json
		FROM lendas_catalog.enumeration_data_types edt
		 JOIN lendas_catalog.enumeration_data_type_versions edtv
		   ON edt.SCHEMA = edtv.SCHEMA AND edt.name=edtv.name
		WHERE edt.SCHEMA = get_data_type_by_name.SCHEMA AND edt.name=get_data_type_by_name.name
		GROUP BY edt.SCHEMA, edt.name
	    UNION ALL
	    SELECT json_build_object(
	         'schema',cdt.schema,
		     'name',cdt.name,
	         'description', cdt.description,
			 'names', cdt.names,
			 'class', 'complex',
			 'versions',
			 json_agg(json_build_object(
			   'version',cdtv.version,
			   'fields', cdtv.fields,
	           'json_schema',cdtv.json_schema
			 ))
		) as resultado_json
		FROM lendas_catalog.complex_data_types cdt
		 JOIN lendas_catalog.complex_data_type_versions cdtv
		   ON cdt.SCHEMA = cdtv.SCHEMA AND cdt.name=cdtv.name
		WHERE cdt.SCHEMA = get_data_type_by_name.SCHEMA AND cdt.name=get_data_type_by_name.name
		GROUP BY cdt.SCHEMA, cdt.name) as temp;
	
	RETURN resultado;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL safe;
