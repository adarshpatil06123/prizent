# db-service

Centralized persistence service for Elowen. This service is intended to be the only component that connects directly to MySQL.

## Current status

- Project skeleton created (Spring Boot, JPA, Security).
- Consolidated migration SQL generated from live MySQL table definitions.
- Shared target schema: `prizent_db`.

## Run migration (from MySQL CLI)

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p"Adarsh@.27" < "backend\db-service\database-migration\0001_create_prizent_db_from_live_mysql.sql"
```

## Start service

```powershell
cd backend\db-service
mvn spring-boot:run
```

## Next implementation steps

1. Add domain entities/repositories in `db-service` for identity/admin/product/pricing tables.
2. Add internal APIs (service-to-service only) for CRUD operations.
3. Update identity/admin/product/pricing services to call `db-service` instead of direct DB access.
4. Remove datasource/JPA persistence from those services after migration cutover.
