#!/bin/bash
OUTPUT_DIR=output/csse_covid_19_data/

for input in data/COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/*.csv; do
	file=$(basename $input .csv)
	node src/main/case.js --new-daily < $input > "$OUTPUT_DIR/$file.ttl"
done