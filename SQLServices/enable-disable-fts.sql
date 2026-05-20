-------------------------------------------------------
--  Enable/Disable keyword search in all required tables
--------------------------------------------------------
-- Usage: 
--      To enable FTS in all required tables execute enable_fts_all
--      To disable FTS in all required tables execute disable_fts_all
--      Other funcctions that might be useful to use in specific situations
--        update_fts_catalog(): Updates the keyword_vector column in process_types table of catalog
--        enable_fts_catalog(): Enables FTS for the metadata in the process_types table of the catalog. It creates the column, updates and creates the trigger.
--        disable_fts_catalog(): Disables FTS in the process_types table of the catalog. Drops trigger and keyword_vector column.
--        enable_fts_feature_type(metaclass, schema, feature_type): Enables FTS in one specific feature_type of a specific metaclass.
--                Metaclasses are: process_type, feature_type, spatial_sampling_feature_type, specimen_feature_type, sampling_method_type
--                It creates the column keyword_vector, updates the column with text properties, creates the trigger. It does so for both the feature_type and the valid_time_period table.
--        disable_fts_feature_type(metaclass, schema, feature_type): It disables FTS in the referenced feature_type
--        enable_fts_schema(schema): Enables FTS IN ALL the feature_types OF a given SCHEMA. Useful when you add a new schema from a DSL file to a database where FTS was already enabled.
--        disable_fts_schema(schema): disables FTS in all the feature_types of a given schema.
--The language used for the FTS is the one declared in the ISO 19115 NEM metadata, both for metadata and data.
--In those elements for which different languages are allowed, they will be used.


CREATE OR REPLACE FUNCTION update_fts_catalog()
  returns void
AS 
$$
begin
	UPDATE lendas_catalog.process_types p
	  SET keyword_vector = 
	    to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.name,''))  ||
        to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.description,'')) ||
        coalesce((SELECT  tsvector_agg(to_tsvector(fts_config_from_language(v.language), coalesce(pn->>'term','')))
				FROM json_array_elements(coalesce(p.names,'[]'::json)) AS pns(pn), lendas_catalog.vocabularies v 
				WHERE v.schema = pn->'vocabulary'->>'schema' and v.name=pn->'vocabulary'->>'name'), to_tsvector('')) ||
        to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE(fp->>'name',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.feature_properties,'[]'::json)) AS fpt(fp)),'')) ||
        to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT string_agg(COALESCE(fp->>'description',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.feature_properties,'[]'::json)) AS fpt(fp)),'')) ||
        coalesce((SELECT tsvector_agg(to_tsvector(fts_config_from_language(v.language), fpn->>'term'))
				  FROM json_array_elements(coalesce(p.feature_properties,'[]'::json)) AS fpt(fp), 
					 json_array_elements(case when fp->>'names' is null then '[]'::json else fp->'names' end) as fpns(fpn), lendas_catalog.vocabularies v 
				  where v.schema = fpn->'vocabulary'->>'schema' and v.name=fpn->'vocabulary'->>'name'), to_tsvector('')) ||
        to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE(fr->>'name',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.feature_references,'[]'::json)) AS frt(fr)),'')) ||
        to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE(fr->>'description',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.feature_references,'[]'::json)) AS frt(fr)),'')) ||
        coalesce((SELECT tsvector_agg(to_tsvector(fts_config_from_language(v.language), frn->>'term'))
				FROM json_array_elements(p.feature_references) AS frt(fr), 
					 json_array_elements(case when fr->>'names' is null then '[]'::json else fr->'names' end) as frns(frn), lendas_catalog.vocabularies v 
				where v.schema = frn->'vocabulary'->>'schema' and v.name=frn->'vocabulary'->>'name'), to_tsvector('')) ||
         to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE(mc->>'organisation_name','') || 
                                                 COALESCE(mc->>'electronic_mail_address','') ||
                                                 COALESCE(mc->>'role',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.metadata_contact,'[]'::json)) AS mct(mc)),'')) ||			  
         to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.title,'')) ||
         to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.abstract,'')) ||
         to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.identifier,'')) ||
         to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE(pc->>'organisation_name','') || 
                                                 COALESCE(pc->>'electronic_mail_address','') ||
                                                 COALESCE(pc->>'role',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.point_of_contact,'[]'::json)) AS pct(pc)),'')) ||
         coalesce((SELECT  tsvector_agg(to_tsvector(fts_config_from_language(coalesce(v.language,(p.metadata_language)->>0)), coalesce(pk->>'keyword','')))
				   FROM json_array_elements(coalesce(p.keywords,'[]'::json)) AS pks(pk) LEFT JOIN lendas_catalog.vocabularies v 
				     ON v.schema = pk->'vocabulary'->>'schema' and v.name=pk->'vocabulary'->>'name'), to_tsvector('')) ||
         to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.specific_usage,'')) ||
         to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE(pc->>'organisation_name','') || 
                                                 COALESCE(pc->>'electronic_mail_address','') ||
                                                 COALESCE(pc->>'role',''), ' ')
	    	                  FROM json_array_elements(coalesce(p.user_contact,'[]'::json)) AS pct(pc)),'')) ||
          to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.use_limitation,'')) ||
          to_tsvector(fts_config_from_language('eng'), COALESCE(p.spatial_representation_type,'')) ||
          to_tsvector(fts_config_from_language('eng'),
                    COALESCE((SELECT string_agg(pt::text, ' ')
	    	                  FROM json_array_elements(coalesce(p.topic_category,'[]'::json)) AS pts(pt)),'')) ||
          to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.platform->'feature_type'->>'name','')) ||
          to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.shared_feature_of_interest_type->>'name','')) ||
          to_tsvector(fts_config_from_language((p.metadata_language)->>0), COALESCE(p.generated_feature_of_interest_type->'sampled_feature'->>'name','')) ||
	      to_tsvector(fts_config_from_language((p.metadata_language)->>0),
                    COALESCE((SELECT  string_agg(COALESCE((op->>'name') || ' ' || (op->>'description'),''), ' ')
	    	                  FROM json_array_elements(coalesce(p.observation_results,'[]'::json)) AS obrs(obr), 
                                   json_array_elements(case when obr->>'observed_properties' is null then '[]'::json else obr->'observed_properties' end) AS ops(op) ) ,''))||
          coalesce((SELECT tsvector_agg(to_tsvector(fts_config_from_language(v.language), opn->>'term'))
				FROM json_array_elements(coalesce(p.observation_results,'[]'::json)) AS obrs(obr),
                     json_array_elements(case when obr->>'observed_properties' is null then '[]'::json else obr->'observed_properties' end) AS ops(op), 
					 json_array_elements(case when op->>'names' is null then '[]'::json else op->'names' end) as opns(opn), lendas_catalog.vocabularies v 
				where v.schema = opn->'vocabulary'->>'schema' and v.name=opn->'vocabulary'->>'name'), to_tsvector(''));
end; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION automatic_update_fts_catalog()
RETURNS TRIGGER AS $$
begin

    IF pg_trigger_depth() = 1 THEN
     PERFORM update_fts_catalog();
    END IF;

   RETURN NULL;

end; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



CREATE OR REPLACE FUNCTION enable_fts_catalog()
  returns void
AS 
$$
begin
    ALTER TABLE lendas_catalog.process_types 
            ADD COLUMN keyword_vector tsvector;

    CREATE INDEX ON lendas_catalog.process_types USING gin(keyword_vector);

    PERFORM update_fts_catalog();

    CREATE TRIGGER automatic_update_fts_catalog_trigger AFTER INSERT OR UPDATE ON lendas_catalog.process_types FOR EACH STATEMENT
    EXECUTE FUNCTION automatic_update_fts_catalog();

end; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;

CREATE OR REPLACE FUNCTION disable_fts_catalog()
  returns void
AS 
$$
begin
    DROP TRIGGER IF EXISTS automatic_update_fts_catalog_trigger ON lendas_catalog.process_types;
    ALTER TABLE lendas_catalog.process_types DROP COLUMN keyword_vector;
end; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



        
CREATE OR REPLACE FUNCTION enable_fts_feature_type(metaclass text, schema text, feature_type text)
  returns void
AS 
$$
DECLARE
  feature_ts_vector_expression record;
  valid_time_ts_vector_expression record;
  fts_configuration regconfig;
