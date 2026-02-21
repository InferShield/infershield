#!/bin/bash
#
# InferShield Backup Script
# Backs up PostgreSQL, Redis, and Loki to S3
#
# Usage: ./backup.sh [--test]
#

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_DIR="/tmp/backups/${BACKUP_DATE}"
S3_BUCKET="${S3_BACKUP_BUCKET:-infershield-backups}"
S3_PREFIX="${S3_BACKUP_PREFIX:-prod}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Database configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgres.infershield.svc.cluster.local}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-infershield}"
POSTGRES_USER="${POSTGRES_USER:-infershield}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

REDIS_HOST="${REDIS_HOST:-redis.infershield.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"

LOKI_HOST="${LOKI_HOST:-loki.monitoring.svc.cluster.local}"
LOKI_PORT="${LOKI_PORT:-3100}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_dependencies() {
  log_info "Checking dependencies..."
  
  local missing=()
  
  command -v pg_dump >/dev/null 2>&1 || missing+=("postgresql-client")
  command -v redis-cli >/dev/null 2>&1 || missing+=("redis-tools")
  command -v aws >/dev/null 2>&1 || missing+=("awscli")
  command -v curl >/dev/null 2>&1 || missing+=("curl")
  
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing dependencies: ${missing[*]}"
    exit 1
  fi
  
  log_info "All dependencies found"
}

# Create backup directory
setup_backup_dir() {
  log_info "Creating backup directory: ${BACKUP_DIR}"
  mkdir -p "${BACKUP_DIR}"
}

# Backup PostgreSQL
backup_postgres() {
  log_info "Backing up PostgreSQL database..."
  
  local backup_file="${BACKUP_DIR}/postgres-${BACKUP_DATE}.sql.gz"
  
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip > "${backup_file}"
  
  local size=$(du -h "${backup_file}" | cut -f1)
  log_info "PostgreSQL backup complete: ${backup_file} (${size})"
}

# Backup Redis
backup_redis() {
  log_info "Backing up Redis..."
  
  local backup_file="${BACKUP_DIR}/redis-${BACKUP_DATE}.rdb"
  
  # Trigger BGSAVE
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE
  
  # Wait for BGSAVE to complete
  sleep 2
  while [ "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)" == "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)" ]; do
    sleep 1
  done
  
  # Copy RDB file
  kubectl cp "infershield/redis-0:/data/dump.rdb" "${backup_file}" 2>/dev/null || {
    log_warn "Could not copy Redis RDB file directly, using redis-cli DUMP"
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" --rdb "${backup_file}"
  }
  
  local size=$(du -h "${backup_file}" | cut -f1)
  log_info "Redis backup complete: ${backup_file} (${size})"
}

# Backup Loki logs (export recent logs)
backup_loki() {
  log_info "Backing up Loki logs (last 7 days)..."
  
  local backup_file="${BACKUP_DIR}/loki-${BACKUP_DATE}.json.gz"
  local start_time=$(date -u -d '7 days ago' +%s)000000000
  local end_time=$(date -u +%s)000000000
  
  curl -s -G "${LOKI_HOST}:${LOKI_PORT}/loki/api/v1/query_range" \
    --data-urlencode "query={namespace=\"infershield\"}" \
    --data-urlencode "start=${start_time}" \
    --data-urlencode "end=${end_time}" \
    --data-urlencode "limit=10000" \
    | gzip > "${backup_file}"
  
  local size=$(du -h "${backup_file}" | cut -f1)
  log_info "Loki backup complete: ${backup_file} (${size})"
}

# Create backup manifest
create_manifest() {
  log_info "Creating backup manifest..."
  
  local manifest_file="${BACKUP_DIR}/manifest.json"
  
  cat > "${manifest_file}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "0.4.0",
  "components": {
    "postgresql": {
      "file": "postgres-${BACKUP_DATE}.sql.gz",
      "size": $(stat -f%z "${BACKUP_DIR}/postgres-${BACKUP_DATE}.sql.gz" 2>/dev/null || stat -c%s "${BACKUP_DIR}/postgres-${BACKUP_DATE}.sql.gz")
    },
    "redis": {
      "file": "redis-${BACKUP_DATE}.rdb",
      "size": $(stat -f%z "${BACKUP_DIR}/redis-${BACKUP_DATE}.rdb" 2>/dev/null || stat -c%s "${BACKUP_DIR}/redis-${BACKUP_DATE}.rdb")
    },
    "loki": {
      "file": "loki-${BACKUP_DATE}.json.gz",
      "size": $(stat -f%z "${BACKUP_DIR}/loki-${BACKUP_DATE}.json.gz" 2>/dev/null || stat -c%s "${BACKUP_DIR}/loki-${BACKUP_DATE}.json.gz")
    }
  }
}
EOF
  
  log_info "Manifest created: ${manifest_file}"
}

# Upload to S3
upload_to_s3() {
  log_info "Uploading backups to S3..."
  
  local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_DATE}/"
  
  aws s3 sync "${BACKUP_DIR}/" "${s3_path}" --quiet
  
  log_info "Uploaded to: ${s3_path}"
}

# Clean up old backups
cleanup_old_backups() {
  log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
  
  local cutoff_date=$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -u -v-${RETENTION_DAYS}d +%Y-%m-%d)
  
  aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | while read -r line; do
    local backup_date=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
    if [[ "${backup_date}" < "${cutoff_date}" ]]; then
      log_info "Deleting old backup: ${backup_date}"
      aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_date}/" --recursive --quiet
    fi
  done
  
  log_info "Cleanup complete"
}

# Clean up local files
cleanup_local() {
  log_info "Cleaning up local backup files..."
  rm -rf "${BACKUP_DIR}"
  log_info "Local cleanup complete"
}

# Test mode (dry run)
test_mode() {
  log_info "Running in TEST mode (no S3 upload)"
  
  check_dependencies
  setup_backup_dir
  backup_postgres
  backup_redis
  backup_loki
  create_manifest
  
  log_info "Test backup created in: ${BACKUP_DIR}"
  log_info "Backup contents:"
  ls -lh "${BACKUP_DIR}"
  
  log_warn "Skipping S3 upload (test mode)"
}

# Main backup flow
main() {
  log_info "Starting InferShield backup (${BACKUP_DATE})"
  
  check_dependencies
  setup_backup_dir
  
  backup_postgres
  backup_redis
  backup_loki
  create_manifest
  
  upload_to_s3
  cleanup_old_backups
  cleanup_local
  
  log_info "Backup complete!"
}

# Handle arguments
if [[ "${1:-}" == "--test" ]]; then
  test_mode
else
  main
fi
