create OR REPLACE function fts_config_from_language(language text)
  returns regconfig
as
$$
begin
   return case language
        when 'ara' then 'pg_catalog.arabic'
        when 'dan' then 'pg_catalog.danish'
	    when 'nld' then 'pg_catalog.dutch'
		when 'eng' then 'pg_catalog.english'
		when 'fin' then 'pg_catalog.finnish'
		when 'fra' then 'pg_catalog.french'
		when 'deu' then 'pg_catalog.german'
		when 'hun' then 'pg_catalog.hungarian'
		when 'ind' then 'pg_catalog.indonesian'
		when 'gle' then 'pg_catalog.irish'
		when 'ita' then 'pg_catalog.italian'
		when 'lit' then 'pg_catalog.lithuanian'
		when 'nep' then 'pg_catalog.nepali'
		when 'nor' then 'pg_catalog.norwegian'
		when 'por' then 'pg_catalog.portuguese'
		when 'ron' then 'pg_catalog.romanian'
		when 'rus' then 'pg_catalog.russian'
		when 'spa' then 'pg_catalog.spanish'
		when 'swe' then 'pg_catalog.swedish'
		when 'tam' then 'pg_catalog.tamil'
		when 'tur' then 'pg_catalog.turkish'
		when 'glg' then 'pg_catalog.spanish'
	    else current_setting('default_text_search_config')
	    end;		   
end;
$$
language plpgsql
immutable;


create aggregate tsvector_agg (tsvector) (
	STYPE = pg_catalog.tsvector,
	SFUNC = pg_catalog.tsvector_concat,
	INITCOND = ''
);