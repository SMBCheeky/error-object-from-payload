#!/bin/bash

set -e;
cd ..
npm link # create a global symlink to the local project
cd playground
npm link @smbcheeky/error-object-from # create a symlink to the local project
