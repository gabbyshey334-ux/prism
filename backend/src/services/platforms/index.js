/**
 * Platform Services Index
 * Exports all platform services
 */
const instagram = require('./instagram');
const facebook = require('./facebook');
const tiktok = require('./tiktok');
const linkedin = require('./linkedin');
const youtube = require('./youtube');
const threads = require('./threads');
const twitter = require('./twitter');

const platforms = {
  instagram,
  facebook,
  tiktok,
  linkedin,
  youtube,
  threads,
  twitter
};

/**
 * Get platform service
 * @param {string} platform - Platform name
 * @returns {Object} Platform service instance
 */
function getPlatformService(platform) {
  const service = platforms[platform.toLowerCase()];
  if (!service) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return service;
}

module.exports = {
  ...platforms,
  getPlatformService,
  platforms: Object.keys(platforms)
};


