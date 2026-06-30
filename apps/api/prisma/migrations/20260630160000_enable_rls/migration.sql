-- Enable RLS on all application tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plant_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chemical_parameters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sampling_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pdf_import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Backend Prisma role: full access (API Express, non PostgREST pubblico)
CREATE POLICY "pmp_app_all" ON "users" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "sectors" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "customers" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "plant_types" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "plants" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "units" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "chemical_parameters" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "sampling_points" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "limits" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "measurement_sessions" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "measurements" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "documents" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "pdf_import_jobs" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "audit_logs" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
CREATE POLICY "pmp_app_all" ON "_prisma_migrations" FOR ALL TO pmp_app USING (true) WITH CHECK (true);

-- service_role (Supabase client admin) mantiene bypass RLS via JWT; nessuna policy anon/authenticated
