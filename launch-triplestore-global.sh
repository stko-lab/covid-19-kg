#!/bin/bash

cat build/air-travel/global.ttl build/cases/global.ttl > build/union.ttl

docker rm -f ncov-global

docker run -d --rm \
	-p 13030:3030 \
	--name ncov-global \
	-v $(pwd)/build:/usr/share/data atomgraph/fuseki --file=/usr/share/data/union.ttl /ds
