-- Generate NDJSON building features from a GeoJSON file.
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
      'official_name', json_extract_string(feature, '$.properties.official_name'),
      'alt_name', json_extract_string(feature, '$.properties.alt_name'),
      'building', json_extract_string(feature, '$.properties.building'),
      'amenity', json_extract_string(feature, '$.properties.amenity'),
      'operator', json_extract_string(feature, '$.properties.operator')
    ) AS properties
  FROM feature_rows
  WHERE json_extract_string(feature, '$.geometry.type') IN ('Polygon', 'MultiPolygon')
    AND json_extract(feature, '$.properties.building') IS NOT NULL
    AND json_extract_string(feature, '$.properties.building') NOT IN ('parking', 'garage')
    AND (
      lower(coalesce(json_extract_string(feature, '$.properties.operator'), '')) LIKE '%queen''s university%'
      OR json_extract_string(feature, '$.properties.amenity') IN ('university', 'college', 'school')
      OR json_extract_string(feature, '$.properties.building') IN ('university', 'dormitory', 'college', 'school')
    )
) TO '${OUTPUT_PATH}' (FORMAT JSON, ARRAY false);
