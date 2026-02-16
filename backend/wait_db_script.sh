#!/bin/sh

echo "Waiting for DB to be ready:"
until postgresql -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; do
	echo "Database not ready yet"
	sleep 2
done
echo "DB is up!"
