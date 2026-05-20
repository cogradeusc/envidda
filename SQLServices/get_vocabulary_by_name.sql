
CREATE OR REPLACE FUNCTION get_vocabulary_by_name(schema text, name text)
RETURNS json
AS
$$
DECLARE
  resultado json;
BEGIN
	SELECT json_build_object(
         'schema',v.schema,
	     'name',v.name,
         'description', v.description,
		 'date', v.date,
		 'date_type', v.date_type,
		 'language', v.language
	) INTO resultado
	FROM lendas_catalog.vocabularies v
	WHERE v.SCHEMA = get_vocabulary_by_name.SCHEMA AND v.name=get_vocabulary_by_name.name;
	
	RETURN resultado;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL safe;