#!/bin/bash

# BestVPNServer Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: production (default) | staging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-production}"
PROJECT_NAME="bestvpnserver"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Please install pnpm 8+"
        exit 1
    fi

    # Check Wrangler
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI is not installed. Install with: npm install -g wrangler"
        exit 1
    fi

    log_info "All prerequisites satisfied"
}

# Load environment variables
load_env() {
    log_info "Loading environment variables for $ENVIRONMENT..."

    if [ "$ENVIRONMENT" = "production" ]; then
        ENV_FILE=".env.production"
    else
        ENV_FILE=".env.staging"
    fi

    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
        log_info "Loaded environment from $ENV_FILE"
    else
        log_warn "No $ENV_FILE found, using existing environment"
    fi

    # Verify required variables
    required_vars=("CLOUDFLARE_ACCOUNT_ID" "DATABASE_URL" "REDIS_URL")
    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    cd "$SCRIPT_DIR/packages/database"

    # Push schema
    pnpm db:push

    # Check for migrations
    if [ -d "drizzle" ]; then
        log_info "Applying Drizzle migrations..."
        pnpm db:migrate
    fi

    cd "$SCRIPT_DIR"
    log_info "Database migrations completed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend for Cloudflare Workers..."

    cd "$SCRIPT_DIR/apps/web"

    # Install dependencies
    pnpm install

    # Build with OpenNext
    pnpm cf:build

    cd "$SCRIPT_DIR"
    log_info "Frontend build completed"
}

# Deploy to Cloudflare Workers
deploy_workers() {
    log_info "Deploying to Cloudflare Workers..."

    cd "$SCRIPT_DIR/apps/web"

    # Deploy using Wrangler
    pnpm cf:deploy

    cd "$SCRIPT_DIR"
    log_info "Workers deployment completed"
}

# Refresh caches
refresh_caches() {
    log_info "Refreshing application caches..."

    cd "$SCRIPT_DIR/apps/web"

    # Run cache refresh script
    pnpm cron:cache-refresh || log_warn "Cache refresh failed (non-critical)"

    cd "$SCRIPT_DIR"
}

# Run health checks
health_checks() {
    log_info "Running health checks..."

    # Check Workers deployment
    if command -v curl &> /dev/null; then
        if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then
            log_info "Checking $NEXT_PUBLIC_SITE_URL..."

            if curl -s -f "$NEXT_PUBLIC_SITE_URL/api/health" > /dev/null; then
                log_info "Health check passed"
            else
                log_warn "Health check endpoint not responding"
            fi
        fi
    fi

    # Check database connectivity
    log_info "Checking database connectivity..."
    cd "$SCRIPT_DIR/packages/database"
    if pnpm db:check 2>/dev/null; then
        log_info "Database connectivity OK"
    else
        log_warn "Database health check failed"
    fi
    cd "$SCRIPT_DIR"
}

# Rollback on failure
rollback() {
    log_error "Deployment failed. Initiating rollback..."

    # For Workers, we keep the previous version
    log_info "Previous version is still active on Workers"

    exit 1
}

# Main deployment flow
main() {
    log_info "Starting deployment for $ENVIRONMENT..."
    log_info "================================================"

    # Trap errors for rollback
    trap rollback ERR

    # Execute deployment steps
    check_prerequisites
    load_env
    run_migrations
    build_frontend
    deploy_workers
    refresh_caches
    health_checks

    log_info "================================================"
    log_info "Deployment completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Verify at: https://bestvpnserver.com"
    log_info "2. Check Workers logs: wrangler tail bestvpnserver-web"
    log_info "3. Monitor probe network status"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment]"
        echo ""
        echo "Arguments:"
        echo "  environment    production (default) | staging"
        echo ""
        echo "Examples:"
        echo "  $0              # Deploy to production"
        echo "  $0 staging      # Deploy to staging"
        exit 0
        ;;
    *)
        main
        ;;
esac
