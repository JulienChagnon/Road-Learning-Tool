-- Build the road catalog JSON from a GeoJSON file.
-- Expects INPUT_PATH and OUTPUT_PATH to be substituted by envsubst.
COPY (
  WITH source AS (
    SELECT features
    FROM read_json_auto('${INPUT_PATH}')
  ),
  feature_rows AS (
    SELECT json_each.value AS feature
    FROM source, json_each(to_json(features))
  ),
  roads AS (
    SELECT
      NULLIF(trim(json_extract_string(feature, '$.properties.name')), '') AS name,
      NULLIF(trim(json_extract_string(feature, '$.properties."name:en"')), '') AS name_en,
      NULLIF(trim(json_extract_string(feature, '$.properties.name_en')), '') AS name_en_alt,
      NULLIF(trim(json_extract_string(feature, '$.properties.ref')), '') AS ref
    FROM feature_rows
    WHERE json_extract_string(feature, '$.geometry.type') IN ('LineString', 'MultiLineString')
      AND json_extract(feature, '$.properties.highway') IS NOT NULL
  ),
  names AS (
    SELECT name AS value FROM roads WHERE name IS NOT NULL
    UNION
    SELECT name_en AS value FROM roads WHERE name_en IS NOT NULL
    UNION
    SELECT name_en_alt AS value FROM roads WHERE name_en_alt IS NOT NULL
  ),
  refs AS (
    SELECT ref AS value FROM roads WHERE ref IS NOT NULL
  )
  SELECT
    (SELECT list(value ORDER BY value) FROM (SELECT DISTINCT value FROM names)) AS names,
    (SELECT list(value ORDER BY value) FROM (SELECT DISTINCT value FROM refs)) AS refs
) TO '${OUTPUT_PATH}' (FORMAT JSON, ARRAY false);
