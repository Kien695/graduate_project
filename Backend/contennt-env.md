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

# Neon native backup/restore (server-side only)

NEON_API_KEY=replace_with_project_scoped_api_key
NEON_PROJECT_ID=replace_with_neon_project_id
NEON_BRANCH_ID=replace_with_current_branch_id
NEON_BRANCH_NAME=main
NEON_API_TIMEOUT_MS=30000
NEON_OPERATION_TIMEOUT_MS=120000
NEON_MAX_APP_SNAPSHOTS=9

# Initial administrator

ADMIN_EMAIL=admin@autodealer.com
ADMIN_PASSWORD=Admin@123456
ADMIN_FULL_NAME=System Administrator

FRONTEND_URL=http://localhost:5173
