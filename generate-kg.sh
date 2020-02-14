#!/bin/bash
OUTPUT_DIR=output/

for input in data/**/*/01-*2020_*.csv; do
	file=$(basename $input .csv)
	node src/main/case.js --eastern-tz < $input > "$OUTPUT_DIR/$file.ttl"
done

for i_month in {2..12}; do
	s_month=`printf %02d $i_month`
	for input in data/**/*/$s_month-*2020_*.csv; do
		file=$(basename $input .csv)
		node src/main/case.js < $input > "$OUTPUT_DIR/$file.ttl"
	done
done
