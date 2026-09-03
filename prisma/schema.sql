-- CreateTable
CREATE TABLE "assignments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "assigned_to" TEXT,
    "department" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "companies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tax_number" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_number" TEXT,
    "tax_office" TEXT,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER,
    "related_type" TEXT,
    "related_id" INTEGER,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT,
    "doc_type" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "employee_assignments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "assigned_date" DATETIME,
    "return_date" DATETIME,
    "status" TEXT DEFAULT 'active',
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "employee_attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT,
    "category" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "employee_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL DEFAULT 0,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "is_paid" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT DEFAULT 'cash',
    CONSTRAINT "employee_movements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "employee_salary_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "amount" REAL DEFAULT 0,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "type" TEXT DEFAULT 'initial',
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_salary_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "employees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "tc_no" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "department" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "salary" REAL DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "notes" TEXT,
    "image" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "past_used_leaves" INTEGER DEFAULT 0,
    "birth_date" DATETIME,
    CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER NOT NULL,
    "inspection_date" DATETIME NOT NULL,
    "next_inspection" DATETIME,
    "result" TEXT,
    "cost" REAL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT DEFAULT 'traffic',
    "file_path" TEXT,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "inspections_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "insurances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "policy_no" TEXT,
    "type" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "premium" REAL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "file_path" TEXT,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "insurances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'annual',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "days" INTEGER DEFAULT 1,
    "status" TEXT DEFAULT 'approved',
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "leaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "cost" REAL DEFAULT 0,
    "next_km" INTEGER,
    "next_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "file_path" TEXT,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "meal_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "price_per_person" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "meal_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "meal_tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "person_count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "meal_tickets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "overtimes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "hours" REAL DEFAULT 0,
    "rate" REAL DEFAULT 1.5,
    "amount" REAL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "overtimes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT DEFAULT 'CASH',
    "amount" REAL NOT NULL,
    "category" TEXT DEFAULT 'Diğer',
    "description" TEXT,
    "frequency" TEXT DEFAULT 'MONTHLY',
    "next_run_date" DATETIME NOT NULL,
    "is_active" INTEGER DEFAULT 1,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "recurring_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "salaries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "base_salary" REAL DEFAULT 0,
    "bonus" REAL DEFAULT 0,
    "deduction" REAL DEFAULT 0,
    "net_salary" REAL DEFAULT 0,
    "payment_date" DATETIME,
    "status" TEXT DEFAULT 'pending',
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "salaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "schema_migrations" (
    "version" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applied_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "service_name" TEXT,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "km" INTEGER,
    "cost" REAL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "file_path" TEXT,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "services_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "amount" REAL DEFAULT 0,
    "description" TEXT,
    "payment_method" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT DEFAULT 'CASH',
    "check_number" TEXT,
    "check_due_date" DATETIME,
    "status" TEXT DEFAULT 'COMPLETED',
    "currency" TEXT DEFAULT 'TRY',
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "must_change_password" INTEGER DEFAULT 0
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "status" TEXT DEFAULT 'active',
    "km" INTEGER DEFAULT 0,
    "image" TEXT,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "work_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "receipt_no" TEXT,
    "vehicle_id" INTEGER,
    "employee_id" INTEGER,
    "start_time" TEXT,
    "end_time" TEXT,
    "hours" REAL DEFAULT 0,
    "overtime_hours" REAL DEFAULT 0,
    "unit_price" REAL DEFAULT 0,
    "travel_price" REAL DEFAULT 0,
    "total_price" REAL DEFAULT 0,
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "work_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "work_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "work_items_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "works" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER,
    "employee_id" INTEGER,
    "customer_id" INTEGER,
    "customer" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'pending',
    "price" REAL DEFAULT 0,
    "location" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "is_archived" INTEGER DEFAULT 0,
    CONSTRAINT "works_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "works_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "works_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "works_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateIndex
CREATE INDEX "idx_assignments_vehicle" ON "assignments"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_companies_user" ON "companies"("user_id");

-- CreateIndex
CREATE INDEX "idx_customers_company" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "idx_employee_assignments_employee" ON "employee_assignments"("employee_id");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_employee_attendance_1" ON "employee_attendance"("employee_id", "date");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_employee_documents_employee" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_salary_history_employee" ON "employee_salary_history"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employees_company" ON "employees"("company_id");

-- CreateIndex
CREATE INDEX "idx_inspections_vehicle" ON "inspections"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_insurances_vehicle" ON "insurances"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_leaves_employee" ON "leaves"("employee_id");

-- CreateIndex
CREATE INDEX "idx_maintenances_vehicle" ON "maintenances"("vehicle_id");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_meal_settings_1" ON "meal_settings"("company_id");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_overtimes_employee" ON "overtimes"("employee_id");

-- CreateIndex
CREATE INDEX "idx_salaries_employee" ON "salaries"("employee_id");

-- CreateIndex
CREATE INDEX "idx_services_vehicle" ON "services"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_transactions_date" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "idx_transactions_company" ON "transactions"("company_id");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_users_1" ON "users"("username");
Pragma writable_schema=0;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_users_2" ON "users"("email");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_vehicles_company" ON "vehicles"("company_id");

-- CreateIndex
CREATE INDEX "idx_work_items_date" ON "work_items"("date");

-- CreateIndex
CREATE INDEX "idx_work_items_work" ON "work_items"("work_id");

-- CreateIndex
CREATE INDEX "idx_works_company" ON "works"("company_id");

-- CreateIndex
CREATE INDEX "idx_works_customer" ON "works"("customer_id");

