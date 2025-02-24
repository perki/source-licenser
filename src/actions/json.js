/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/source-licenser/blob/master/LICENSE)
 */
const fs = require('fs/promises');
const _ = require('lodash');
const sortPackageJson = require('sort-package-json');

const action = require('./action');

module.exports = Object.assign(Object.create(action), {
  init (actionSettings, defaultLicense) {
    action.init.call(this, 'json', defaultLicense);
    this.settings = actionSettings;
  },

  /**
   * Checks the JSON file’s properties and updates it if needed.
   * @param {string} filePath
   * @returns {boolean} `true` if the file was modified
   */
  async apply (filePath) {
    let jsonData = JSON.parse(await fs.readFile(filePath));
    const originalContent = JSON.stringify(jsonData, null, 2);
    if (this.settings.force) {
      jsonData = _.merge(jsonData, this.settings.force);
    }
    if (this.settings.defaults) {
      jsonData = _.mergeWith(jsonData, this.settings.defaults, function (existingVal, defaultVal) {
        return (typeof existingVal === 'undefined') ? defaultVal : existingVal;
      });
    }
    if (this.settings.sortPackage) {
      jsonData = sortPackageJson(jsonData);
    }
    const newContent = JSON.stringify(jsonData, null, 2);
    if (originalContent === newContent) {
      // up-to-date: skip
      return false;
    }
    await fs.writeFile(filePath, newContent);
    return true;
  }
});
