#!/bin/bash
node --inspect-brk src/cases/triplify.js ./submodules/COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/ > build/cases/global.ttl
