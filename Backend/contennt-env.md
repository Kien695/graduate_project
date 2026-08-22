PORT=5000
NODE_ENV=development

# jwt

SECRET_KEY_ACCESS_TOKEN=change_me_to_a_long_random_secret
SECRET_KEY_REFRESH_TOKEN=change_me_to_another_long_random_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

MAX_FAILED_LOGIN_ATTEMPTS=5
PROFILE_ENCRYPTION_KEY=change_me_to_a_long_random_secret

# cloudinary

CLOUD_NAME=dzyi6hnfr
CLOUD_KEY=717799557543787
CLOUD_SECRET=t8fWhid9WASeElGdFxoUaHkhI04

# database

DB_USER=postgres
DB_HOST=localhost
DB_NAME=graduate_project
DB_PASSWORD=060905
DB_PORT=5432

# PostgreSQL backup tools

PG_DUMP_PATH=pg_dump
PG_RESTORE_PATH=pg_restore

# Initial administrator

ADMIN_EMAIL=admin@autodealer.com
ADMIN_PASSWORD=Admin@123456
ADMIN_FULL_NAME=System Administrator

FRONTEND_URL=http://localhost:5173
