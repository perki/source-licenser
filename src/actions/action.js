/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/source-licenser/blob/master/LICENSE)
 */
module.exports = {
  init (id, defaultLicense) {
    this.id = id;
    this.defaultLicense = defaultLicense;
  },
  throwValidationError (...expectedKeys) {
    throw Error(`Action '${this.id}' expects propert${expectedKeys.length > 1 ? 'ies' : 'y'} '${expectedKeys.join('\', \'')}'`);
  },
  getLicense () {
    return this.license ?? this.defaultLicense;
  }
};
