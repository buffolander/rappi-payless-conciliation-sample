#!/usr/bin/env bash

# sets env vars
FUNCTION_NAME="rappi-payless-conciliation"
SERVICE_ACCT_EMAIL=?
SERVICE_ACCT_KEYFILE_PATH=?
GCLOUD_PROJECT=?

# authenticate with service account keyfile
gcloud auth activate-service-account $SERVICE_ACCT_EMAIL \
  --key-file $SERVICE_ACCT_KEYFILE_PATH
  --project $GCLOUD_PROJECT

# creates pubSub topic for scheduler
gcloud pubsub topics create $FUNCTION_NAME

# creates job scheduler
gcloud scheduler jobs create pubsub $FUNCTION_NAME \
  --schedule "10 5-12 * * *" \
  --topic $FUNCTION_NAME \
  --message-body "run"

# deploys cloud function triggered by pubSub
gcloud functions deploy $FUNCTION_NAME \
  --source src/build-file \
  --trigger-resource $FUNCTION_NAME \
  --trigger-event providers/cloud.pubsub/eventTypes/topic.publish \
  --runtime nodejs12 \
  --memory 256MB \
  --timeout 60s
