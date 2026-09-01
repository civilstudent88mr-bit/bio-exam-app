/*
# Add phone columns for password recovery

## Overview
Adds a `phone` column to both `teachers` and `students` tables to support
the "forgot password" flow. The phone number is used as a verification
token when resetting a forgotten password.

## Modified Tables
1. `teachers` — added `phone` text column (nullable, not required)
2. `students` — added `phone` text column (nullable, not required)

## Security
- No RLS policy changes needed; existing anon/authenticated policies
  already allow full CRUD on these tables.
- The phone column is nullable so existing rows are unaffected.

## Notes
1. Columns are nullable so existing records are not broken.
2. The phone field is optional during registration but required
   when using the password recovery flow.
*/

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone text;