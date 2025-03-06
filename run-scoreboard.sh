#!/bin/bash

# Log start time
echo "Starting scoreboard generation at $(date)" >> /scoreboard/cron.log

# Go to the project directory
cd /scoreboard

# Run the script with the full path to node
/usr/bin/node src/scoreboard.js >> /scoreboard/cron.log 2>&1

# Log completion
echo "Finished scoreboard generation at $(date)" >> /scoreboard/cron.log
echo "----------------------------------" >> /scoreboard/cron.log