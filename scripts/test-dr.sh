#!/bin/bash
#
# InferShield Disaster Recovery Test
# Validates backup/restore procedures work correctly
#
# Usage: ./test-dr.sh
#

set -euo pipefail

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

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_fail() {
  echo -e "${RED}[✗]${NC} $1"
}

# Test backup script
test_backup() {
  log_info "Testing backup script..."
  
  if [ ! -f "scripts/backup.sh" ]; then
    log_fail "Backup script not found"
    return 1
  fi
  
  # Run test backup
  bash scripts/backup.sh --test
  
  if [ $? -eq 0 ]; then
    log_success "Backup script test passed"
    return 0
  else
    log_fail "Backup script test failed"
    return 1
  fi
}

# Test S3 access
test_s3_access() {
  log_info "Testing S3 access..."
  
  local test_file="/tmp/infershield-test-$(date +%s).txt"
  echo "test" > "${test_file}"
  
  aws s3 cp "${test_file}" "s3://${S3_BACKUP_BUCKET}/test/" --quiet
  
  if [ $? -eq 0 ]; then
    aws s3 rm "s3://${S3_BACKUP_BUCKET}/test/" --recursive --quiet
    rm "${test_file}"
    log_success "S3 access test passed"
    return 0
  else
    log_fail "S3 access test failed"
    return 1
  fi
}

# Test database connectivity
test_database() {
  log_info "Testing PostgreSQL connectivity..."
  
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -c "SELECT 1;" >/dev/null
  
  if [ $? -eq 0 ]; then
    log_success "PostgreSQL connectivity test passed"
    return 0
  else
    log_fail "PostgreSQL connectivity test failed"
    return 1
  fi
}

# Test Redis connectivity
test_redis() {
  log_info "Testing Redis connectivity..."
  
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" PING >/dev/null
  
  if [ $? -eq 0 ]; then
    log_success "Redis connectivity test passed"
    return 0
  else
    log_fail "Redis connectivity test failed"
    return 1
  fi
}

# Test restore script
test_restore() {
  log_info "Testing restore script..."
  
  if [ ! -f "scripts/restore.sh" ]; then
    log_fail "Restore script not found"
    return 1
  fi
  
  log_success "Restore script found"
  log_warn "Manual restore test required (destructive operation)"
  return 0
}

# Main test flow
main() {
  log_info "Starting Disaster Recovery test..."
  echo
  
  local failed=0
  
  test_backup || failed=$((failed + 1))
  echo
  
  test_s3_access || failed=$((failed + 1))
  echo
  
  test_database || failed=$((failed + 1))
  echo
  
  test_redis || failed=$((failed + 1))
  echo
  
  test_restore || failed=$((failed + 1))
  echo
  
  if [ ${failed} -eq 0 ]; then
    log_success "All DR tests passed!"
    exit 0
  else
    log_error "${failed} test(s) failed"
    exit 1
  fi
}

main
