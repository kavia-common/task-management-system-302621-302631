#!/bin/bash
cd /home/kavia/workspace/code-generation/task-management-system-302621-302631/backend_node_express
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

