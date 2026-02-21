#!/bin/bash
#
# InferShield Restore Script
# Restores PostgreSQL, Redis, and Loki from S3 backup
#
# Usage: ./restore.sh <backup-date> [--postgres-only|--redis-only|--loki-only]
#

set -euo pipefail

# Configuration
BACKUP_DATE="${1:-}"
RESTORE_DIR="/tmp/restore-${BACKUP_DATE}"
S3_BUCKET="${S3_BACKUP_BUCKET:-infershield-backups}"
S3_PREFIX="${S3_BACKUP_PREFIX:-prod}"

# Database configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgres.infershield.svc.cluster.local}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-infershield}"
POSTGRES_USER="${POSTGRES_USER:-infershield}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

REDIS_HOST="${REDIS_HOST:-redis.infershield.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Validate arguments
if [ -z "${BACKUP_DATE}" ]; then
  log_error "Usage: $0 <backup-date> [--postgres-only|--redis-only|--loki-only]"
  log_error "Example: $0 2024-02-21-140000"
  exit 1
fi

# Parse component flags
RESTORE_POSTGRES=true
RESTORE_REDIS=true
RESTORE_LOKI=true

if [[ "${2:-}" == "--postgres-only" ]]; then
  RESTORE_REDIS=false
  RESTORE_LOKI=false
elif [[ "${2:-}" == "--redis-only" ]]; then
  RESTORE_POSTGRES=false
  RESTORE_LOKI=false
elif [[ "${2:-}" == "--loki-only" ]]; then
  RESTORE_POSTGRES=false
  RESTORE_REDIS=false
fi

# Download backup from S3
download_backup() {
  log_info "Downloading backup from S3..."
  
  local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_DATE}/"
  
  mkdir -p "${RESTORE_DIR}"
  aws s3 sync "${s3_path}" "${RESTORE_DIR}/" --quiet
  
  if [ ! -f "${RESTORE_DIR}/manifest.json" ]; then
    log_error "Backup not found or invalid: ${s3_path}"
    exit 1
  fi
  
  log_info "Backup downloaded to: ${RESTORE_DIR}"
  log_info "Manifest:"
  cat "${RESTORE_DIR}/manifest.json"
}

# Restore PostgreSQL
restore_postgres() {
  log_info "Restoring PostgreSQL database..."
  
  local backup_file="${RESTORE_DIR}/postgres-${BACKUP_DATE}.sql.gz"
  
  if [ ! -f "${backup_file}" ]; then
    log_error "PostgreSQL backup file not found: ${backup_file}"
    return 1
  fi
  
  # Confirm restore
  log_warn "This will DROP and recreate the database: ${POSTGRES_DB}"
  read -p "Are you sure? (yes/no): " confirm
  if [ "${confirm}" != "yes" ]; then
    log_info "PostgreSQL restore cancelled"
    return 0
  fi
  
  # Drop existing database
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
  
  # Create fresh database
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "CREATE DATABASE ${POSTGRES_DB};"
  
  # Restore from backup
  gunzip -c "${backup_file}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --quiet
  
  log_info "PostgreSQL restore complete"
}

# Restore Redis
restore_redis() {
  log_info "Restoring Redis..."
  
  local backup_file="${RESTORE_DIR}/redis-${BACKUP_DATE}.rdb"
  
  if [ ! -f "${backup_file}" ]; then
    log_error "Redis backup file not found: ${backup_file}"
    return 1
  fi
  
  # Confirm restore
  log_warn "This will overwrite all Redis data"
  read -p "Are you sure? (yes/no): " confirm
  if [ "${confirm}" != "yes" ]; then
    log_info "Redis restore cancelled"
    return 0
  fi
  
  # Flush existing data
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" FLUSHALL
  
  # Copy RDB file to Redis pod
  kubectl cp "${backup_file}" "infershield/redis-0:/data/dump.rdb"
  
  # Restart Redis to load RDB
  kubectl rollout restart statefulset/redis -n infershield
  kubectl rollout status statefulset/redis -n infershield --timeout=120s
  
  log_info "Redis restore complete"
}

# Restore Loki
restore_loki() {
  log_info "Restoring Loki logs..."
  
  local backup_file="${RESTORE_DIR}/loki-${BACKUP_DATE}.json.gz"
  
  if [ ! -f "${backup_file}" ]; then
    log_warn "Loki backup file not found: ${backup_file}"
    return 0
  fi
  
  log_warn "Loki log restore not implemented (logs are ephemeral)"
  log_info "Loki backup contains last 7 days of logs for reference"
  log_info "You can extract logs from: ${backup_file}"
}

# Cleanup
cleanup() {
  log_info "Cleaning up restore files..."
  rm -rf "${RESTORE_DIR}"
  log_info "Cleanup complete"
}

# Main restore flow
main() {
  log_info "Starting InferShield restore (${BACKUP_DATE})"
  
  download_backup
  
  if [ "${RESTORE_POSTGRES}" == "true" ]; then
    restore_postgres
  fi
  
  if [ "${RESTORE_REDIS}" == "true" ]; then
    restore_redis
  fi
  
  if [ "${RESTORE_LOKI}" == "true" ]; then
    restore_loki
  fi
  
  cleanup
  
  log_info "Restore complete!"
}

main
