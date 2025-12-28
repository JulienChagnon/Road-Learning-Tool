-- Generate NDJSON road features from a GeoJSON file.
-- Expects INPUT_PATH and OUTPUT_PATH to be substituted by envsubst.
COPY (
  WITH source AS (
    SELECT features
    FROM read_json_auto('${INPUT_PATH}')
  ),
  feature_rows AS (
    SELECT json_each.value AS feature
    FROM source, json_each(to_json(features))
  )
  SELECT
    'Feature' AS type,
    json_extract(feature, '$.geometry') AS geometry,
    json_object(
      'name', json_extract_string(feature, '$.properties.name'),
      'name:en', json_extract_string(feature, '$.properties."name:en"'),
      'ref', json_extract_string(feature, '$.properties.ref'),
      'highway', json_extract(feature, '$.properties.highway')
    ) AS properties
  FROM feature_rows
  WHERE json_extract_string(feature, '$.geometry.type') IN ('LineString', 'MultiLineString')
    AND json_extract(feature, '$.properties.highway') IS NOT NULL
) TO '${OUTPUT_PATH}' (FORMAT JSON, ARRAY false);
