#!/bin/sh
set -e

# Create required Laravel directories
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rw storage bootstrap/cache

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link || true

php artisan migrate --force
php artisan db:seed --force

exec "$@"