BEGIN
    -- find the appropriate FTS configuration. If it is directly or indirectly referenced from a process_type, we use the language of the process_type. 
    -- Otherwise we use the language of one of the process_types of the same schema.
   SELECT fts_config_from_language((p.metadata_language)->>0) into fts_configuration
   FROM lendas_catalog.process_types p
   where (enable_fts_feature_type.schema=p.schema and feature_type=p.name)
     OR (enable_fts_feature_type.schema=(p.shared_feature_of_interest_type)->>'schema' and feature_type = (p.shared_feature_of_interest_type)->>'name')
     OR (enable_fts_feature_type.schema=(p.generated_feature_of_interest_type)->'sampled_feature_type'->>'schema'
         and feature_type = (p.generated_feature_of_interest_type)->'sampled_feature_type'->>'name')
     OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
         (SELECT s.schema, s.name
          FROM lendas_catalog.specimen_feature_types s
          WHERE s.schema = enable_fts_feature_type.schema and feature_type = s.sampling_method_type_name) 
     OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
         (SELECT s.schema, s.name
          FROM lendas_catalog.specimen_feature_types s
          WHERE (s.shared_sampling_location_type)->>'schema' = enable_fts_feature_type.schema 
            and feature_type = (s.shared_sampling_location_type)->>'name')
      OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
         (SELECT s.schema, s.name
          FROM lendas_catalog.specimen_feature_types s
          WHERE (s.sampled_feature_type)->>'schema' = enable_fts_feature_type.schema 
            and feature_type = (s.sampled_feature_type)->>'name')
      OR ((p.shared_feature_of_interest_type)->>'schema', (p.shared_feature_of_interest_type)->>'name') IN
         (SELECT s.schema, s.name
          FROM lendas_catalog.spatial_sampling_feature_types s
          WHERE (s.sampled_feature_type)->>'schema' = enable_fts_feature_type.schema 
            and feature_type = (s.sampled_feature_type)->>'name');
   
    IF fts_configuration IS NULL THEN
      SELECT fts_config_from_language((p.metadata_language)->>0) into fts_configuration
      FROM lendas_catalog.process_types p
      WHERE p.schema = enable_fts_feature_type.schema
      LIMIT 1;
    END IF;

    IF metaclass = 'process_type' THEN
        
        with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.process_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='feature' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                      into feature_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';

	    with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.process_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='valid_time_period' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                     into valid_time_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';
    ELSEIF metaclass = 'feature_type' THEN
        with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.feature_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='feature' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                       into feature_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';

	    with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.feature_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='valid_time_period' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                          into valid_time_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';
    ELSEIF metaclass = 'spatial_sampling_feature_type' THEN
        with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.spatial_sampling_feature_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='feature' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                         into feature_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';

	    with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.spatial_sampling_feature_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='valid_time_period' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                     into valid_time_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';
    ELSEIF metaclass = 'specimen_feature_type' THEN
        with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='feature' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                     into feature_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';

	    with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.specimen_feature_types ft, json_array_elements(ft.feature_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.name = feature_type
          and fp->>'scope'='valid_time_period' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                     into valid_time_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';
    ELSE -- the metaclass is a sampling_method_type
        with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.sampling_method_type_name = feature_type
          and fp->>'scope'='feature' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                    into feature_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';

	    with recursive campos_texto as (
        select fp->>'name' as expr, fp->'data_type'->>'schema' as dt_schema, fp->'data_type'->>'name' as dt_name
        from lendas_catalog.specimen_feature_types ft, json_array_elements(ft.sampling_method_type_properties) as fpt(fp)
        where ft.schema = enable_fts_feature_type.schema and ft.sampling_method_type_name = feature_type
          and fp->>'scope'='valid_time_period' and (fp->'data_type'->>'schema' is null and fp->'data_type'->>'name' = 'text' or fp->'data_type'->>'schema' is not null)
        union all
        select c.expr||'->'''||(f->>'name')||'''' as expr, f->'data_type'->>'schema' as dt_schema, f->'data_type'->>'name' as dt_name
        from campos_texto c, lendas_catalog.complex_data_type_versions cdt, json_array_elements(cdt.fields) as ft (f)
        where c.dt_schema = cdt.schema and c.dt_name = cdt.name 
          and (f->'data_type'->>'schema' is null and f->'data_type'->>'name' = 'text' or f->'data_type'->>'schema' is not null)
        )
        select 'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce(('||(expr)||')::text,'''')','||'' ''||')||')' as normal,
               'to_tsvector(''pg_catalog.'||fts_configuration::text||''', '||string_agg(distinct 'coalesce((new.'||(expr)||')::text,'''')','||'' ''||')||')' as disparador
                     into valid_time_ts_vector_expression
        from campos_texto
        where dt_schema is null and dt_name = 'text';
    END IF;

   
    IF feature_ts_vector_expression IS NOT NULL THEN
        
  
      EXECUTE format('ALTER TABLE %s.%s add column keyword_vector tsvector',enable_fts_feature_type.schema, feature_type);
      EXECUTE format('CREATE INDEX ON %s.%s USING GIN(keyword_vector)',enable_fts_feature_type.schema, feature_type);
      EXECUTE format('UPDATE %s.%s set keyword_vector = %s',enable_fts_feature_type.schema, feature_type, feature_ts_vector_expression.normal);
	  EXECUTE format('CREATE FUNCTION update_keyword_vector_%s_%s() RETURNS trigger AS $func$ 
                        BEGIN
				          NEW.keyword_vector := %s;
				          RETURN NEW;
				        END
				      $func$ LANGUAGE plpgsql', enable_fts_feature_type.schema, feature_type, feature_ts_vector_expression.disparador);

      EXECUTE format('CREATE TRIGGER update_keyword_vector BEFORE INSERT OR UPDATE
				      ON %s.%s FOR EACH ROW EXECUTE PROCEDURE
				      update_keyword_vector_%s_%s()',
                      enable_fts_feature_type.schema,
			          feature_type,
			          enable_fts_feature_type.schema,
			          feature_type);
    END IF;

    IF valid_time_ts_vector_expression IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s.%s_valid_time add column keyword_vector tsvector',enable_fts_feature_type.schema, feature_type);
      EXECUTE format('CREATE INDEX ON %s.%s_valid_time USING GIN(keyword_vector)',enable_fts_feature_type.schema, feature_type);
      EXECUTE format('UPDATE %s.%s_valid_time set keyword_vector = %s',enable_fts_feature_type.schema, feature_type, valid_time_ts_vector_expression.normal);
       

      EXECUTE format('CREATE FUNCTION update_keyword_vector_%s_%s_valid_time() RETURNS trigger AS $func$ 
                        BEGIN
				          NEW.keyword_vector := %s;
				          RETURN NEW;
				        END
				      $func$ LANGUAGE plpgsql', enable_fts_feature_type.schema, feature_type, valid_time_ts_vector_expression.disparador);

      EXECUTE format('CREATE TRIGGER update_keyword_vector BEFORE INSERT OR UPDATE
				      ON %s.%s_valid_time FOR EACH ROW EXECUTE PROCEDURE
				      update_keyword_vector_%s_%s_valid_time()',
                      enable_fts_feature_type.schema,
			          feature_type,
			          enable_fts_feature_type.schema,
			          feature_type);
    END IF;
end; 
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION disable_fts_feature_type(schema text, feature_type text)
  RETURNS void
AS
$$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS update_keyword_vector ON %s.%s cascade',disable_fts_feature_type.schema,feature_type);
    EXECUTE format('DROP FUNCTION IF EXISTS update_keyword_vector_%s_%s() cascade', disable_fts_feature_type.schema,feature_type);
  	EXECUTE format('ALTER TABLE %s.%s drop column IF EXISTS keyword_vector',disable_fts_feature_type.schema,feature_type);
    IF EXISTS (SELECT * FROM information_schema.tables 
              WHERE table_schema = disable_fts_feature_type.schema and table_name=disable_fts_feature_type.feature_type||'_valid_time') THEN
       EXECUTE format('DROP TRIGGER IF EXISTS update_keyword_vector ON %s.%s cascade',disable_fts_feature_type.schema,feature_type);
       EXECUTE format('DROP FUNCTION IF EXISTS update_keyword_vector_%s_%s_valid_time() cascade', disable_fts_feature_type.schema,feature_type);
       EXECUTE format('ALTER TABLE %s.%s_valid_time drop column IF EXISTS keyword_vector',disable_fts_feature_type.schema,feature_type);
   END IF;

END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;

CREATE OR REPLACE FUNCTION enable_fts_all()
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
	-- enable FTS in catalog
   PERFORM enable_fts_catalog();
	
  -- enable FTS for each process type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.process_types
  LOOP
    PERFORM enable_fts_feature_type('process_type', metadata_record.schema, metadata_record.name);
  END LOOP;

  -- enable FTS for each feature_type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.feature_types
  LOOP
    PERFORM enable_fts_feature_type('feature_type', metadata_record.schema, metadata_record.name);
  END LOOP;

  -- enable FTS for each spatial_sampling_feature_type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.spatial_sampling_feature_types
  LOOP
    PERFORM enable_fts_feature_type('spatial_sampling_feature_type', metadata_record.schema, metadata_record.name);
  END LOOP;
    
  -- enable FTS for each specimen_feature_type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.specimen_feature_types
  LOOP
    PERFORM enable_fts_feature_type('specimen_feature_type', metadata_record.schema, metadata_record.name);
  END LOOP;

  -- enable FTS for each sampling_method_type
  FOR metadata_record IN SELECT schema, sampling_method_type_name as name FROM lendas_catalog.specimen_feature_types
  LOOP
    PERFORM enable_fts_feature_type('sampling_method_type', metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



CREATE OR REPLACE FUNCTION disable_fts_all()
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
   -- disable FTS in catalog
   PERFORM disable_fts_catalog();
	
  -- disable FTS for each process type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.process_types
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;

  -- disable FTS for each feature_type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.feature_types
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;

  -- disable FTS for each spatial_sampling_feature_type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.spatial_sampling_feature_types
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;
    
  -- disable FTS for each specimen_feature_type
  FOR metadata_record IN SELECT schema, name FROM lendas_catalog.specimen_feature_types
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;

  -- disable FTS for each sampling_method_type
  FOR metadata_record IN SELECT schema, sampling_method_type_name as name FROM lendas_catalog.specimen_feature_types
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;




CREATE OR REPLACE FUNCTION enable_fts_schema(schema text)
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN
	
  -- enable FTS for each process type
  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p where p.schema = enable_fts_schema.schema
  LOOP
    PERFORM enable_fts_feature_type('process_type', metadata_record.schema, metadata_record.name);
  END LOOP;

  -- enable FTS for each feature_type
  FOR metadata_record IN SELECT f.schema, name FROM lendas_catalog.feature_types f where f.schema = enable_fts_schema.schema
  LOOP
    PERFORM enable_fts_feature_type('feature_type', metadata_record.schema, metadata_record.name);
  END LOOP;

  -- enable FTS for each spatial_sampling_feature_type
  FOR metadata_record IN SELECT sf.schema, name FROM lendas_catalog.spatial_sampling_feature_types sf where sf.schema = enable_fts_schema.schema
  LOOP
    PERFORM enable_fts_feature_type('spatial_sampling_feature_type', metadata_record.schema, metadata_record.name);
  END LOOP;
    
  -- enable FTS for each specimen_feature_type
  FOR metadata_record IN SELECT sf.schema, name FROM lendas_catalog.specimen_feature_types sf where sf.schema = enable_fts_schema.schema
  LOOP
    PERFORM enable_fts_feature_type('specimen_feature_type', metadata_record.schema, metadata_record.name);
  END LOOP;

  -- enable FTS for each sampling_method_type
  FOR metadata_record IN SELECT sf.schema, sampling_method_type_name as name FROM lendas_catalog.specimen_feature_types sf where sf.schema = enable_fts_schema.schema
  LOOP
    PERFORM enable_fts_feature_type('sampling_method_type', metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;


CREATE OR REPLACE FUNCTION disable_fts_schema(SCHEMA text)
  RETURNS void
AS 
$$
DECLARE
  metadata_record record;
BEGIN

	
  -- disable FTS for each process type
  FOR metadata_record IN SELECT p.schema, name FROM lendas_catalog.process_types p where p.schema = disable_fts_schema.schema
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;

  -- disable FTS for each feature_type
  FOR metadata_record IN SELECT f.schema, name FROM lendas_catalog.feature_types f where f.schema = disable_fts_schema.schema
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;

  -- disable FTS for each spatial_sampling_feature_type
  FOR metadata_record IN SELECT sf.schema, name FROM lendas_catalog.spatial_sampling_feature_types sf where sf.schema = disable_fts_schema.schema
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;
    
  -- disable FTS for each specimen_feature_type
  FOR metadata_record IN SELECT sf.schema, name FROM lendas_catalog.specimen_feature_types sf where sf.schema = disable_fts_schema.schema
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;

  -- disable FTS for each sampling_method_type
  FOR metadata_record IN SELECT sf.schema, sampling_method_type_name as name FROM lendas_catalog.specimen_feature_types sf where sf.schema = disable_fts_schema.schema
  LOOP
    PERFORM disable_fts_feature_type(metadata_record.schema, metadata_record.name);
  END LOOP;
 
END;
$$
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL unsafe;



