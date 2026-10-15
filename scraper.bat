@echo off
cd /d D:\Scraper

set "SUPABASE_URL=https://cmpvcietbddkmhjcquok.supabase.co"
set "SUPABASE_SERVICE_ROLE_KEY=sb_publishable_7Pjba_8XVUg0wrm32RgjZA_jqwp2e_A"

node get-mpd.js

echo.
pause
