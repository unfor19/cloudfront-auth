#!/usr/bin/env bash
set -e
source ci/logging.sh
set -o pipefail

_AUTH_DISTRIBUTIONS_DIR_PATH="${AUTH_DISTRIBUTION_DIR_PATH:-"distributions"}"
_CURRENT_DIST_DIR_PATH="${_AUTH_DISTRIBUTIONS_DIR_PATH}/${AUTH_CLOUDFRONT_DIST_ID}"

log_msg "Generating private and public keys with ssh-keygen and openssl"
mkdir -p "$_CURRENT_DIST_DIR_PATH"
_AUTH_IDRSA_PATH="${AUTH_IDRSA_PATH:-"${_CURRENT_DIST_DIR_PATH}/id_rsa"}"
_AUTH_IDRSAPUB_PATH="${AUTH_IDRSAPUB_PATH:-"${_CURRENT_DIST_DIR_PATH}/id_rsa.pub"}"

if [[ ! -f "$_AUTH_IDRSA_PATH" ]]; then
    log_msg "Generating the pem key: ${_AUTH_IDRSA_PATH}"
    ssh-keygen -t rsa -m PEM -b 4096 -f "$_AUTH_IDRSA_PATH" -N '' 1>/dev/null
    [[ -f "$_AUTH_IDRSA_PATH" ]] && rm "$_AUTH_IDRSAPUB_PATH"
    log_msg "Generating the pub key: ${_AUTH_IDRSAPUB_PATH}"
    openssl rsa -in "${_CURRENT_DIST_DIR_PATH}/id_rsa" -pubout -outform PEM -out "$_AUTH_IDRSAPUB_PATH" 1>/dev/null
fi

export CURRENT_DIST_DIR_PATH="$_CURRENT_DIST_DIR_PATH"
log_msg "Building package ..."
node build-ci/build.js
log_msg "Completed Building package"

log_msg "Contents of ${_CURRENT_DIST_DIR_PATH}"
ls -lh "$_CURRENT_DIST_DIR_PATH"

_CURRENT_DIST_ZIP_PATH="${_CURRENT_DIST_DIR_PATH}/${AUTH_CLOUDFRONT_DIST_ID}.zip"
log_msg "Contents of ${_CURRENT_DIST_ZIP_PATH}"
ls -lh "$_CURRENT_DIST_ZIP_PATH"

_AUTH_ARTIFACTS_DIR_PATH="${AUTH_ARTIFACTS_DIR_PATH:-"out"}"
log_msg "Setting up the directory \"${_AUTH_ARTIFACTS_DIR_PATH}\" ..."
mkdir -p "$_AUTH_ARTIFACTS_DIR_PATH"

_ARTIFACT_PATH="${_AUTH_ARTIFACTS_DIR_PATH}/${AUTH_CLOUDFRONT_DIST_ID}.zip"
log_msg "Moving ${_CURRENT_DIST_ZIP_PATH} to ${_ARTIFACT_PATH} ..."
mv "$_CURRENT_DIST_ZIP_PATH" "$_ARTIFACT_PATH"
unzip -Zt "$_ARTIFACT_PATH"
log_msg "Finished build process, ready to deploy "
