const { DateTime } = require('luxon');
const config = require('../config');

function isWithinCallingHours(timezone = config.calling.timezoneDefault) {
  const now = DateTime.now().setZone(timezone);
  if (!now.isValid) return false;
  const hour = now.hour;
  return hour >= config.calling.hourStart && hour < config.calling.hourEnd;
}

function nextCallingWindow(timezone = config.calling.timezoneDefault) {
  const now = DateTime.now().setZone(timezone);
  let next = now.set({ hour: config.calling.hourStart, minute: 0, second: 0, millisecond: 0 });
  if (now >= next.set({ hour: config.calling.hourEnd })) next = next.plus({ days: 1 });
  if (now > next) next = next.plus({ days: 1 });
  return next.toISO();
}

module.exports = { isWithinCallingHours, nextCallingWindow };
