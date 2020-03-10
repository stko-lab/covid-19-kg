#!/bin/bash
 docker run -d --rm \
 	-p 13030:3030 \
 	-v $(pwd)/build:/usr/share/data atomgraph/fuseki --file=/usr/share/data/air-travel/global.ttl /ds
