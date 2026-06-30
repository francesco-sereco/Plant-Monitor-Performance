-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'assistenza', 'commerciale');
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'archived');
CREATE TYPE "PlantStatus" AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE "LimitScopeType" AS ENUM ('global', 'sector', 'plant_type', 'customer', 'plant');
CREATE TYPE "SourceType" AS ENUM ('manual', 'technical_report', 'lab_autocontrol', 'pdf_import', 'other');
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'confirmed', 'corrected', 'deleted');
CREATE TYPE "ComplianceStatus" AS ENUM ('compliant', 'out_of_limit', 'limit_not_configured', 'incomplete', 'not_applicable');
CREATE TYPE "DocumentType" AS ENUM ('takeoff_report', 'lab_autocontrol', 'other_pdf');
CREATE TYPE "UploadStatus" AS ENUM ('pending', 'uploaded', 'failed');
CREATE TYPE "PdfImportStatus" AS ENUM ('uploaded', 'processing', 'needs_review', 'confirmed', 'failed', 'discarded');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT DEFAULT 'Italia',
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plant_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plant_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plant_type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serial_number" TEXT,
    "installation_date" TIMESTAMP(3),
    "location" TEXT,
    "status" "PlantStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chemical_parameters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_unit_id" TEXT,
    "description" TEXT,
    "is_numeric" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chemical_parameters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sampling_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sampling_points_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "limits" (
    "id" TEXT NOT NULL,
    "chemical_parameter_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "scope_type" "LimitScopeType" NOT NULL,
    "scope_id" TEXT,
    "min_value" DECIMAL(18,6),
    "max_value" DECIMAL(18,6),
    "legal_reference_text" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "limits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measurement_sessions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "measurement_date" TIMESTAMP(3) NOT NULL,
    "source_type" "SourceType" NOT NULL DEFAULT 'manual',
    "source_document_id" TEXT,
    "technician_name" TEXT,
    "laboratory_name" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "measurement_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measurements" (
    "id" TEXT NOT NULL,
    "measurement_session_id" TEXT NOT NULL,
    "chemical_parameter_id" TEXT NOT NULL,
    "sampling_point_id" TEXT NOT NULL,
    "value_numeric" DECIMAL(18,6),
    "value_text" TEXT,
    "unit_id" TEXT NOT NULL,
    "applied_limit_id" TEXT,
    "limit_min_snapshot" DECIMAL(18,6),
    "limit_max_snapshot" DECIMAL(18,6),
    "compliance_status" "ComplianceStatus" NOT NULL DEFAULT 'incomplete',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plant_id" TEXT,
    "measurement_session_id" TEXT,
    "document_type" "DocumentType" NOT NULL DEFAULT 'other_pdf',
    "original_filename" TEXT NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "upload_status" "UploadStatus" NOT NULL DEFAULT 'uploaded',
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pdf_import_jobs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" "PdfImportStatus" NOT NULL DEFAULT 'uploaded',
    "parser_type" TEXT,
    "raw_extracted_text" TEXT,
    "structured_output_json" JSONB,
    "error_message" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pdf_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "sectors_name_key" ON "sectors"("name");
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");
CREATE UNIQUE INDEX "plant_types_name_key" ON "plant_types"("name");
CREATE UNIQUE INDEX "units_symbol_key" ON "units"("symbol");
CREATE UNIQUE INDEX "chemical_parameters_code_key" ON "chemical_parameters"("code");
CREATE UNIQUE INDEX "sampling_points_name_key" ON "sampling_points"("name");

-- ForeignKeys
ALTER TABLE "customers" ADD CONSTRAINT "customers_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plants" ADD CONSTRAINT "plants_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plants" ADD CONSTRAINT "plants_plant_type_id_fkey" FOREIGN KEY ("plant_type_id") REFERENCES "plant_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chemical_parameters" ADD CONSTRAINT "chemical_parameters_default_unit_id_fkey" FOREIGN KEY ("default_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "limits" ADD CONSTRAINT "limits_chemical_parameter_id_fkey" FOREIGN KEY ("chemical_parameter_id") REFERENCES "chemical_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "limits" ADD CONSTRAINT "limits_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "limits" ADD CONSTRAINT "limits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_measurement_session_id_fkey" FOREIGN KEY ("measurement_session_id") REFERENCES "measurement_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_chemical_parameter_id_fkey" FOREIGN KEY ("chemical_parameter_id") REFERENCES "chemical_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_sampling_point_id_fkey" FOREIGN KEY ("sampling_point_id") REFERENCES "sampling_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_applied_limit_id_fkey" FOREIGN KEY ("applied_limit_id") REFERENCES "limits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_measurement_session_id_fkey" FOREIGN KEY ("measurement_session_id") REFERENCES "measurement_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pdf_import_jobs" ADD CONSTRAINT "pdf_import_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pdf_import_jobs" ADD CONSTRAINT "pdf_import_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
