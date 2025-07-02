# Security Configuration Guide

This document outlines the security configurations that need to be applied to the Placemarks application.

## Database Security Issues Resolved

### 1. SECURITY DEFINER Views ✅ FIXED
**Issue**: Views with SECURITY DEFINER bypass RLS policies and run with elevated privileges.
**Resolution**: All views have been converted to use default SECURITY INVOKER behavior:
- `user_lists_with_counts`
- `enriched_places` 
- `enriched_list_places`
- `google_places_cache_valid`
- `enriched_check_ins`

### 2. Function Search Paths ✅ FIXED
**Issue**: Functions without explicit search paths are vulnerable to schema hijacking attacks.
**Resolution**: All 27+ functions now have explicit `SET search_path = public, pg_catalog` declarations.

### 3. PostGIS Extensions in Public Schema ⚠️ DOCUMENTED
**Issue**: PostGIS and pg_trgm extensions are installed in the public schema.
**Resolution**: Extensions cannot be moved after installation without breaking functionality. Documented for future reference.

### 4. Spatial Reference System Table ⚠️ SYSTEM TABLE
**Issue**: `spatial_ref_sys` table doesn't have RLS enabled.
**Resolution**: This is a PostGIS system table that cannot be modified. This is expected behavior.

## Auth Configuration Required

### Leaked Password Protection ❌ MANUAL ACTION REQUIRED

**Issue**: HaveIBeenPwned password checking is disabled.

**Manual Steps Required**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Navigate to "Password Settings" section
3. Enable "Leaked password protection"
4. This will check user passwords against the HaveIBeenPwned database

**Benefits**:
- Prevents users from using compromised passwords
- Enhances overall application security
- Provides real-time password validation

**Documentation**: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Security Best Practices Applied

1. **View Security**: All views now respect user permissions and RLS policies
2. **Function Security**: All functions use explicit search paths to prevent hijacking
3. **Extension Security**: Documented PostGIS extension security considerations
4. **Authentication Security**: Documented leaked password protection configuration

## Verification

To verify the security fixes have been applied:

```sql
-- Check views are not using SECURITY DEFINER
SELECT schemaname, viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_lists_with_counts', 'enriched_places', 'enriched_list_places', 'google_places_cache_valid', 'enriched_check_ins');

-- Check functions have explicit search paths
SELECT proname, prosrc 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prosrc LIKE '%SET search_path%';
```

## Next Steps

1. ✅ Database security issues have been resolved via migrations
2. ❌ **MANUAL ACTION**: Enable leaked password protection in Supabase Dashboard
3. ✅ Monitor for any new security advisors in future deployments