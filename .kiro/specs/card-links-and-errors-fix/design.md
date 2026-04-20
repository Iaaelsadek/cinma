# Card Links and Errors Fix - Bugfix Design

## Overview

This bugfix addresses three critical issues affecting the cinema platform:

1. **Card Links Bug (CRITICAL)**: Movie and TV cards incorrectly navigate to detail pages instead of watch pages, forcing users to take an extra step to start watching content.

2. **TMDB 404 Errors**: The system repeatedly attempts to fetch invalid TV series IDs that don't exist in TMDB's database, causing performance degradation and log pollution.

3. **Database Query Errors**