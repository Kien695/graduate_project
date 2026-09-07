BEGIN;

-- Retain legacy categories as metadata only.
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_categories_not_empty;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_categories_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_categories_valid;

-- Legacy SECRET/TOP_SECRET correspond to ranks 2/3 in the four-level policy.
UPDATE users u SET security_level_id=target.id
FROM security_levels old, security_levels target
WHERE u.security_level_id=old.id
  AND ((old.name='SECRET' AND target.name='CONFIDENTIAL')
    OR (old.name='TOP_SECRET' AND target.name='RESTRICTED'));
UPDATE contracts c SET security_level_id=target.id
FROM security_levels old, security_levels target
WHERE c.security_level_id=old.id
  AND ((old.name='SECRET' AND target.name='CONFIDENTIAL')
    OR (old.name='TOP_SECRET' AND target.name='RESTRICTED'));
DELETE FROM security_levels WHERE name IN ('SECRET','TOP_SECRET');

UPDATE security_levels SET rank=CASE name
  WHEN 'PUBLIC' THEN 0 WHEN 'INTERNAL' THEN 1
  WHEN 'CONFIDENTIAL' THEN 2 WHEN 'RESTRICTED' THEN 3 END
WHERE name IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED');
ALTER TABLE security_levels DROP CONSTRAINT IF EXISTS mac_four_levels;
ALTER TABLE security_levels ADD CONSTRAINT mac_four_levels CHECK (
  name IS NOT NULL AND rank IS NOT NULL AND
  ((name='PUBLIC' AND rank=0) OR (name='INTERNAL' AND rank=1) OR
   (name='CONFIDENTIAL' AND rank=2) OR (name='RESTRICTED' AND rank=3))
);

-- Least privilege for unlabeled subjects; never publish unlabeled contracts.
UPDATE users SET security_level_id=(SELECT id FROM security_levels WHERE name='PUBLIC')
WHERE security_level_id IS NULL;
UPDATE contracts SET security_level_id=(SELECT id FROM security_levels WHERE name='RESTRICTED')
WHERE security_level_id IS NULL;
ALTER TABLE users ALTER COLUMN security_level_id SET NOT NULL;
ALTER TABLE contracts ALTER COLUMN security_level_id SET NOT NULL;
DO $$
DECLARE public_id INTEGER;
BEGIN
  SELECT id INTO STRICT public_id FROM security_levels WHERE name='PUBLIC';
  EXECUTE format('ALTER TABLE users ALTER COLUMN security_level_id SET DEFAULT %s',public_id);
END $$;
COMMIT;
