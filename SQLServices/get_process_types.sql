--text_language IS specified USING ISO-639-2 (codes OF 3 characters)
-- text_filter follows the sintax of postgresql for FTS queries.
--          Operators: & | !
--          Prefix queries: term:*
--          Phrases: 'This is a phrase'. The simple quotes must be replaced by two simple quotes.


CREATE OR REPLACE FUNCTION get_process_types(text_filter text, text_language text)
RETURNS json
AS
$$
DECLARE
  resultado json;
BEGIN
	SELECT json_agg(json_build_object(
         'schema',p.schema,
	     'name',p.name,
         'description', p.description,
		 'names', p.names,
	     'properties',p.feature_properties,
	     'references',p.feature_references,
         'metadata_language', p.metadata_language,
         'metadata_contact', p.metadata_contact,
         'metadata_date_stamp', p.metadata_date_stamp,
         'title', p.title,
         'abstract', p.abstract,
         'identifier', p.identifier,
         'point_of_contact', p.point_of_contact,
         'keywords', p.keywords,
         'specific_usage', p.specific_usage,
         'user_contact', p.user_contact,
         'use_limitation', p.use_limitation,
         'spatial_representation_type', p.spatial_representation_type,
         'spatial_resolution', p.spatial_resolution,
         'language', p.LANGUAGE,
         'topic_category', p.topic_category,
         'result_time_type', p.result_time_type,
         'phenomenon_time_type', p.phenomenon_time_type,
         'platform', p.platform,
         CASE 
             WHEN p.shared_feature_of_interest_type IS NOT NULL THEN 'shared_feature_of_interest_type'
             ELSE 'generated_feature_of_interest_type'
         END, 
         COALESCE (p.shared_feature_of_interest_type, p.generated_feature_of_interest_type),
         'observation_results', p.observation_results
	) ORDER BY ts_rank(p.keyword_vector, to_tsquery(fts_config_from_language(text_language),text_filter))) INTO resultado
	FROM lendas_catalog.process_types p
	WHERE text_filter is null OR btrim(text_filter) = '' OR  (p.keyword_vector @@ to_tsquery(fts_config_from_language(text_language),text_filter));
	
	RETURN resultado;
END; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL safe;

