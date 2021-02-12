/**
 * @license
 * Copyright (c) 2020-2021 Pryv S.A https://pryv.com
 * 
 * This file is part of Open-Pryv.io and released under BSD-Clause-3 License
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, 
 *    this list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 * 
 * 3. Neither the name of the copyright holder nor the names of its contributors 
 *    may be used to endorse or promote products derived from this software 
 *    without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * SPDX-License-Identifier: BSD-3-Clause
 * */
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./load-config');
const { getConfig } = require('@pryv/boiler');

const applyTemplate = require('./templating');


let config, ignores, fileSpecs, specKeys, license;

const logger = require('@pryv/boiler').getLogger();

async function start() {
  await applyTemplate();

  config = await getConfig();

  ignores = config.get('ignores');
  fileSpecs = config.get('fileSpecs');
  specKeys = Object.keys(fileSpecs);
  license = config.get('license:content');

  await loadAction(require('./actions/addHeader'));
  await loadAction(require('./actions/json'));
  await loadAction(require('./actions/addSibling'));
  await loadAction(require('./actions/addTrailer'));
  checkInit();
  await loop(config.get('src'));
}


// ----------------- helpers


// -- load actions
async function loadAction(action) {
  // -- prepare actions
  for (const specKey of specKeys) { // for each type of file "*.js", "README.md", ....
    fileSpec = fileSpecs[specKey];
    for (const actionKey of Object.keys(fileSpec)) { // for each found action "addTrailer", "json", ....
      if (actionKey === action.key) {
        logger.info('Loading: ' + action.key + ' for ' + specKey);
        if (typeof fileSpec[actionKey] === 'boolean' && fileSpec[actionKey]) {
          fileSpec[actionKey] = {};
        }
        await action.prepare(fileSpec[actionKey], license);
      }
    }
  };
}

// throw an error if some handlers have not been initalizes
function checkInit() {
  for (const specKey of specKeys) {
    for (const actionKey of Object.keys(fileSpecs[specKey])) {
      const actionItem = fileSpecs[specKey][actionKey];
      if (!actionItem.actionMethod) {
        logger.error('Handler "' + actionItem.action + '" for "' + specKey + ':' + actionKey + '" has not been initialized');
        process.exit(0);
      }
    }
  };
}



/**
 * Helper to find the corresponding specs for a file
 * @param {String} fullPath 
 */
function getFileSpec(fullPath) {
  for (const specKey of specKeys) {
    if (fullPath.endsWith(specKey)) {
      return fileSpecs[specKey];
    }
  }
}

/**
 * Return true is this file or directory should be ignored
 * @param {String} fullPath
 */
function ignore(fullPath) {
  for (const i of ignores) {
    if (fullPath.indexOf(i) >= 0) return true;
  }
  return false;
}

/**
 * Called for each matched file
 * @param {String} fullPath a file Path
 * @param {Object} spec the Specifications from fileSpecs matching this file
 */
async function handleMatchingFile(fullPath, spec) {
  for (const actionItemKey of Object.keys(spec)) {
    const actionItem = spec[actionItemKey];
    actionItem.actionMethod(fullPath);
  }
  count++;
}

/**
 * Software entrypoint
 * Loop recursively in the directory
 * - ignore files or dir matching one of the ignore items
 * - call handleMatchingFile each time a file matching a fileSpec is found
 * @param {String} dir 
 */
async function loop(dir) {
  //console.log('>' + dir);
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const fullPath = path.resolve(dir, file);
    if (ignore(fullPath)) continue;
    const stat = await fs.promises.stat(fullPath);
    if (stat.isDirectory()) {
      await loop(fullPath); // recurse
    } else if (stat.isFile()) {
      const spec = getFileSpec(fullPath);
      if (spec) await handleMatchingFile(fullPath, spec);
    } else {
      logger.info(stat);
      throw new Error();
    }
  }
}



// --- run

let count = 0;
(async () => {
  const startTime = Date.now();
  await start();
  logger.info('Added license to ' + count + ' files in ' + Math.round((Date.now() - startTime) / 10) / 100 + ' s');
})();

