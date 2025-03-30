#!/bin/bash

# Sudoku App Starter Script
# Ensures app always starts on the same port and provides a way to kill previous instances

PORT=19000
METRO_PORT=19001

# Functions
check_port() {
  if lsof -i:$1 > /dev/null 2>&1; then
    return 0  # Port is in use
  else
    return 1  # Port is free
  fi
}

kill_processes() {
  echo "🔄 Killing processes on ports $PORT and $METRO_PORT..."
  
  # Find and kill processes on the Expo port
  if check_port $PORT; then
    pid=$(lsof -t -i:$PORT)
    if [ ! -z "$pid" ]; then
      echo "🛑 Killing process $pid on port $PORT"
      kill -9 $pid
    fi
  fi
  
  # Find and kill processes on the Metro bundler port
  if check_port $METRO_PORT; then
    pid=$(lsof -t -i:$METRO_PORT)
    if [ ! -z "$pid" ]; then
      echo "🛑 Killing process $pid on port $METRO_PORT"
      kill -9 $pid
    fi
  fi
  
  # Additional cleanup for any other Expo/Metro processes
  pkill -f "expo start" > /dev/null 2>&1
  pkill -f "expo-cli start" > /dev/null 2>&1
}

# Check command line arguments
if [ "$1" == "kill" ]; then
  kill_processes
  echo "✅ Previous Expo processes have been terminated."
  exit 0
fi

# Check if ports are already in use
if check_port $PORT || check_port $METRO_PORT; then
  echo "❗ Ports $PORT or $METRO_PORT are already in use."
  echo "⚠️ This might be a previous Expo session."
  echo ""
  echo "Options:"
  echo "1) Kill previous processes and start a new session"
  echo "2) Exit"
  read -p "Select option (1/2): " option
  
  case $option in
    1)
      kill_processes
      ;;
    *)
      echo "Exiting. You can manually kill previous processes with: ./start-app.sh kill"
      exit 1
      ;;
  esac
fi

# Start the Expo app with fixed port
echo "🚀 Starting Sudoku app on port $PORT..."
echo "📱 Use --tunnel option for testing on physical devices"

# Check for --tunnel option
if [ "$1" == "--tunnel" ]; then
  npx expo start --port $PORT --tunnel
else
  npx expo start --port $PORT
fi