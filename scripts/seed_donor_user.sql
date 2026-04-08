-- =============================================================================
-- seed_donor_user.sql
-- Links the seeded Donor Identity account to Supporter record #25, which has
-- a rich donation history (8+ gifts across multiple types and campaigns).
--
-- Prerequisites:
--   1. Run EF migrations (migration_identity.sql + migration_link_user_supporter.sql)
--   2. Start the application at least once so DatabaseSeeder creates the donor
--      account (Seed:DonorEmail / Seed:DonorPassword in appsettings / env vars).
--   3. Set Seed:DonorSupporterId = 25 in config (or run this script manually).
--
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

DO $$
DECLARE
  v_donor_email  text := lower('donor@harborofhope.org');  -- must match Seed:DonorEmail
  v_supporter_id integer := 25;                            -- supporter with richest history
  v_user_id      text;
  v_role_id      text;
BEGIN

  -- 1. Find the donor Identity account
  SELECT id INTO v_user_id
  FROM "AspNetUsers"
  WHERE lower(email) = v_donor_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Donor account "%" not found in AspNetUsers. '
      'Start the application first so the seeder can create it.',
      v_donor_email;
  END IF;

  -- 2. Link to supporter record and set display name
  UPDATE "AspNetUsers"
  SET    supporter_id = v_supporter_id,
         display_name = COALESCE(display_name, 'Sample Donor')
  WHERE  id = v_user_id;

  RAISE NOTICE 'Linked user % to supporter_id=%', v_donor_email, v_supporter_id;

  -- 3. Ensure the Donor role exists and is assigned
  SELECT id INTO v_role_id
  FROM "AspNetRoles"
  WHERE normalized_name = 'DONOR';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Donor role not found. Start the application first so the seeder creates roles.';
  END IF;

  INSERT INTO "AspNetUserRoles" (user_id, role_id)
  VALUES (v_user_id, v_role_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Donor role assignment confirmed for user %', v_donor_email;

END $$;
