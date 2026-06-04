const axios = require('axios');
const config = require('../config');

const client = axios.create({
  baseURL: config.ghl.apiBase,
  headers: {
    Authorization: `Bearer ${config.ghl.apiToken}`,
    Version: config.ghl.apiVersion,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

async function getContact(contactId) {
  const { data } = await client.get(`/contacts/${contactId}`);
  return data.contact;
}

async function addNote(contactId, body) {
  const { data } = await client.post(`/contacts/${contactId}/notes`, { body });
  return data;
}

async function addTags(contactId, tags) {
  const { data } = await client.post(`/contacts/${contactId}/tags`, { tags });
  return data;
}

async function removeTags(contactId, tags) {
  const { data } = await client.delete(`/contacts/${contactId}/tags`, {
    data: { tags },
  });
  return data;
}

async function updateContact(contactId, payload) {
  const { data } = await client.put(`/contacts/${contactId}`, payload);
  return data;
}

async function createTask(contactId, { title, body, dueDate }) {
  const { data } = await client.post(`/contacts/${contactId}/tasks`, {
    title,
    body,
    dueDate,
    completed: false,
  });
  return data;
}

module.exports = {
  getContact,
  addNote,
  addTags,
  removeTags,
  updateContact,
  createTask,
};
